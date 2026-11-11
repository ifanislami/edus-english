const INGEST_URL = required("SUPABASE_INGEST_URL");
const CRAWLER_KEY = required("CRAWLER_KEY");
const QWEN_API_KEY = required("QWEN_API_KEY");

const sources = {
  "republika-l1": {
    name: "Republika",
    level: "1",
    feed: "https://www.republika.co.id/rss/",
  },
  "sciencealert-l2": {
    name: "ScienceAlert",
    level: "2",
    feed: "https://www.sciencealert.com/?format=feed&id=1%3Athe-latest&option=com_obrss&task=feed",
  },
  "republika-l2": {
    name: "Republika",
    level: "2",
    feed: "https://www.republika.co.id/rss/",
  },
  "sciencealert-l1": {
    name: "ScienceAlert",
    level: "1",
    feed: "https://www.sciencealert.com/?format=feed&id=1%3Athe-latest&option=com_obrss&task=feed",
  },
  "dw-l2": {
    name: "DW Indonesia",
    level: "2",
    feed: "https://rss.dw.com/xml/rss-id-all",
  },
};

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function clean(value = "") {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml, name) {
  return clean(
    xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "",
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 60_000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

async function callIngest(body) {
  const response = await fetchWithTimeout(
    INGEST_URL,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crawler-key": CRAWLER_KEY,
      },
      body: JSON.stringify(body),
    },
    60_000,
  );
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { error: text || `HTTP ${response.status}` };
  }
  if (!response.ok) {
    throw new Error(`Supabase ingest failed (${response.status}): ${payload.detail || payload.error}`);
  }
  return payload;
}

async function getFeedItem(source, usedUrls) {
  console.log(`Fetching RSS from ${source.name}`);
  const response = await fetchWithTimeout(
    source.feed,
    {
      headers: {
        "user-agent": "TumbuhAcademyBot/2.0 (+https://tumbuhacademy.vercel.app)",
      },
    },
    45_000,
  );
  if (!response.ok) throw new Error(`${source.name} feed failed: ${response.status}`);

  const xml = await response.text();
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)]
    .map((match) => {
      const item = match[0];
      return {
        title: tag(item, "title"),
        url: tag(item, "link"),
        summary: tag(item, "description"),
      };
    })
    .filter((item) => item.title && item.url && item.summary && !usedUrls.has(item.url));

  if (!items.length) throw new Error(`No new ${source.name} RSS item found`);
  return items[0];
}

function validateDraft(article) {
  if (
    !article?.title ||
    !article.body_eng ||
    !article.body_idn ||
    !Array.isArray(article.vocabulary) ||
    article.vocabulary.length < 5 ||
    !Array.isArray(article.quiz) ||
    !article.quiz.length ||
    article.quiz.some((entry) =>
      !entry.question ||
      !Array.isArray(entry.options) ||
      entry.options.length !== 4 ||
      !entry.options.includes(entry.answer) ||
      !entry.explanation
    )
  ) {
    throw new Error("Qwen response has an invalid article shape");
  }
  return article;
}

async function generateLearningArticle(source, item) {
  const quizCount = source.level === "1" ? "2 or 3" : "4";
  const wordRange = source.level === "1" ? "120-180" : "180-260";
  const prompt = `Create an original English-learning news adaptation based ONLY on this RSS headline and summary. Do not copy source wording beyond a short title. Return strict JSON with keys: title, topics, body_eng, body_idn, vocabulary, quiz. topics must be one short comma-separated string, never an array. body_eng must be an original, accurate news summary in English at CEFR Level ${source.level} (${wordRange} words). body_idn must be a natural Indonesian translation using active, natural Indonesian where possible. vocabulary is an array of 5 objects with word and translation. quiz is an array of exactly ${quizCount} objects with question, options (exactly 4 English strings), answer (one option exactly), explanation (short Indonesian). Every fact must be supported by the RSS item.\n\nSource: ${source.name}\nHeadline: ${item.title}\nRSS summary: ${item.summary}`;

  console.log(`Generating Level ${source.level} article with Qwen`);
  const response = await fetchWithTimeout(
    process.env.QWEN_BASE_URL ||
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${QWEN_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL || "qwen3.8-max",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a careful ESL news editor. Never invent facts." },
          { role: "user", content: prompt },
        ],
      }),
    },
    10 * 60_000,
  );
  if (!response.ok) {
    throw new Error(`Qwen generation failed: ${response.status} ${await response.text()}`);
  }
  const content = (await response.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("Qwen returned empty content");
  return validateDraft(JSON.parse(content));
}

const crawl = process.argv[2];
const source = sources[crawl];
if (!source) {
  throw new Error(`Invalid crawl. Choose one of: ${Object.keys(sources).join(", ")}`);
}

console.log(`Starting ${crawl}`);
const preparation = await callIngest({ operation: "prepare", crawl });
if (preparation.skipped) {
  console.log(JSON.stringify(preparation));
  process.exit(0);
}

const item = await getFeedItem(source, new Set(preparation.usedUrls || []));
const draft = await generateLearningArticle(source, item);
const result = await callIngest({ operation: "ingest", crawl, item, draft });
console.log(JSON.stringify(result));
