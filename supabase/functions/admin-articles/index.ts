import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAIL = "tes@tes.com";
const cors = {
  "Access-Control-Allow-Origin": "https://tumbuhacademy.vercel.app",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, init: ResponseInit = {}) =>
  Response.json(body, { ...init, headers: { ...cors, ...(init.headers || {}) } });

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const value = error as { message?: unknown; details?: unknown; code?: unknown };
    const details = typeof value.details === "string" && value.details ? ` (${value.details})` : "";
    const code = typeof value.code === "string" && value.code ? ` [${value.code}]` : "";
    return `${String(value.message || "Database request failed")}${details}${code}`;
  }
  return String(error || "Unknown error");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/, "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    const x = await req.json();

    if (x.operation === "process") {
      const a = x.article;
      const rule = a.level === "1"
        ? "Level 1 A2-B1, 180-240 words, mostly common words, 6-10 target vocabulary."
        : a.level === "2"
          ? "Level 2 B2, 300-500 words, natural news language, 8-12 target vocabulary."
          : "Level 3 C1+, retain natural news complexity and choose 8-12 useful vocabulary.";
      const quizCount = a.level === "1" ? 3 : a.level === "2" ? 4 : 5;
      const quizFocus = a.level === "1"
        ? "main idea, explicit detail, and vocabulary in context/simple inference"
        : a.level === "2"
          ? "main idea or purpose, cause-effect, inference, and vocabulary or collocation in context"
          : "central claim, complex inference, paragraph function, evidence or logic, and word nuance or author stance";
      const prompt = `You are an English-learning assessment editor. Based only on this article, ${x.adjust ? "rewrite it to " : "keep its wording and "}meet ${rule} Return JSON only: body_eng, vocabulary (array word,translation,pos,context), quiz (exactly ${quizCount} objects: question, options with exactly 4 strings, answer that exactly matches one option, and explanation in Indonesian). Cover ${quizFocus}. Every question must be answerable from the article, avoid trivial dates/numbers, use one clearly best answer, and make distractors plausible through half-truth, reversed causality, wrong scope, or unsupported claims. Each explanation must state why the answer is correct, cite the supporting idea from the text, and briefly explain why the strongest distractor is wrong. Never use all-of-the-above. Do not repeat the same skill. IMPORTANT: tokens beginning [IMAGE: and [H2: are editorial layout blocks. Preserve every such block verbatim, in the same order and relative position. Never translate, rewrite, remove, or count them as article words. Article: ${a.body}`;
      const ai = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + Deno.env.get("DASHSCOPE_API_KEY"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("DASHSCOPE_MODEL") || "qwen3.8-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          enable_thinking: false,
        }),
      });
      if (!ai.ok) throw new Error(`AI request failed (${ai.status})`);
      const out = JSON.parse((await ai.json()).choices[0].message.content);
      return json(out);
    }

    if (x.operation === "upsert") {
      const article = await admin.from("articles").upsert(x.article, { onConflict: "id" });
      if (article.error) throw article.error;
      const oldVocabulary = await admin.from("article_vocabulary").delete().eq("article_id", x.article.id);
      if (oldVocabulary.error) throw oldVocabulary.error;
      const oldQuizzes = await admin.from("article_quizzes").delete().eq("article_id", x.article.id);
      if (oldQuizzes.error) throw oldQuizzes.error;
      if (x.vocabulary?.length) {
        const vocabulary = await admin.from("article_vocabulary").insert(x.vocabulary);
        if (vocabulary.error) throw vocabulary.error;
      }
      if (x.quizzes?.length) {
        const quizzes = await admin.from("article_quizzes").insert(x.quizzes);
        if (quizzes.error) throw quizzes.error;
      }
      return json({ ok: true });
    }

    if (x.operation === "patch") {
      const result = await admin.from("articles").update(x.patch).eq("id", x.article.id);
      if (result.error) throw result.error;
      return json({ ok: true });
    }

    if (x.operation === "replace_vocabulary") {
      const removed = await admin.from("article_vocabulary").delete().eq("article_id", x.article.id);
      if (removed.error) throw removed.error;
      if (x.vocabulary?.length) {
        const inserted = await admin.from("article_vocabulary").insert(x.vocabulary);
        if (inserted.error) throw inserted.error;
      }
      return json({ ok: true });
    }

    if (x.operation === "replace_quizzes") {
      const removed = await admin.from("article_quizzes").delete().eq("article_id", x.article.id);
      if (removed.error) throw removed.error;
      if (x.quizzes?.length) {
        const inserted = await admin.from("article_quizzes").insert(x.quizzes);
        if (inserted.error) throw inserted.error;
      }
      return json({ ok: true });
    }

    if (x.operation === "delete") {
      if (!Array.isArray(x.ids) || !x.ids.length || x.ids.some((id: unknown) => typeof id !== "string" || !id)) {
        return json({ error: "ids must be a non-empty array of article IDs" }, { status: 400 });
      }

      // Keep users' saved words, but detach them from an article that is about to be removed.
      const savedVocabulary = await admin
        .from("user_saved_vocabulary")
        .update({ source_article_id: null })
        .in("source_article_id", x.ids);
      if (savedVocabulary.error) throw savedVocabulary.error;

      // Delete dependent rows first so foreign-key constraints do not block the article deletion.
      for (const table of ["reading_progress", "article_vocabulary", "article_quizzes"]) {
        const result = await admin.from(table).delete().in("article_id", x.ids);
        if (result.error) throw result.error;
      }
      const result = await admin.from("articles").delete().in("id", x.ids);
      if (result.error) throw result.error;
      return json({ ok: true });
    }

    return json({ error: "Invalid operation" }, { status: 400 });
  } catch (error) {
    const message = errorMessage(error);
    console.error("admin-articles failed:", message, error);
    return json({ error: message }, { status: 400 });
  }
});
