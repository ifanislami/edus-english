import { createClient } from "@supabase/supabase-js";

const sheetId = process.env.GOOGLE_SHEET_ID || process.env.VITE_SHEETS_ID;
const googleApiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.VITE_GOOGLE_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const [name, value] of Object.entries({ sheetId, googleApiKey, supabaseUrl, serviceRoleKey })) {
  if (!value) throw new Error(`Missing ${name}. See .env.example for the sync variables.`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function getRows(tab) {
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}?valueRenderOption=FORMATTED_VALUE&key=${googleApiKey}`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Could not read ${tab}: ${response.status} ${await response.text()}`);
  const { values = [] } = await response.json();
  const [headers = [], ...data] = values;
  return data.filter(row => row.some(cell => String(cell ?? "").trim())).map(row =>
    Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()]))
  );
}

function level(value) {
  return ({ A: "1", B: "2", C: "3", D: "3", "1": "1", "2": "2", "3": "3", "4": "3" }[String(value).toUpperCase()] || "2");
}

const [articleRows, vocabularyRows, quizRows] = await Promise.all([
  getRows("articles"), getRows("vocab"), getRows("quiz_article")
]);

const articles = articleRows.filter(row => row.A_Code && row.Title).map(row => ({
  id: row.A_Code,
  word_count: /^\d+$/.test(row.Word_Count) ? Number(row.Word_Count) : null,
  title: row.Title,
  topics: row.Topics || "Social",
  body_eng: row.Body_eng || "",
  body_idn: row.body_idn || null,
  image_url: row.url_image || null,
  level: level(row.level),
  writers: row.Writers || null,
  source: row.Source || null,
  published_on: /^\d{4}-\d{2}-\d{2}$/.test(row.Date) ? row.Date : null,
  source_updated_at: new Date().toISOString()
}));
const articleIds = new Set(articles.map(article => article.id));
const vocabulary = vocabularyRows.filter(row => row.V_Code && row.Vocab).map(row => ({
  id: row.V_Code,
  article_id: row.V_Code.split("_V")[0],
  word: row.Vocab,
  translation: row.Translation || null,
  pos: null,
  context: null,
  source_updated_at: new Date().toISOString()
})).filter(row => articleIds.has(row.article_id));
const quizzes = quizRows.filter(row => row.Q_code && row.A_code && row.Questions).map(row => ({
  id: row.Q_code,
  article_id: row.A_code,
  question: row.Questions,
  options: [row["Options 1"], row["Options 2"], row["Options 3"], row["Options 4"]].filter(Boolean),
  answer: row["Right Answer"] || null,
  explanation: row.Explanation || null,
  source_updated_at: new Date().toISOString()
})).filter(row => articleIds.has(row.article_id));

async function upsert(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
}

await upsert("articles", articles);
await upsert("article_vocabulary", vocabulary);
await upsert("article_quizzes", quizzes);
console.log(`Synchronized ${articles.length} article rows, ${vocabulary.length} vocabulary rows, and ${quizzes.length} quiz rows.`);
