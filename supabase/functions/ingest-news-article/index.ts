import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

const crawlSources = {
  "republika-l1": { name: "Republika", level: "1", hosts: ["republika.co.id", "www.republika.co.id"] },
  "sciencealert-l2": { name: "ScienceAlert", level: "2", hosts: ["sciencealert.com", "www.sciencealert.com"] },
  "republika-l2": { name: "Republika", level: "2", hosts: ["republika.co.id", "www.republika.co.id"] },
  "sciencealert-l1": { name: "ScienceAlert", level: "1", hosts: ["sciencealert.com", "www.sciencealert.com"] },
  "dw-l2": { name: "DW Indonesia", level: "2", hosts: ["dw.com", "www.dw.com"] },
} as const;

const headers = { "content-type": "application/json; charset=utf-8" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const jakartaDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

function paragraphs(value: string) {
  return value.trim().split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

function validDraft(value: unknown, level: string): value is GeneratedArticle {
  const draft = value as GeneratedArticle;
  const validShape = Boolean(
    draft?.title?.trim() &&
      draft.body_eng?.trim() &&
      draft.body_idn?.trim() &&
      Array.isArray(draft.vocabulary) &&
      draft.vocabulary.length >= 5 &&
      draft.vocabulary.every((entry) => entry.word?.trim() && entry.translation?.trim()) &&
      Array.isArray(draft.quiz) &&
      draft.quiz.length > 0 &&
      draft.quiz.every((entry) =>
        entry.question?.trim() &&
        Array.isArray(entry.options) &&
        entry.options.length === 4 &&
        entry.options.includes(entry.answer) &&
        entry.explanation?.trim()
      )
  );
  if (!validShape) return false;
  if (level === "1") {
    const words = draft.body_eng.trim().split(/\s+/).filter(Boolean).length;
    return words >= 200 && paragraphs(draft.body_eng).length === 3 && paragraphs(draft.body_idn).length === 3;
  }
  return true;
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
  const suppliedKey = request.headers.get("x-crawler-key") || "";
  const { data: authorized, error: authError } = await supabase.rpc(
    "verify_crawler_cron_key",
    { provided_key: suppliedKey },
  );
  if (authError) {
    console.error("Crawler authorization check failed", authError.message);
    return json({ error: "Crawler authorization is not configured" }, 503);
  }
  if (!authorized) return json({ error: "Unauthorized crawler request" }, 401);

  const body = await request.json().catch(() => ({}));
  const source = crawlSources[body.crawl as keyof typeof crawlSources];
  if (!source) return json({ error: "Invalid crawl" }, 400);

  try {
    const date = jakartaDate();
    const { data: published, error: publishedError } = await supabase
      .from("articles")
      .select("id,title,source,source_url,source_title")
      .eq("level", source.level)
      .eq("writers", source.name)
      .eq("published_on", date)
      .limit(1);
    if (publishedError) throw publishedError;

    const existing = published?.[0];
    if (existing && body.operation === "prepare" && body.replaceToday) {
      const url = existing.source_url || existing.source;
      if (!url) return json({ error: "Existing article has no source URL" }, 400);
      return json({
        ok: true,
        crawl: body.crawl,
        date,
        articleId: existing.id,
        item: { title: existing.source_title || existing.title, url, summary: "Existing article refresh" },
      });
    }
    if (existing && body.operation !== "replace") {
      return json({
        ok: true,
        skipped: "already-published-today",
        articleId: existing.id,
        crawl: body.crawl,
        date,
      });
    }

    if (body.operation === "prepare") {
      const { data: rows, error } = await supabase
        .from("articles")
        .select("source,source_url")
        .or("source.not.is.null,source_url.not.is.null");
      if (error) throw error;
      const usedUrls = [...new Set(
        (rows ?? []).flatMap((row) => [row.source, row.source_url]).filter(Boolean),
      )];
      return json({ ok: true, crawl: body.crawl, date, usedUrls });
    }

    if (body.operation !== "ingest" && body.operation !== "replace") return json({ error: "Invalid operation" }, 400);
    const replacing = body.operation === "replace";
    if (replacing && (!existing || body.articleId !== existing.id)) {
      return json({ error: "Only today's matching article can be replaced" }, 400);
    }
    if (!validDraft(body.draft, source.level)) return json({ error: "Invalid article draft" }, 400);

    const item = body.item as { title?: string; url?: string; summary?: string; imageUrl?: string };
    let itemUrl: URL;
    try {
      itemUrl = new URL(item?.url || "");
    } catch {
      return json({ error: "Invalid source URL" }, 400);
    }
    if (
      itemUrl.protocol !== "https:" ||
      !source.hosts.some((host) => itemUrl.hostname === host || itemUrl.hostname.endsWith(`.${host}`)) ||
      !item?.title?.trim() ||
      !item?.summary?.trim()
    ) {
      return json({ error: "Source item does not match the crawl" }, 400);
    }

    let imageUrl: string | null = null;
    if (item.imageUrl) {
      try {
        const parsedImage = new URL(item.imageUrl);
        if (parsedImage.protocol !== "https:") return json({ error: "Invalid image URL" }, 400);
        imageUrl = parsedImage.toString();
      } catch {
        return json({ error: "Invalid image URL" }, 400);
      }
    }

    const { data: duplicateBySource, error: duplicateSourceError } = await supabase
      .from("articles")
      .select("id")
      .eq("source", itemUrl.toString())
      .limit(1);
    if (duplicateSourceError) throw duplicateSourceError;
    const { data: duplicateByUrl, error: duplicateUrlError } = await supabase
      .from("articles")
      .select("id")
      .eq("source_url", itemUrl.toString())
      .limit(1);
    if (duplicateUrlError) throw duplicateUrlError;
    const duplicate = duplicateBySource?.[0] || duplicateByUrl?.[0];
    if (duplicate && (!replacing || duplicate.id !== existing?.id)) {
      return json({ ok: true, skipped: "source-already-published", articleId: duplicate.id });
    }

    const draft = body.draft as GeneratedArticle;
    const articleId = replacing ? existing!.id : `ai-${crypto.randomUUID().replaceAll("-", "")}`;
    const sourceUpdatedAt = new Date().toISOString();
    const topics = (
      Array.isArray(draft.topics) ? draft.topics.join(", ") : String(draft.topics || "")
    ).trim().slice(0, 300) || "News";
    const words = draft.body_eng.trim().split(/\s+/).filter(Boolean).length;

    const articlePayload = {
      id: articleId,
      word_count: words,
      title: draft.title.trim(),
      topics,
      body_eng: draft.body_eng.trim(),
      body_idn: draft.body_idn.trim(),
      image_url: imageUrl,
      level: source.level,
      writers: source.name,
      source: itemUrl.toString(),
      source_url: itemUrl.toString(),
      source_title: item.title.trim(),
      published_on: date,
      source_updated_at: sourceUpdatedAt,
    };
    const { error: articleError } = replacing
      ? await supabase.from("articles").update(articlePayload).eq("id", articleId)
      : await supabase.from("articles").insert(articlePayload);
    if (articleError) throw articleError;

    try {
      if (replacing) {
        const { error: removeVocabularyError } = await supabase.from("article_vocabulary").delete().eq("article_id", articleId);
        if (removeVocabularyError) throw removeVocabularyError;
        const { error: removeQuizError } = await supabase.from("article_quizzes").delete().eq("article_id", articleId);
        if (removeQuizError) throw removeQuizError;
      }
      const { error: vocabularyError } = await supabase
        .from("article_vocabulary")
        .insert(draft.vocabulary.slice(0, 5).map((entry, index) => ({
          id: `${articleId}_V${index + 1}`,
          article_id: articleId,
          word: entry.word.trim(),
          translation: entry.translation.trim(),
          source_updated_at: sourceUpdatedAt,
        })));
      if (vocabularyError) throw vocabularyError;

      const { error: quizError } = await supabase
        .from("article_quizzes")
        .insert(draft.quiz.map((entry, index) => ({
          id: `${articleId}_Q${index + 1}`,
          article_id: articleId,
          question: entry.question.trim(),
          options: entry.options,
          answer: entry.answer,
          explanation: entry.explanation.trim(),
          source_updated_at: sourceUpdatedAt,
        })));
      if (quizError) throw quizError;
    } catch (error) {
      await supabase.from("article_quizzes").delete().eq("article_id", articleId);
      await supabase.from("article_vocabulary").delete().eq("article_id", articleId);
      if (!replacing) await supabase.from("articles").delete().eq("id", articleId);
      throw error;
    }

    console.log(JSON.stringify({ ok: true, articleId, crawl: body.crawl }));
    return json({ ok: true, articleId, crawl: body.crawl, sourceUrl: itemUrl.toString() });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Article ingest failed", { crawl: body.crawl, detail });
    return json({ error: "Article ingest failed", detail }, 500);
  }
});
