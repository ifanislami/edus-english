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
    feed: "https://www.sciencealert.com/feed/",
  },
  "republika-l2": {
    name: "Republika",
    level: "2",
    feed: "https://www.republika.co.id/rss/",
  },
  "sciencealert-l1": {
    name: "ScienceAlert",
    level: "1",
    feed: "https://www.sciencealert.com/feed/",
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

function attribute(markup, name) {
  return clean(
    markup.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? "",
  );
}

function httpsUrl(value, base) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function rssImage(itemXml, pageUrl) {
  const mediaTags = itemXml.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/gi) || [];
  for (const mediaTag of mediaTags) {
    const type = attribute(mediaTag, "type");
    if (mediaTag.toLowerCase().startsWith("<enclosure") && type && !type.startsWith("image/")) {
      continue;
    }
    const candidate = httpsUrl(attribute(mediaTag, "url"), pageUrl);
    if (candidate) return candidate;
  }
  return null;
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
        imageUrl: rssImage(item, tag(item, "link")),
      };
    })
    .filter((item) => item.title && item.url && item.summary && !usedUrls.has(item.url));

  if (!items.length) throw new Error(`No new ${source.name} RSS item found`);
  return items[0];
}

function paragraphs(text) {
  return String(text || "").trim().split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

function validateDraft(article, source) {
  const errors = [];
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
    errors.push("invalid article, vocabulary, or quiz shape");
  }
  if (source.level === "1" && article?.body_eng) {
    const englishParagraphs = paragraphs(article.body_eng);
    const indonesianParagraphs = paragraphs(article.body_idn);
    const words = article.body_eng.trim().split(/\s+/).filter(Boolean).length;
    if (words < 200) errors.push(`Level 1 body_eng has ${words} words; minimum is 200`);
    if (englishParagraphs.length !== 3) {
      errors.push(`Level 1 body_eng has ${englishParagraphs.length} paragraphs; exactly 3 required`);
    }
    if (indonesianParagraphs.length !== 3) {
      errors.push(`Level 1 body_idn has ${indonesianParagraphs.length} paragraphs; exactly 3 required`);
    }
  }
  if (errors.length) {
    throw new Error(errors.join("; "));
  }
  return article;
}

async function generateLearningArticle(source, item) {
  const quizCount = source.level === "1" ? "3" : "4";
  const wordRange = source.level === "1" ? "200-260" : "180-260";
  const levelOneStructure = source.level === "1"
    ? ` LEVEL 1 STRUCTURE IS MANDATORY: body_eng must contain exactly 3 paragraphs separated by a blank line (two \\n characters in the JSON string). Paragraph 1 explains the main event. Paragraph 2 develops the most important supporting details or context. Paragraph 3 explains the impact, significance, or likely next development. Each paragraph must have one clear controlling idea with supporting sentences; do not dump unrelated facts into a paragraph. body_idn must preserve the same three-paragraph structure.`
    : " Organize body_eng and body_idn into coherent paragraphs with one controlling idea per paragraph.";
  const prompt = `Create an original English-learning news adaptation based ONLY on this RSS headline and summary. Do not copy source wording beyond a short title. Return strict JSON with keys: title, topics, body_eng, body_idn, vocabulary, quiz. topics must be one short comma-separated string, never an array. body_eng must be an original, accurate news summary in English at CEFR Level ${source.level} (${wordRange} words).${levelOneStructure} body_idn must be a natural Indonesian translation using active, natural Indonesian where possible. vocabulary is an array of 5 objects with word and translation. quiz is an array of exactly ${quizCount} objects with question, options (exactly 4 English strings), answer (one option exactly), explanation (short Indonesian). Every fact must be supported by the RSS item.\n\nSource: ${source.name}\nHeadline: ${item.title}\nRSS summary: ${item.summary}`;

  console.log(`Generating Level ${source.level} article with Qwen`);
  const messages = [
    { role: "system", content: "You are a careful ESL news editor. Never invent facts." },
    { role: "user", content: prompt },
  ];
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
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
          messages,
        }),
      },
      10 * 60_000,
    );
    if (!response.ok) {
      throw new Error(`Qwen generation failed: ${response.status} ${await response.text()}`);
    }
    const content = (await response.json()).choices?.[0]?.message?.content;
    if (!content) throw new Error("Qwen returned empty content");
    try {
      return validateDraft(JSON.parse(content), source);
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      console.warn(`Draft failed validation; requesting repair: ${error.message}`);
      messages.push({ role: "assistant", content });
      messages.push({
        role: "user",
        content: `Correct the full JSON draft. It failed validation because: ${error.message}. Keep every fact grounded in the RSS item and return the complete corrected JSON only.`,
      });
    }
  }
  throw lastError || new Error("Qwen draft validation failed");
}

