import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type CrawlSource = { name: string; level: "1" | "2"; feed: string };
type GeneratedArticle = {
  title: string;
  topics: string | string[];
  body_eng: string;
  body_idn: string;
  vocabulary: Array<{ word: string; translation: string }>;
  quiz: Array<{
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }>;
};

const crawlSources: Record<string, CrawlSource> = {
  "republika-l1": {
    name: "Republika",
    level: "1",
    feed: "https://www.republika.co.id/rss/",
  },
  "sciencealert-l2": {
    name: "ScienceAlert",
    level: "2",
    feed:
      "https://www.sciencealert.com/feed/",
  },
  "republika-l2": {
    name: "Republika",
    level: "2",
    feed: "https://www.republika.co.id/rss/",
  },
  "sciencealert-l1": {
    name: "ScienceAlert",
    level: "1",
    feed:
      "https://www.sciencealert.com/feed/",
  },
  "dw-l2": {
    name: "DW Indonesia",
    level: "2",
    feed: "https://rss.dw.com/xml/rss-id-all",
  },
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

function clean(value = "") {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml: string, name: string) {
  return clean(
    xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ??
      "",
  );
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30_000,
) {
  return await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function getFeedItem(source: CrawlSource, usedUrls: Set<string>) {
  console.log(`Fetching RSS: ${source.name}`);
  const response = await fetchWithTimeout(
    source.feed,
    {
      headers: {
        "user-agent":
          "TumbuhAcademyBot/1.0 (+https://tumbuhacademy.vercel.app)",
      },
    },
    25_000,
  );
  if (!response.ok) {
    throw new Error(`${source.name} feed failed: ${response.status}`);
  }

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
    .filter((item) => item.title && item.url && !usedUrls.has(item.url));

  if (!items.length) throw new Error(`No new ${source.name} RSS item found.`);
  return items[0];
}

async function generateLearningArticle(
  source: CrawlSource,
  item: { title: string; url: string; summary: string },
) {
  const apiKey = Deno.env.get("QWEN_API_KEY");
  if (!apiKey) throw new Error("Missing QWEN_API_KEY in Supabase secrets");

  const quizCount = source.level === "1" ? "2 or 3" : "4";
  const wordRange = source.level === "1" ? "120-180" : "180-260";
  const prompt =
    `Create an original English-learning news adaptation based ONLY on this RSS headline and summary. Do not copy source wording beyond a short title. Return strict JSON with keys: title, topics, body_eng, body_idn, vocabulary, quiz. topics must be one short comma-separated string, never an array. body_eng must be an original, accurate news summary in English at CEFR Level ${source.level} (${wordRange} words). body_idn must be a natural Indonesian translation using active, natural Indonesian where possible. vocabulary is an array of 5 objects with word and translation. quiz is an array of exactly ${quizCount} objects with question, options (exactly 4 English strings), answer (one option exactly), explanation (short Indonesian). Every fact must be supported by the RSS item.\n\nSource: ${source.name}\nHeadline: ${item.title}\nRSS summary: ${item.summary}`;

  console.log(`Generating Level ${source.level} article with Qwen`);
  const response = await fetchWithTimeout(
    Deno.env.get("QWEN_BASE_URL") ||
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("QWEN_MODEL") || "qwen3.8-max",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a careful ESL news editor. Never invent facts.",
          },
          { role: "user", content: prompt },
        ],
      }),
    },
    115_000,
  );
  if (!response.ok) {
    throw new Error(
      `Qwen generation failed: ${response.status} ${await response.text()}`,
    );
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Qwen returned empty content");

  const article = JSON.parse(content) as GeneratedArticle;
  if (
    !article.title ||
    !article.body_eng ||
    !article.body_idn ||
    !Array.isArray(article.vocabulary) ||
    !article.vocabulary.length ||
    !Array.isArray(article.quiz) ||
    !article.quiz.length ||
    article.quiz.some((entry) =>
      !entry.question ||
      !Array.isArray(entry.options) ||
      entry.options.length !== 4 ||
      !entry.options.includes(entry.answer)
    )
  ) {
    throw new Error("Qwen response has an invalid article shape");
  }
  return article;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase runtime credentials are unavailable" }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const suppliedCronKey = request.headers.get("x-crawler-key") || "";
  const { data: authorized, error: authError } = await supabase.rpc(
    "verify_crawler_cron_key",
    { provided_key: suppliedCronKey },
  );
  if (authError) {
    console.error("Crawler authorization check failed", authError.message);
    return json({ error: "Crawler authorization is not configured" }, 503);
  }
  if (!authorized) return json({ error: "Unauthorized crawler request" }, 401);

  const { crawl, dryRun = false } = await request.json().catch(() => ({}));
  const source = crawlSources[crawl];
  if (!source) return json({ error: "Invalid crawl" }, 400);

  try {
    const date = new Date().toISOString().slice(0, 10);
    const { data: published, error: publishedError } = await supabase
      .from("articles")
      .select("id")
      .eq("level", source.level)
      .eq("writers", source.name)
      .eq("published_on", date)
      .limit(1);
    if (publishedError) throw publishedError;
    if (published?.length) {
      return json({
        ok: true,
        skipped: "already-published-today",
        articleId: published[0].id,
        crawl,
        date,
      });
    }

    const { data: usedRows, error: usedError } = await supabase
      .from("articles")
      .select("source")
      .not("source", "is", null);
    if (usedError) throw usedError;
    const usedUrls = new Set(
      (usedRows ?? []).map((row) => row.source).filter(Boolean),
    );
    const item = await getFeedItem(source, usedUrls);

    if (dryRun) {
      return json({
        ok: true,
        dryRun: true,
        crawl,
        source: source.name,
        candidateTitle: item.title,
        qwenConfigured: Boolean(Deno.env.get("QWEN_API_KEY")),
      });
    }

    const draft = await generateLearningArticle(source, item);
    const articleId = `ai-${crypto.randomUUID().replaceAll("-", "")}`;
    const sourceUpdatedAt = new Date().toISOString();
    const topics = (
      Array.isArray(draft.topics)
        ? draft.topics.join(", ")
        : String(draft.topics || "")
    ).trim() || "News";
    const words = draft.body_eng.trim().split(/\s+/).filter(Boolean).length;

    const { error: articleError } = await supabase.from("articles").insert({
      id: articleId,
      word_count: words,
      title: draft.title,
      topics,
      body_eng: draft.body_eng,
      body_idn: draft.body_idn,
      image_url: null,
      level: source.level,
      writers: source.name,
      source: item.url,
      published_on: date,
      source_updated_at: sourceUpdatedAt,
    });
    if (articleError) throw articleError;

    try {
      const { error: vocabError } = await supabase
        .from("article_vocabulary")
        .insert(
          draft.vocabulary.slice(0, 5).map((entry, index) => ({
            id: `${articleId}_V${index + 1}`,
            article_id: articleId,
            word: entry.word,
            translation: entry.translation,
            source_updated_at: sourceUpdatedAt,
          })),
        );
      if (vocabError) throw vocabError;

      const { error: quizError } = await supabase
        .from("article_quizzes")
        .insert(
          draft.quiz.map((entry, index) => ({
            id: `${articleId}_Q${index + 1}`,
            article_id: articleId,
            question: entry.question,
            options: entry.options,
            answer: entry.answer,
            explanation: entry.explanation,
            source_updated_at: sourceUpdatedAt,
          })),
        );
      if (quizError) throw quizError;
    } catch (error) {
      await supabase.from("article_quizzes").delete().eq("article_id", articleId);
      await supabase.from("article_vocabulary").delete().eq("article_id", articleId);
      await supabase.from("articles").delete().eq("id", articleId);
      throw error;
    }

    console.log(JSON.stringify({ ok: true, articleId, crawl, sourceUrl: item.url }));
    return json({ ok: true, articleId, crawl, sourceUrl: item.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Direct crawler failed", { crawl, message });
    return json({ error: "Crawler failed", detail: message, crawl }, 500);
  }
});
