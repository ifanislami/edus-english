import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SHEET_ID = required("GOOGLE_SHEET_ID");
const QWEN_API_KEY = required("QWEN_API_KEY");
const GOOGLE_SERVICE_ACCOUNT_EMAIL = required("GOOGLE_SERVICE_ACCOUNT_EMAIL");
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = required("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
const SUPABASE_URL = required("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

const clean = (value = "") => value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const tag = (xml, name) => clean(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "");
const b64url = value => Buffer.from(value).toString("base64url");
const fetchWithTimeout = (url, options = {}, timeoutMs = 60_000) => fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });

async function googleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).toString("base64url");
  console.log("Authenticating with Google Sheets");
  const response = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` })
  }, 30_000);
  if (!response.ok) throw new Error(`Google auth failed: ${response.status} ${await response.text()}`);
  return (await response.json()).access_token;
}

async function sheetValues(token, range) {
  console.log(`Reading Google Sheet range: ${range}`);
  const response = await fetchWithTimeout(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`, { headers: { authorization: `Bearer ${token}` } }, 30_000);
  if (!response.ok) throw new Error(`Google Sheets read failed: ${response.status} ${await response.text()}`);
  return (await response.json()).values ?? [];
}

async function appendRows(token, range, values) {
  if (!values.length) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  console.log(`Appending Google Sheet range: ${range}`);
  const response = await fetchWithTimeout(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ values }) }, 30_000);
  if (!response.ok) throw new Error(`Google Sheets append failed: ${response.status} ${await response.text()}`);
}

async function getFeedItem(source, usedUrls) {
  console.log(`Fetching RSS: ${source.name}`);
  const response = await fetchWithTimeout(source.feed, { headers: { "user-agent": "TumbuhAcademyBot/1.0 (+https://tumbuhacademy.vercel.app)" } }, 30_000);
  if (!response.ok) throw new Error(`${source.name} feed failed: ${response.status}`);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map(match => {
    const item = match[0];
    return { title: tag(item, "title"), url: tag(item, "link"), summary: tag(item, "description") };
  }).filter(item => item.title && item.url && !usedUrls.has(item.url));
  if (!items.length) throw new Error(`No new ${source.name} RSS item found.`);
  return items[0];
}

async function generateLearningArticle(source, item) {
  const quizCount = source.level === "1" ? "2 or 3" : "4";
  const prompt = `Create an original English-learning news adaptation based ONLY on this RSS headline and summary. Do not copy source wording beyond a short title. Return strict JSON with keys: title, topics, body_eng, body_idn, vocabulary, quiz. topics must be one short comma-separated string, never an array. body_eng must be an original, accurate news summary in English at CEFR Level ${source.level} (${source.level === "1" ? "120-180" : source.level === "2" ? "180-260" : "320-450"} words). body_idn must be a natural Indonesian translation using active, natural Indonesian where possible. vocabulary is an array of 5 objects with word and translation. quiz is an array of exactly ${quizCount} objects with question, options (exactly 4 English strings), answer (one option exactly), explanation (short Indonesian). Every fact must be supported by the RSS item.\n\nSource: ${source.name}\nHeadline: ${item.title}\nRSS summary: ${item.summary}`;
  console.log(`Generating Level ${source.level} learning article with Qwen`);
  const response = await fetchWithTimeout(process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${QWEN_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.QWEN_MODEL || "qwen3.8-max", temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: "You are a careful ESL news editor. Never invent facts." }, { role: "user", content: prompt }] })
  }, 180_000);
  if (!response.ok) throw new Error(`Qwen generation failed: ${response.status} ${await response.text()}`);
  const content = (await response.json()).choices?.[0]?.message?.content;
  const article = JSON.parse(content);
  if (!article.body_eng || !article.body_idn || !Array.isArray(article.vocabulary) || !Array.isArray(article.quiz)) throw new Error("Qwen response has an invalid article shape.");
  return article;
}

const source = {
  name: required("CRAWL_SOURCE"),
  level: required("CRAWL_LEVEL"),
  feed: required("CRAWL_FEED")
};
const jakartaDate = () => {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
  const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
if (process.env.CRAWL_ONLY_DATE && jakartaDate() !== process.env.CRAWL_ONLY_DATE) {
  console.log(JSON.stringify({ ok: true, skipped: "one-time-recovery-expired", expectedDate: process.env.CRAWL_ONLY_DATE, jakartaDate: jakartaDate() }));
  process.exit(0);
}
const token = await googleAccessToken();
const articleRows = await sheetValues(token, "articles!A:K");
const date = new Date().toISOString().slice(0, 10);
const alreadyPublishedToday = articleRows.slice(1).some(row =>
  String(row[7] || "") === source.level &&
  String(row[8] || "") === source.name &&
  String(row[10] || "") === date
);
if (alreadyPublishedToday) {
  console.log(JSON.stringify({ ok: true, skipped: "already-published-today", source: source.name, level: source.level, date }));
  process.exit(0);
}
const usedUrls = new Set(articleRows.slice(1).map(row => row[9]).filter(Boolean));
const item = await getFeedItem(source, usedUrls);
const draft = await generateLearningArticle(source, item);
const topics = (Array.isArray(draft.topics) ? draft.topics.join(", ") : String(draft.topics || "")).trim() || "News";
const usedIds = articleRows.slice(1).map(row => Number(String(row[0] || "").replace(/^A/, ""))).filter(Number.isFinite);
const articleId = `A${Math.max(0, ...usedIds) + 1}`;
const words = draft.body_eng.trim().split(/\s+/).filter(Boolean).length;

await appendRows(token, "articles!A:K", [[articleId, words, draft.title, topics, draft.body_eng, draft.body_idn, "", source.level, source.name, item.url, date]]);
await appendRows(token, "vocab!A:C", draft.vocabulary.slice(0, 5).map((entry, index) => [`${articleId}_V${index + 1}`, entry.word, entry.translation]));
await appendRows(token, "quiz_article!A:I", draft.quiz.map((entry, index) => [`${articleId}_Q${index + 1}`, articleId, entry.question, ...entry.options, entry.answer, entry.explanation]));

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sourceUpdatedAt = new Date().toISOString();
console.log("Publishing article to Supabase");
const { error: articleError } = await supabase.from("articles").upsert({ id: articleId, word_count: words, title: draft.title, topics, body_eng: draft.body_eng, body_idn: draft.body_idn, image_url: null, level: source.level, writers: source.name, source: item.url, published_on: date, source_updated_at: sourceUpdatedAt });
if (articleError) throw articleError;
const { error: vocabError } = await supabase.from("article_vocabulary").upsert(draft.vocabulary.slice(0, 5).map((entry, index) => ({ id: `${articleId}_V${index + 1}`, article_id: articleId, word: entry.word, translation: entry.translation, source_updated_at: sourceUpdatedAt })));
if (vocabError) throw vocabError;
const { error: quizError } = await supabase.from("article_quizzes").upsert(draft.quiz.map((entry, index) => ({ id: `${articleId}_Q${index + 1}`, article_id: articleId, question: entry.question, options: entry.options, answer: entry.answer, explanation: entry.explanation, source_updated_at: sourceUpdatedAt })));
if (quizError) throw quizError;
console.log(JSON.stringify({ ok: true, articleId, source: source.name, sourceUrl: item.url }));