function metaImage(html, pageUrl) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tagMarkup of tags) {
    const property = (attribute(tagMarkup, "property") || attribute(tagMarkup, "name")).toLowerCase();
    if (!["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"].includes(property)) {
      continue;
    }
    const candidate = httpsUrl(attribute(tagMarkup, "content"), pageUrl);
    if (candidate) return candidate;
  }
  return null;
}

async function usableImage(url) {
  if (!url) return false;
  try {
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      headers: { "user-agent": "TumbuhAcademyBot/2.0" },
    }, 15_000);
    if (response.ok && (response.headers.get("content-type") || "").startsWith("image/")) return true;
  } catch {}
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "user-agent": "TumbuhAcademyBot/2.0",
        range: "bytes=0-1023",
      },
    }, 15_000);
    return response.ok && (response.headers.get("content-type") || "").startsWith("image/");
  } catch {
    return false;
  }
}

async function sourceImage(item) {
  if (await usableImage(item.imageUrl)) return item.imageUrl;
  try {
    const response = await fetchWithTimeout(item.url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; TumbuhAcademyBot/2.0)" },
    }, 30_000);
    if (!response.ok) return null;
    const candidate = metaImage(await response.text(), item.url);
    return await usableImage(candidate) ? candidate : null;
  } catch (error) {
    console.warn(`Could not extract source image: ${error.message}`);
    return null;
  }
}

async function googleImage(draft) {
  const key = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim();
  if (!key || !cx) return null;

  const query = `${draft.title} ${Array.isArray(draft.topics) ? draft.topics.join(" ") : draft.topics || "news"}`;
  const params = new URLSearchParams({
    key,
    cx,
    q: query,
    searchType: "image",
    imgType: "photo",
    imgSize: "large",
    safe: "active",
    rights: "cc_publicdomain|cc_attribute|cc_sharealike",
    num: "5",
  });
  try {
    console.log("Searching Google Programmable Search for a licensed image");
    const response = await fetchWithTimeout(
      `https://customsearch.googleapis.com/customsearch/v1?${params}`,
      {},
      30_000,
    );
    if (!response.ok) {
      console.warn(`Google image search failed: ${response.status}`);
      return null;
    }
    const items = (await response.json()).items || [];
    for (const item of items) {
      const width = Number(item.image?.width || 0);
      const height = Number(item.image?.height || 0);
      const candidate = httpsUrl(item.link);
      if (candidate && width >= 1000 && height >= 500 && width > height && await usableImage(candidate)) {
        return candidate;
      }
    }
  } catch (error) {
    console.warn(`Google image search unavailable: ${error.message}`);
  }
  return null;
}

async function findArticleImage(item, draft) {
  const original = await sourceImage(item);
  if (original) {
    console.log("Using the original news image");
    return original;
  }
  return await googleImage(draft);
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
item.imageUrl = await findArticleImage(item, draft);
const result = await callIngest({ operation: "ingest", crawl, item, draft });
console.log(JSON.stringify(result));
