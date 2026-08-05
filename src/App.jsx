import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LoginPage } from "./AuthPages";
import { UserProfile } from "./UserProfile";
import { createClient } from "@supabase/supabase-js";


// SUPABASE CONFIG - ISI DI SINI
// Pakai project Supabase Evalum supaya 1 akun (login) berlaku di Tumbuh Academy & Evalum
const SUPABASE_URL = "https://veitnzxztfumzkpujkcz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaXRuenh6dGZ1bXprcHVqa2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDIzMzcsImV4cCI6MjA5NjkxODMzN30.oUCUOxgIEYCnZRngj3-nm2NxLUsuPU01wVeSbAx2E-w";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
// ─── CONFIGURATION ──────────────────────────────────────────────────────────
// Isi kedua key ini di Google Cloud Console (https://console.cloud.google.com)
// 1. Aktifkan "Google Sheets API" + "Cloud Translation API"
// 2. Buat API Key, restrict ke Sheets API + Translation API + HTTP referrer
const GOOGLE_API_KEY = "AIzaSyDB-a5yC5i75uCZBi9Du_PpffYznQxfDYs"; // ← API key untuk Sheets + Translate
const SHEETS_ID = "1no9cVz73NQV2z5TZdGcc0x-wKd5Xh4nO6emWdvtxJro";      // ← ID spreadsheet (dari URL Google Sheets)
// Sheet names — harus sama persis dengan nama tab di Sheets
const SHEET_ARTICLES = "articles";
const SHEET_VOCAB = "vocab_quiz"; // for standalone vocab quiz
const SHEET_RD_VOCAB = "vocab"; // for reading module
const SHEET_RD_QUIZ = "quiz_article"; // for reading module
const SHEETS_CACHE_KEY = "edus_sheets_cache_v1"; // localStorage cache for reading data
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════
// GOOGLE SHEETS FETCHER
// ═══════════════════════════════════════
async function fetchSheet(sheetName) {
  if (!GOOGLE_API_KEY || !SHEETS_ID) return null;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(sheetName)}?valueRenderOption=FORMATTED_VALUE&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.values || data.values.length < 2) return null;
  const headers = data.values[0].map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return data.values.slice(1).filter(row => row.some(cell => cell && cell.trim())).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (row[i] || "").trim(); });
    return obj;
  });
}

// Parse articles sheet into app data structures
// Parse "articles" sheet
// Columns: A_Code, Word_Count, Title, Topics, Body_eng, body_idn, url_image, level, Writers, Source, Date
function parseArticlesSheet(rows) {
  if (!rows || !rows.length) return { articles: [], vocab: [], quiz: [] };
  const levelMap = {"A":"1","B":"2","C":"3","D":"4","1":"1","2":"2","3":"3","4":"4"};
  const articles = rows
    .filter(r => (r.a_code || r.id) && (r.title || r.Title))
    .map(r => ({
      id: r.a_code || r.id || "",
      title: r.title || r.Title || "",
      topics: r.topics || r.Topics || "Social",
      level: levelMap[String(r.level || r.Level || "2")] || "2",
      word_count: r.word_count || r.Word_Count || null,
      writers: r.writers || r.Writers || null,
      source: r.source || r.Source || null,
      date: r.date || r.Date || null,
      body: (r.body_eng || r.body || r.Body_eng || r.Body || "").replace(/\\n/g, "\n").trim(),
      body_idn: (r.body_idn || r.Body_idn || "").replace(/\\n/g, "\n").trim(),
      image: r.url_image || r.image_url || r.image || "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800"
    }));
  return { articles, vocab: [], quiz: [] };
}

// Parse "vocab" sheet
// Columns: V_Code, Vocab, Translation
function parseVocabSheetNew(rows) {
  if (!rows || !rows.length) return [];
  return rows.filter(r => r.v_code || r.vocab || r.Vocab).map(r => {
    const vid = r.v_code || r.V_Code || "";
    const aid = vid.split("_V")[0] || "";
    return {
      aid, vid,
      word: r.vocab || r.Vocab || "",
      translation: r.translation || r.Translation || "",
      pos: r.pos || r.category || "noun",
      context: r.context || r.Context || ""
    };
  });
}

// Parse "quiz_article" sheet
// Columns: Q_code, A_code, Questions, Options 1-4, Right Answer, Explanation
function parseQuizSheetNew(rows) {
  if (!rows || !rows.length) return [];
  return rows.filter(r => r.q_code || r.questions || r.Questions).map(r => ({
    qid: r.q_code || r.Q_code || "",
    aid: r.a_code || r.A_code || "",
    question: r.questions || r.Questions || "",
    options: [
      r["options_1"] || r["options 1"] || "",
      r["options_2"] || r["options 2"] || "",
      r["options_3"] || r["options 3"] || "",
      r["options_4"] || r["options 4"] || ""
    ].filter(Boolean),
    answer: r.right_answer || r["right answer"] || r.answer || "",
    explanation: r.explanation || r.Explanation || ""
  }));
}

// Parse vocab_quiz sheet (standalone vocab quiz, separate from reading)
function parseVocabSheet(rows) {
  if (!rows || !rows.length) return [];
  return rows.filter(r => r.word_en || r.word).map(r => ({
    word: r.word_en || r.word || "",
    meaning: r.translation_id || r.translation || r.meaning || "",
    category: r.category || "Noun"
  }));
}

// ═══════════════════════════════════════
// EXCEL/CSV PARSER (for admin upload)
// ═══════════════════════════════════════
async function parseExcelFile(file) {
  // Dynamically import SheetJS
  const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheets = {};
  for (const name of wb.SheetNames) {
    sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
  }
  return sheets;
}

async function parseCsvFile(file) {
  const text = await file.text();
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    // Simple CSV parse (handles quoted fields)
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  });
}

// Write rows to Google Sheets (append)
async function appendToSheet(sheetName, headers, rows) {
  if (!GOOGLE_API_KEY || !SHEETS_ID) throw new Error("API Key atau Sheet ID belum diisi.");
  const values = [headers, ...rows.map(r => headers.map(h => r[h] || ""))];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Sheets API error ${res.status}`);
  }
  return await res.json();
}

// ═══════════════════════════════════════
// DATA
// ═══════════════════════════════════════
const DB_EN = [{"word": "govern", "meaning": "memerintah", "category": "Verb"}, {"word": "vowel", "meaning": "huruf vokal", "category": "Noun"}, {"word": "noun", "meaning": "kata benda", "category": "Noun"}, {"word": "pattern", "meaning": "pola", "category": "Noun"}, {"word": "figure", "meaning": "angka", "category": "Noun"}, {"word": "certain", "meaning": "pasti", "category": "Adjective"}, {"word": "science", "meaning": "ilmu pengetahuan", "category": "Noun"}, {"word": "machine", "meaning": "mesin", "category": "Noun"}, {"word": "example", "meaning": "contoh", "category": "Noun"}, {"word": "serve", "meaning": "melayani", "category": "Verb"}, {"word": "appear", "meaning": "muncul", "category": "Verb"}, {"word": "toward", "meaning": "menuju", "category": "Preposition"}, {"word": "several", "meaning": "beberapa", "category": "Adjective"}, {"word": "base", "meaning": "dasar", "category": "Noun"}, {"word": "mark", "meaning": "tanda", "category": "Noun"}, {"word": "rule", "meaning": "aturan", "category": "Noun"}, {"word": "notice", "meaning": "pemberitahuan", "category": "Noun"}, {"word": "power", "meaning": "kekuatan", "category": "Noun"}, {"word": "center", "meaning": "pusat", "category": "Noun"}, {"word": "contain", "meaning": "mengandung", "category": "Verb"}, {"word": "usual", "meaning": "biasa", "category": "Adjective"}, {"word": "develop", "meaning": "mengembangkan", "category": "Verb"}, {"word": "direct", "meaning": "langsung", "category": "Verb"}, {"word": "measure", "meaning": "mengukur", "category": "Verb"}, {"word": "produce", "meaning": "menghasilkan", "category": "Verb"}, {"word": "product", "meaning": "produk", "category": "Noun"}, {"word": "multiply", "meaning": "mengalikan", "category": "Noun"}, {"word": "numeral", "meaning": "angka", "category": "Noun"}, {"word": "complete", "meaning": "lengkap", "category": "Noun"}, {"word": "force", "meaning": "kekuatan", "category": "Noun"}, {"word": "surface", "meaning": "permukaan", "category": "Noun"}, {"word": "record", "meaning": "catatan", "category": "Noun"}, {"word": "possible", "meaning": "mungkin", "category": "Adjective"}, {"word": "wonder", "meaning": "keajaiban", "category": "Noun"}, {"word": "equate", "meaning": "menyamakan", "category": "Verb"}, {"word": "interest", "meaning": "minat", "category": "Noun"}, {"word": "reach", "meaning": "mencapai", "category": "Verb"}, {"word": "distant", "meaning": "jauh", "category": "Noun"}, {"word": "consider", "meaning": "mempertimbangkan", "category": "Noun"}, {"word": "century", "meaning": "abad", "category": "Noun"}, {"word": "language", "meaning": "bahasa", "category": "Noun"}, {"word": "among", "meaning": "di antara", "category": "Noun"}, {"word": "though", "meaning": "meskipun", "category": "Conjunction"}, {"word": "decide", "meaning": "memutuskan", "category": "Verb"}, {"word": "problem", "meaning": "masalah", "category": "Noun"}, {"word": "probable", "meaning": "kemungkinan", "category": "Noun"}, {"word": "section", "meaning": "bagian", "category": "Noun"}, {"word": "forest", "meaning": "hutan", "category": "Noun"}, {"word": "surprise", "meaning": "kejutan", "category": "Noun"}, {"word": "exercise", "meaning": "latihan", "category": "Noun"}, {"word": "field", "meaning": "bidang", "category": "Noun"}, {"word": "rest", "meaning": "istirahat", "category": "Noun"}, {"word": "correct", "meaning": "benar", "category": "Adjective"}, {"word": "able", "meaning": "mampu", "category": "Adjective"}, {"word": "beauty", "meaning": "keindahan", "category": "Noun"}, {"word": "enough", "meaning": "cukup", "category": "Noun"}, {"word": "plain", "meaning": "polos", "category": "Adjective"}, {"word": "stood", "meaning": "berdiri", "category": "Verb"}, {"word": "front", "meaning": "depan", "category": "Noun"}, {"word": "ready", "meaning": "siap", "category": "Noun"}, {"word": "quick", "meaning": "cepat", "category": "Noun"}, {"word": "ocean", "meaning": "lautan", "category": "Noun"}, {"word": "warm", "meaning": "hangat", "category": "Noun"}, {"word": "minute", "meaning": "menit", "category": "Noun"}, {"word": "strong", "meaning": "kuat", "category": "Noun"}, {"word": "behind", "meaning": "di belakang", "category": "Noun"}, {"word": "clear", "meaning": "jelas", "category": "Noun"}, {"word": "fact", "meaning": "fakta", "category": "Noun"}, {"word": "street", "meaning": "jalan", "category": "Noun"}, {"word": "short", "meaning": "pendek", "category": "Noun"}, {"word": "nothing", "meaning": "tidak ada", "category": "Verb"}, {"word": "course", "meaning": "kursus", "category": "Noun"}, {"word": "wind", "meaning": "angin", "category": "Noun"}, {"word": "happen", "meaning": "terjadi", "category": "Noun"}, {"word": "ship", "meaning": "kapal", "category": "Noun"}, {"word": "deep", "meaning": "dalam", "category": "Noun"}, {"word": "island", "meaning": "pulau", "category": "Noun"}, {"word": "busy", "meaning": "sibuk", "category": "Noun"}, {"word": "laugh", "meaning": "tertawa", "category": "Noun"}, {"word": "leave", "meaning": "meninggalkan", "category": "Noun"}, {"word": "half", "meaning": "setengah", "category": "Noun"}, {"word": "full", "meaning": "penuh", "category": "Noun"}, {"word": "soil", "meaning": "tanah", "category": "Noun"}, {"word": "engine", "meaning": "mesin", "category": "Noun"}, {"word": "vary", "meaning": "bervariasi", "category": "Verb"}, {"word": "value", "meaning": "nilai", "category": "Noun"}, {"word": "settle", "meaning": "menetap", "category": "Verb"}, {"word": "weight", "meaning": "berat", "category": "Noun"}, {"word": "general", "meaning": "umum", "category": "Adjective"}, {"word": "excite", "meaning": "menggembirakan", "category": "Noun"}, {"word": "sense", "meaning": "indera", "category": "Noun"}, {"word": "include", "meaning": "termasuk", "category": "Verb"}, {"word": "divide", "meaning": "membagi", "category": "Verb"}, {"word": "perhaps", "meaning": "mungkin", "category": "Adverb"}, {"word": "reason", "meaning": "alasan", "category": "Noun"}, {"word": "represent", "meaning": "mewakili", "category": "Verb"}, {"word": "observe", "meaning": "mengamati", "category": "Verb"}, {"word": "region", "meaning": "wilayah", "category": "Noun"}, {"word": "nation", "meaning": "negara", "category": "Noun"}, {"word": "person", "meaning": "orang", "category": "Noun"}, {"word": "always", "meaning": "selalu", "category": "Noun"}, {"word": "money", "meaning": "uang", "category": "Noun"}, {"word": "against", "meaning": "melawan", "category": "Preposition"}, {"word": "mountain", "meaning": "gunung", "category": "Noun"}, {"word": "war", "meaning": "perang", "category": "Noun"}, {"word": "begin", "meaning": "memulai", "category": "Noun"}, {"word": "lay", "meaning": "meletakkan", "category": "Noun"}, {"word": "both", "meaning": "keduanya", "category": "Noun"}, {"word": "often", "meaning": "sering", "category": "Noun"}, {"word": "letter", "meaning": "surat", "category": "Noun"}, {"word": "carry", "meaning": "membawa", "category": "Verb"}, {"word": "voice", "meaning": "suara", "category": "Noun"}, {"word": "lead", "meaning": "memimpin", "category": "Noun"}, {"word": "idea", "meaning": "gagasan", "category": "Noun"}, {"word": "press", "meaning": "menekan", "category": "Verb"}, {"word": "close", "meaning": "dekat", "category": "Noun"}, {"word": "real", "meaning": "nyata", "category": "Adjective"}, {"word": "under", "meaning": "di bawah", "category": "Noun"}, {"word": "north", "meaning": "utara", "category": "Noun"}, {"word": "state", "meaning": "keadaan", "category": "Verb"}, {"word": "between", "meaning": "antara", "category": "Noun"}, {"word": "thought", "meaning": "pikiran", "category": "Noun"}, {"word": "cover", "meaning": "menutupi", "category": "Noun"}, {"word": "plant", "meaning": "tanaman", "category": "Noun"}, {"word": "over", "meaning": "di atas", "category": "Noun"}, {"word": "been", "meaning": "telah", "category": "Noun"}, {"word": "take", "meaning": "mengambil", "category": "Noun"}, {"word": "made", "meaning": "membuat", "category": "Noun"}, {"word": "might", "meaning": "mungkin", "category": "Noun"}, {"word": "saw", "meaning": "melihat", "category": "Noun"}, {"word": "few", "meaning": "beberapa", "category": "Noun"}, {"word": "ease", "meaning": "memudahkan", "category": "Noun"}, {"word": "pull", "meaning": "menarik", "category": "Verb"}, {"word": "pair", "meaning": "pasangan", "category": "Noun"}, {"word": "else", "meaning": "lain", "category": "Adverb"}, {"word": "felt", "meaning": "merasa", "category": "Verb"}, {"word": "farm", "meaning": "pertanian", "category": "Noun"}, {"word": "grow", "meaning": "tumbuh", "category": "Noun"}, {"word": "tree", "meaning": "pohon", "category": "Noun"}, {"word": "hear", "meaning": "mendengar", "category": "Noun"}, {"word": "took", "meaning": "mengambil", "category": "Noun"}, {"word": "seem", "meaning": "tampak", "category": "Noun"}, {"word": "give", "meaning": "memberi", "category": "Adjective"}, {"word": "little", "meaning": "sedikit", "category": "Noun"}, {"word": "while", "meaning": "sementara", "category": "Noun"}, {"word": "far", "meaning": "jauh", "category": "Noun"}, {"word": "got", "meaning": "mendapatkan", "category": "Noun"}, {"word": "fall", "meaning": "jatuh", "category": "Noun"}, {"word": "experiment", "meaning": "eksperimen", "category": "Noun"}, {"word": "trade", "meaning": "perdagangan", "category": "Noun"}, {"word": "receive", "meaning": "menerima", "category": "Verb"}, {"word": "exact", "meaning": "tepat", "category": "Adjective"}, {"word": "weather", "meaning": "cuaca", "category": "Noun"}, {"word": "million", "meaning": "juta", "category": "Number"}, {"word": "scale", "meaning": "skala", "category": "Noun"}, {"word": "length", "meaning": "panjang", "category": "Noun"}, {"word": "temperature", "meaning": "suhu", "category": "Noun"}, {"word": "fraction", "meaning": "pecahan", "category": "Noun"}, {"word": "prove", "meaning": "membuktikan", "category": "Verb"}, {"word": "single", "meaning": "tunggal", "category": "Adjective"}, {"word": "mount", "meaning": "gunung", "category": "Noun"}, {"word": "iron", "meaning": "besi", "category": "Noun"}, {"word": "crease", "meaning": "lipatan", "category": "Noun"}, {"word": "silent", "meaning": "diam", "category": "Adjective"}, {"word": "probably", "meaning": "mungkin", "category": "Adverb"}, {"word": "straight", "meaning": "lurus", "category": "Adjective"}, {"word": "quiet", "meaning": "tenang", "category": "Adjective"}, {"word": "bottom", "meaning": "bawah", "category": "Noun"}, {"word": "edge", "meaning": "tepi", "category": "Noun"}, {"word": "except", "meaning": "kecuali", "category": "Preposition"}, {"word": "written", "meaning": "tertulis", "category": "Adjective"}, {"word": "present", "meaning": "hadir", "category": "Adjective"}, {"word": "coast", "meaning": "pantai", "category": "Noun"}, {"word": "heavy", "meaning": "berat", "category": "Adjective"}, {"word": "size", "meaning": "ukuran", "category": "Noun"}, {"word": "lie", "meaning": "berbohong", "category": "Verb"}, {"word": "case", "meaning": "kasus", "category": "Noun"}, {"word": "pick", "meaning": "memilih", "category": "Verb"}, {"word": "sudden", "meaning": "tiba-tiba", "category": "Adjective"}, {"word": "count", "meaning": "menghitung", "category": "Verb"}, {"word": "loud", "meaning": "keras", "category": "Adjective"}, {"word": "hunt", "meaning": "berburu", "category": "Verb"}, {"word": "ride", "meaning": "naik", "category": "Verb"}, {"word": "pay", "meaning": "membayar", "category": "Verb"}, {"word": "dress", "meaning": "gaun", "category": "Noun"}, {"word": "tiny", "meaning": "kecil", "category": "Adjective"}, {"word": "climb", "meaning": "memanjat", "category": "Verb"}, {"word": "lone", "meaning": "sendirian", "category": "Adjective"}, {"word": "poor", "meaning": "miskin", "category": "Adjective"}, {"word": "catch", "meaning": "menangkap", "category": "Verb"}, {"word": "flat", "meaning": "datar", "category": "Adjective"}, {"word": "joy", "meaning": "kegembiraan", "category": "Noun"}, {"word": "skin", "meaning": "kulit", "category": "Noun"}, {"word": "wild", "meaning": "liar", "category": "Adjective"}, {"word": "hole", "meaning": "lubang", "category": "Noun"}, {"word": "kept", "meaning": "menyimpan", "category": "Verb"}, {"word": "office", "meaning": "kantor", "category": "Noun"}, {"word": "sign", "meaning": "tanda", "category": "Noun"}, {"word": "least", "meaning": "paling sedikit", "category": "Adverb"}, {"word": "trouble", "meaning": "masalah", "category": "Noun"}, {"word": "bright", "meaning": "terang", "category": "Adjective"}, {"word": "shout", "meaning": "berteriak", "category": "Verb"}, {"word": "seed", "meaning": "benih", "category": "Noun"}, {"word": "indicate", "meaning": "menunjukkan", "category": "Verb"}, {"word": "require", "meaning": "memerlukan", "category": "Verb"}, {"word": "separate", "meaning": "terpisah", "category": "Adjective"}, {"word": "locate", "meaning": "menempatkan", "category": "Verb"}, {"word": "select", "meaning": "memilih", "category": "Verb"}, {"word": "provide", "meaning": "menyediakan", "category": "Verb"}, {"word": "supply", "meaning": "memasok", "category": "Verb"}, {"word": "collect", "meaning": "mengumpulkan", "category": "Verb"}, {"word": "gather", "meaning": "mengumpulkan", "category": "Noun"}, {"word": "prepare", "meaning": "mempersiapkan", "category": "Verb"}, {"word": "protect", "meaning": "melindungi", "category": "Verb"}, {"word": "expect", "meaning": "mengharapkan", "category": "Verb"}, {"word": "suggest", "meaning": "menyarankan", "category": "Verb"}, {"word": "describe", "meaning": "menggambarkan", "category": "Verb"}, {"word": "imagine", "meaning": "membayangkan", "category": "Verb"}, {"word": "stretch", "meaning": "meregangkan", "category": "Noun"}, {"word": "flow", "meaning": "mengalir", "category": "Verb"}, {"word": "equal", "meaning": "sama", "category": "Adjective"}, {"word": "throw", "meaning": "melempar", "category": "Noun"}, {"word": "wear", "meaning": "memakai", "category": "Verb"}, {"word": "share", "meaning": "berbagi", "category": "Noun"}, {"word": "form", "meaning": "membentuk", "category": "Noun"}, {"word": "improve", "meaning": "meningkatkan", "category": "Verb"}, {"word": "increase", "meaning": "meningkatkan", "category": "Noun"}, {"word": "experience", "meaning": "pengalaman", "category": "Noun"}, {"word": "continent", "meaning": "benua", "category": "Noun"}, {"word": "capital", "meaning": "ibu kota", "category": "Noun"}, {"word": "chance", "meaning": "kesempatan", "category": "Noun"}, {"word": "bear", "meaning": "beruang", "category": "Noun"}, {"word": "hope", "meaning": "berharap", "category": "Noun"}, {"word": "break", "meaning": "istirahat", "category": "Verb"}, {"word": "strange", "meaning": "aneh", "category": "Adjective"}, {"word": "rise", "meaning": "naik", "category": "Noun"}, {"word": "gone", "meaning": "pergi hilang", "category": "Noun"}, {"word": "blow", "meaning": "meniup", "category": "Verb"}, {"word": "root", "meaning": "akar", "category": "Noun"}, {"word": "mix", "meaning": "mencampur", "category": "Noun"}, {"word": "raise", "meaning": "meningkatkan", "category": "Verb"}, {"word": "solve", "meaning": "menyelesaikan", "category": "Noun"}, {"word": "write", "meaning": "menulis", "category": "Noun"}, {"word": "whether", "meaning": "apakah", "category": "Conjunction"}, {"word": "lost", "meaning": "tersesat", "category": "Noun"}, {"word": "push", "meaning": "mendorong", "category": "Noun"}, {"word": "shall", "meaning": "akan", "category": "Verb"}, {"word": "sent", "meaning": "dikirim", "category": "Noun"}, {"word": "held", "meaning": "diadakan", "category": "Noun"}, {"word": "choose", "meaning": "memilih", "category": "Noun"}, {"word": "cook", "meaning": "memasak", "category": "Noun"}, {"word": "fair", "meaning": "wajar", "category": "Adjective"}, {"word": "either", "meaning": "salah satu", "category": "Noun"}, {"word": "safe", "meaning": "aman", "category": "Adjective"}, {"word": "noise", "meaning": "bising", "category": "Noun"}, {"word": "shine", "meaning": "bersinar", "category": "Noun"}, {"word": "whose", "meaning": "milik siapa", "category": "Noun"}, {"word": "caught", "meaning": "menangkap", "category": "Verb"}, {"word": "repeat", "meaning": "mengulangi", "category": "Verb"}, {"word": "spoke", "meaning": "berbicara", "category": "Noun"}, {"word": "anger", "meaning": "kemarahan", "category": "Noun"}, {"word": "match", "meaning": "cocok", "category": "Noun"}, {"word": "wont", "meaning": "tidak akan", "category": "Noun"}, {"word": "afraid", "meaning": "takut", "category": "Adjective"}, {"word": "huge", "meaning": "sangat besar", "category": "Adjective"}, {"word": "danger", "meaning": "bahaya", "category": "Noun"}, {"word": "thick", "meaning": "tebal", "category": "Adjective"}, {"word": "forward", "meaning": "ke depan", "category": "Noun"}, {"word": "similar", "meaning": "mirip", "category": "Adjective"}, {"word": "guess", "meaning": "menebak", "category": "Verb"}, {"word": "necessary", "meaning": "perlu", "category": "Adjective"}, {"word": "sharp", "meaning": "tajam", "category": "Noun"}, {"word": "bought", "meaning": "membeli", "category": "Verb"}, {"word": "led", "meaning": "memimpin", "category": "Verb"}, {"word": "pitch", "meaning": "nada", "category": "Noun"}, {"word": "neighbor", "meaning": "tetangga", "category": "Noun"}, {"word": "rather", "meaning": "lebih", "category": "Adverb"}, {"word": "crowd", "meaning": "kerumunan", "category": "Noun"}, {"word": "rope", "meaning": "tali", "category": "Noun"}, {"word": "corn", "meaning": "jagung", "category": "Noun"}, {"word": "slip", "meaning": "terpeleset", "category": "Verb"}, {"word": "compare", "meaning": "membandingkan", "category": "Verb"}, {"word": "dream", "meaning": "mimpi", "category": "Noun"}, {"word": "string", "meaning": "benang", "category": "Verb"}, {"word": "depend", "meaning": "bergantung", "category": "Verb"}, {"word": "feed", "meaning": "memberi makan", "category": "Noun"}, {"word": "meat", "meaning": "daging", "category": "Noun"}, {"word": "rub", "meaning": "menggosok", "category": "Noun"}, {"word": "famous", "meaning": "terkenal", "category": "Adjective"}, {"word": "smell", "meaning": "mencium bau", "category": "Noun"}, {"word": "nor", "meaning": "maupun", "category": "Conjunction"}, {"word": "fear", "meaning": "takut", "category": "Noun"}, {"word": "sight", "meaning": "penglihatan", "category": "Noun"}, {"word": "thin", "meaning": "tipis", "category": "Adjective"}, {"word": "arrive", "meaning": "tiba", "category": "Verb"}, {"word": "track", "meaning": "jalur", "category": "Noun"}, {"word": "hurry", "meaning": "buru-buru", "category": "Noun"}, {"word": "mine", "meaning": "milikku", "category": "Noun"}, {"word": "tie", "meaning": "mengikat", "category": "Verb"}, {"word": "favor", "meaning": "bantuan", "category": "Noun"}, {"word": "major", "meaning": "utama", "category": "Adjective"}, {"word": "spend", "meaning": "menghabiskan", "category": "Noun"}, {"word": "glad", "meaning": "senang", "category": "Noun"}, {"word": "allow", "meaning": "mengizinkan", "category": "Noun"}, {"word": "charge", "meaning": "biaya", "category": "Noun"}, {"word": "suit", "meaning": "jas", "category": "Noun"}, {"word": "current", "meaning": "saat ini", "category": "Adjective"}, {"word": "lift", "meaning": "mengangkat", "category": "Noun"}, {"word": "offer", "meaning": "menawarkan", "category": "Noun"}, {"word": "chick", "meaning": "anak ayam", "category": "Noun"}, {"word": "enemy", "meaning": "musuh", "category": "Noun"}, {"word": "particular", "meaning": "khusus", "category": "Adjective"}, {"word": "occur", "meaning": "terjadi", "category": "Noun"}, {"word": "opposite", "meaning": "kebalikan", "category": "Noun"}, {"word": "spread", "meaning": "menyebar", "category": "Verb"}, {"word": "arrange", "meaning": "mengatur", "category": "Verb"}, {"word": "invent", "meaning": "menemukan", "category": "Verb"}, {"word": "meant", "meaning": "berarti", "category": "Verb"}, {"word": "born", "meaning": "lahir", "category": "Verb"}, {"word": "determine", "meaning": "menentukan", "category": "Verb"}];
const DB_ID = [{"word": "memerintah", "meaning": "govern"}, {"word": "huruf vokal", "meaning": "vowel"}, {"word": "kata benda", "meaning": "noun"}, {"word": "pola", "meaning": "pattern"}, {"word": "angka", "meaning": "figure"}, {"word": "pasti", "meaning": "certain"}, {"word": "ilmu pengetahuan", "meaning": "science"}, {"word": "mesin", "meaning": "machine"}, {"word": "contoh", "meaning": "example"}, {"word": "melayani", "meaning": "serve"}, {"word": "muncul", "meaning": "appear"}, {"word": "menuju", "meaning": "toward"}, {"word": "beberapa", "meaning": "several"}, {"word": "dasar", "meaning": "base"}, {"word": "tanda", "meaning": "mark"}, {"word": "aturan", "meaning": "rule"}, {"word": "pemberitahuan", "meaning": "notice"}, {"word": "kekuatan", "meaning": "power"}, {"word": "pusat", "meaning": "center"}, {"word": "mengandung", "meaning": "contain"}, {"word": "biasa", "meaning": "usual"}, {"word": "mengembangkan", "meaning": "develop"}, {"word": "langsung", "meaning": "direct"}, {"word": "mengukur", "meaning": "measure"}, {"word": "menghasilkan", "meaning": "produce"}, {"word": "produk", "meaning": "product"}, {"word": "mengalikan", "meaning": "multiply"}, {"word": "lengkap", "meaning": "complete"}, {"word": "permukaan", "meaning": "surface"}, {"word": "catatan", "meaning": "record"}, {"word": "mungkin", "meaning": "possible"}, {"word": "keajaiban", "meaning": "wonder"}, {"word": "menyamakan", "meaning": "equate"}, {"word": "minat", "meaning": "interest"}, {"word": "mencapai", "meaning": "reach"}, {"word": "jauh", "meaning": "distant"}, {"word": "mempertimbangkan", "meaning": "consider"}, {"word": "abad", "meaning": "century"}, {"word": "bahasa", "meaning": "language"}, {"word": "di antara", "meaning": "among"}, {"word": "meskipun", "meaning": "though"}, {"word": "memutuskan", "meaning": "decide"}, {"word": "masalah", "meaning": "problem"}, {"word": "kemungkinan", "meaning": "probable"}, {"word": "bagian", "meaning": "section"}, {"word": "hutan", "meaning": "forest"}, {"word": "kejutan", "meaning": "surprise"}, {"word": "latihan", "meaning": "exercise"}, {"word": "bidang", "meaning": "field"}, {"word": "istirahat", "meaning": "rest"}, {"word": "benar", "meaning": "correct"}, {"word": "mampu", "meaning": "able"}, {"word": "keindahan", "meaning": "beauty"}, {"word": "cukup", "meaning": "enough"}, {"word": "polos", "meaning": "plain"}, {"word": "berdiri", "meaning": "stood"}, {"word": "depan", "meaning": "front"}, {"word": "siap", "meaning": "ready"}, {"word": "cepat", "meaning": "quick"}, {"word": "lautan", "meaning": "ocean"}, {"word": "hangat", "meaning": "warm"}, {"word": "menit", "meaning": "minute"}, {"word": "kuat", "meaning": "strong"}, {"word": "di belakang", "meaning": "behind"}, {"word": "jelas", "meaning": "clear"}, {"word": "fakta", "meaning": "fact"}, {"word": "jalan", "meaning": "street"}, {"word": "pendek", "meaning": "short"}, {"word": "tidak ada", "meaning": "nothing"}, {"word": "kursus", "meaning": "course"}, {"word": "angin", "meaning": "wind"}, {"word": "terjadi", "meaning": "happen"}, {"word": "kapal", "meaning": "ship"}, {"word": "dalam", "meaning": "deep"}, {"word": "pulau", "meaning": "island"}, {"word": "sibuk", "meaning": "busy"}, {"word": "tertawa", "meaning": "laugh"}, {"word": "meninggalkan", "meaning": "leave"}, {"word": "setengah", "meaning": "half"}, {"word": "penuh", "meaning": "full"}, {"word": "tanah", "meaning": "soil"}, {"word": "mesin", "meaning": "engine"}, {"word": "bervariasi", "meaning": "vary"}, {"word": "nilai", "meaning": "value"}, {"word": "menetap", "meaning": "settle"}, {"word": "berat", "meaning": "weight"}, {"word": "umum", "meaning": "general"}, {"word": "menggembirakan", "meaning": "excite"}, {"word": "indera", "meaning": "sense"}, {"word": "termasuk", "meaning": "include"}, {"word": "membagi", "meaning": "divide"}, {"word": "alasan", "meaning": "reason"}, {"word": "mewakili", "meaning": "represent"}, {"word": "mengamati", "meaning": "observe"}, {"word": "wilayah", "meaning": "region"}, {"word": "negara", "meaning": "nation"}, {"word": "orang", "meaning": "person"}, {"word": "selalu", "meaning": "always"}, {"word": "uang", "meaning": "money"}, {"word": "melawan", "meaning": "against"}, {"word": "gunung", "meaning": "mountain"}, {"word": "perang", "meaning": "war"}, {"word": "memulai", "meaning": "begin"}, {"word": "meletakkan", "meaning": "lay"}, {"word": "keduanya", "meaning": "both"}, {"word": "sering", "meaning": "often"}, {"word": "surat", "meaning": "letter"}, {"word": "membawa", "meaning": "carry"}, {"word": "suara", "meaning": "voice"}, {"word": "memimpin", "meaning": "lead"}, {"word": "gagasan", "meaning": "idea"}, {"word": "menekan", "meaning": "press"}, {"word": "dekat", "meaning": "close"}, {"word": "nyata", "meaning": "real"}, {"word": "di bawah", "meaning": "under"}, {"word": "utara", "meaning": "north"}, {"word": "keadaan", "meaning": "state"}, {"word": "antara", "meaning": "between"}, {"word": "pikiran", "meaning": "thought"}, {"word": "menutupi", "meaning": "cover"}, {"word": "tanaman", "meaning": "plant"}, {"word": "di atas", "meaning": "over"}, {"word": "telah", "meaning": "been"}, {"word": "mengambil", "meaning": "take"}, {"word": "membuat", "meaning": "made"}, {"word": "melihat", "meaning": "saw"}, {"word": "memudahkan", "meaning": "ease"}, {"word": "menarik", "meaning": "pull"}, {"word": "pasangan", "meaning": "pair"}, {"word": "lain", "meaning": "else"}, {"word": "merasa", "meaning": "felt"}, {"word": "pertanian", "meaning": "farm"}, {"word": "tumbuh", "meaning": "grow"}, {"word": "pohon", "meaning": "tree"}, {"word": "mendengar", "meaning": "hear"}, {"word": "tampak", "meaning": "seem"}, {"word": "memberi", "meaning": "give"}, {"word": "sedikit", "meaning": "little"}, {"word": "sementara", "meaning": "while"}, {"word": "mendapatkan", "meaning": "got"}, {"word": "jatuh", "meaning": "fall"}, {"word": "eksperimen", "meaning": "experiment"}, {"word": "perdagangan", "meaning": "trade"}, {"word": "menerima", "meaning": "receive"}, {"word": "tepat", "meaning": "exact"}, {"word": "cuaca", "meaning": "weather"}, {"word": "juta", "meaning": "million"}, {"word": "skala", "meaning": "scale"}, {"word": "panjang", "meaning": "length"}, {"word": "suhu", "meaning": "temperature"}, {"word": "pecahan", "meaning": "fraction"}, {"word": "membuktikan", "meaning": "prove"}, {"word": "tunggal", "meaning": "single"}, {"word": "besi", "meaning": "iron"}, {"word": "lipatan", "meaning": "crease"}, {"word": "diam", "meaning": "silent"}, {"word": "lurus", "meaning": "straight"}, {"word": "tenang", "meaning": "quiet"}, {"word": "bawah", "meaning": "bottom"}, {"word": "tepi", "meaning": "edge"}, {"word": "kecuali", "meaning": "except"}, {"word": "tertulis", "meaning": "written"}, {"word": "hadir", "meaning": "present"}, {"word": "pantai", "meaning": "coast"}, {"word": "berat", "meaning": "heavy"}, {"word": "ukuran", "meaning": "size"}, {"word": "berbohong", "meaning": "lie"}, {"word": "kasus", "meaning": "case"}, {"word": "memilih", "meaning": "pick"}, {"word": "tiba-tiba", "meaning": "sudden"}, {"word": "menghitung", "meaning": "count"}, {"word": "keras", "meaning": "loud"}, {"word": "berburu", "meaning": "hunt"}, {"word": "naik", "meaning": "ride"}, {"word": "membayar", "meaning": "pay"}, {"word": "gaun", "meaning": "dress"}, {"word": "kecil", "meaning": "tiny"}, {"word": "memanjat", "meaning": "climb"}, {"word": "sendirian", "meaning": "lone"}, {"word": "miskin", "meaning": "poor"}, {"word": "menangkap", "meaning": "catch"}, {"word": "datar", "meaning": "flat"}, {"word": "kegembiraan", "meaning": "joy"}, {"word": "kulit", "meaning": "skin"}, {"word": "liar", "meaning": "wild"}, {"word": "lubang", "meaning": "hole"}, {"word": "menyimpan", "meaning": "kept"}, {"word": "kantor", "meaning": "office"}, {"word": "tanda", "meaning": "sign"}, {"word": "paling sedikit", "meaning": "least"}, {"word": "masalah", "meaning": "trouble"}, {"word": "terang", "meaning": "bright"}, {"word": "berteriak", "meaning": "shout"}, {"word": "benih", "meaning": "seed"}, {"word": "menunjukkan", "meaning": "indicate"}, {"word": "memerlukan", "meaning": "require"}, {"word": "terpisah", "meaning": "separate"}, {"word": "menempatkan", "meaning": "locate"}, {"word": "menyediakan", "meaning": "provide"}, {"word": "memasok", "meaning": "supply"}, {"word": "mengumpulkan", "meaning": "collect"}, {"word": "mempersiapkan", "meaning": "prepare"}, {"word": "melindungi", "meaning": "protect"}, {"word": "mengharapkan", "meaning": "expect"}, {"word": "menyarankan", "meaning": "suggest"}, {"word": "menggambarkan", "meaning": "describe"}, {"word": "membayangkan", "meaning": "imagine"}, {"word": "meregangkan", "meaning": "stretch"}, {"word": "mengalir", "meaning": "flow"}, {"word": "sama", "meaning": "equal"}, {"word": "melempar", "meaning": "throw"}, {"word": "memakai", "meaning": "wear"}, {"word": "berbagi", "meaning": "share"}, {"word": "membentuk", "meaning": "form"}, {"word": "meningkatkan", "meaning": "improve"}, {"word": "pengalaman", "meaning": "experience"}, {"word": "benua", "meaning": "continent"}, {"word": "ibu kota", "meaning": "capital"}, {"word": "kesempatan", "meaning": "chance"}, {"word": "beruang", "meaning": "bear"}, {"word": "berharap", "meaning": "hope"}, {"word": "aneh", "meaning": "strange"}, {"word": "meniup", "meaning": "blow"}, {"word": "akar", "meaning": "root"}, {"word": "mencampur", "meaning": "mix"}, {"word": "menyelesaikan", "meaning": "solve"}, {"word": "menulis", "meaning": "write"}, {"word": "apakah", "meaning": "whether"}, {"word": "tersesat", "meaning": "lost"}, {"word": "mendorong", "meaning": "push"}, {"word": "akan", "meaning": "shall"}, {"word": "dikirim", "meaning": "sent"}, {"word": "diadakan", "meaning": "held"}, {"word": "memasak", "meaning": "cook"}, {"word": "wajar", "meaning": "fair"}, {"word": "salah satu", "meaning": "either"}, {"word": "aman", "meaning": "safe"}, {"word": "bising", "meaning": "noise"}, {"word": "bersinar", "meaning": "shine"}, {"word": "milik siapa", "meaning": "whose"}, {"word": "mengulangi", "meaning": "repeat"}, {"word": "berbicara", "meaning": "spoke"}, {"word": "kemarahan", "meaning": "anger"}, {"word": "cocok", "meaning": "match"}, {"word": "tidak akan", "meaning": "wont"}, {"word": "takut", "meaning": "afraid"}, {"word": "sangat besar", "meaning": "huge"}, {"word": "bahaya", "meaning": "danger"}, {"word": "tebal", "meaning": "thick"}, {"word": "ke depan", "meaning": "forward"}, {"word": "mirip", "meaning": "similar"}, {"word": "menebak", "meaning": "guess"}, {"word": "perlu", "meaning": "necessary"}, {"word": "tajam", "meaning": "sharp"}, {"word": "membeli", "meaning": "bought"}, {"word": "nada", "meaning": "pitch"}, {"word": "tetangga", "meaning": "neighbor"}, {"word": "lebih", "meaning": "rather"}, {"word": "kerumunan", "meaning": "crowd"}, {"word": "tali", "meaning": "rope"}, {"word": "jagung", "meaning": "corn"}, {"word": "terpeleset", "meaning": "slip"}, {"word": "membandingkan", "meaning": "compare"}, {"word": "mimpi", "meaning": "dream"}, {"word": "benang", "meaning": "string"}, {"word": "bergantung", "meaning": "depend"}, {"word": "memberi makan", "meaning": "feed"}, {"word": "daging", "meaning": "meat"}, {"word": "menggosok", "meaning": "rub"}, {"word": "terkenal", "meaning": "famous"}, {"word": "mencium bau", "meaning": "smell"}, {"word": "maupun", "meaning": "nor"}, {"word": "penglihatan", "meaning": "sight"}, {"word": "tipis", "meaning": "thin"}, {"word": "tiba", "meaning": "arrive"}, {"word": "jalur", "meaning": "track"}, {"word": "buru-buru", "meaning": "hurry"}, {"word": "milikku", "meaning": "mine"}, {"word": "mengikat", "meaning": "tie"}, {"word": "bantuan", "meaning": "favor"}, {"word": "utama", "meaning": "major"}, {"word": "menghabiskan", "meaning": "spend"}, {"word": "senang", "meaning": "glad"}, {"word": "mengizinkan", "meaning": "allow"}, {"word": "biaya", "meaning": "charge"}, {"word": "jas", "meaning": "suit"}, {"word": "saat ini", "meaning": "current"}, {"word": "mengangkat", "meaning": "lift"}, {"word": "menawarkan", "meaning": "offer"}, {"word": "anak ayam", "meaning": "chick"}, {"word": "musuh", "meaning": "enemy"}, {"word": "khusus", "meaning": "particular"}, {"word": "kebalikan", "meaning": "opposite"}, {"word": "menyebar", "meaning": "spread"}, {"word": "mengatur", "meaning": "arrange"}, {"word": "menemukan", "meaning": "invent"}, {"word": "berarti", "meaning": "meant"}, {"word": "lahir", "meaning": "born"}, {"word": "menentukan", "meaning": "determine"}];
const INIT_ARTICLES = [];
const INIT_AV = [];
const INIT_QUIZ = [];
const DB_AWL = [{"en":"analyse","id":"menganalisis","category":"Verb"},{"en":"approach","id":"pendekatan","category":"Noun"},{"en":"assess","id":"menilai","category":"Verb"},{"en":"assume","id":"mengasumsikan","category":"Verb"},{"en":"authority","id":"otoritas","category":"Noun"},{"en":"available","id":"tersedia","category":"Adjective"},{"en":"benefit","id":"manfaat","category":"Noun"},{"en":"concept","id":"konsep","category":"Noun"},{"en":"consist","id":"terdiri","category":"Verb"},{"en":"constitute","id":"membentuk","category":"Verb"},{"en":"contract","id":"kontrak","category":"Noun"},{"en":"create","id":"menciptakan","category":"Verb"},{"en":"define","id":"mendefinisikan","category":"Verb"},{"en":"derive","id":"mendapatkan","category":"Verb"},{"en":"distribute","id":"mendistribusikan","category":"Verb"},{"en":"environment","id":"lingkungan","category":"Noun"},{"en":"establish","id":"mendirikan","category":"Verb"},{"en":"estimate","id":"memperkirakan","category":"Verb"},{"en":"evident","id":"jelas","category":"Adjective"},{"en":"finance","id":"keuangan","category":"Noun"},{"en":"formula","id":"rumus","category":"Noun"},{"en":"identify","id":"mengidentifikasi","category":"Verb"},{"en":"income","id":"pendapatan","category":"Noun"},{"en":"indicate","id":"menunjukkan","category":"Verb"},{"en":"interpret","id":"menafsirkan","category":"Verb"},{"en":"involve","id":"melibatkan","category":"Verb"},{"en":"issue","id":"isu","category":"Noun"},{"en":"labour","id":"tenaga kerja","category":"Noun"},{"en":"legislate","id":"membuat undang-undang","category":"Verb"},{"en":"major","id":"utama","category":"Adjective"},{"en":"occur","id":"terjadi","category":"Verb"},{"en":"policy","id":"kebijakan","category":"Noun"},{"en":"principle","id":"prinsip","category":"Noun"},{"en":"proceed","id":"melanjutkan","category":"Verb"},{"en":"require","id":"memerlukan","category":"Verb"},{"en":"research","id":"penelitian","category":"Noun"},{"en":"respond","id":"merespon","category":"Verb"},{"en":"role","id":"peran","category":"Noun"},{"en":"section","id":"bagian","category":"Noun"},{"en":"similar","id":"mirip","category":"Adjective"},{"en":"source","id":"sumber","category":"Noun"},{"en":"vary","id":"bervariasi","category":"Verb"},{"en":"achieve","id":"mencapai","category":"Verb"},{"en":"acquire","id":"memperoleh","category":"Verb"},{"en":"administrate","id":"mengadministrasikan","category":"Verb"},{"en":"affect","id":"mempengaruhi","category":"Verb"},{"en":"appropriate","id":"sesuai","category":"Adjective"},{"en":"assist","id":"membantu","category":"Verb"},{"en":"chapter","id":"bab","category":"Noun"},{"en":"compute","id":"menghitung","category":"Verb"},{"en":"conclude","id":"menyimpulkan","category":"Verb"},{"en":"conduct","id":"melakukan","category":"Verb"},{"en":"consequent","id":"konsekuen","category":"Adjective"},{"en":"construct","id":"membangun","category":"Verb"},{"en":"consume","id":"mengkonsumsi","category":"Verb"},{"en":"culture","id":"budaya","category":"Noun"},{"en":"distinct","id":"berbeda","category":"Adjective"},{"en":"element","id":"elemen","category":"Noun"},{"en":"equate","id":"menyamakan","category":"Verb"},{"en":"evaluate","id":"mengevaluasi","category":"Verb"},{"en":"final","id":"akhir","category":"Adjective"},{"en":"impact","id":"dampak","category":"Noun"},{"en":"institute","id":"institut","category":"Noun"},{"en":"invest","id":"berinvestasi","category":"Verb"},{"en":"journal","id":"jurnal","category":"Noun"},{"en":"maintain","id":"mempertahankan","category":"Verb"},{"en":"obtain","id":"mendapatkan","category":"Verb"},{"en":"participate","id":"berpartisipasi","category":"Verb"},{"en":"perceive","id":"mempersepsikan","category":"Verb"},{"en":"previous","id":"sebelumnya","category":"Adjective"},{"en":"primary","id":"utama","category":"Adjective"},{"en":"purchase","id":"pembelian","category":"Noun"},{"en":"range","id":"rentang","category":"Noun"},{"en":"region","id":"wilayah","category":"Noun"},{"en":"regulate","id":"mengatur","category":"Verb"},{"en":"reside","id":"bertempat tinggal","category":"Verb"},{"en":"resource","id":"sumber daya","category":"Noun"},{"en":"restrict","id":"membatasi","category":"Verb"},{"en":"secure","id":"mengamankan","category":"Verb"},{"en":"seek","id":"mencari","category":"Verb"},{"en":"select","id":"memilih","category":"Verb"},{"en":"site","id":"lokasi","category":"Noun"},{"en":"circumstance","id":"keadaan","category":"Noun"},{"en":"compensate","id":"mengganti rugi","category":"Verb"},{"en":"consent","id":"persetujuan","category":"Noun"},{"en":"considerable","id":"cukup besar","category":"Adjective"},{"en":"constant","id":"konstan","category":"Adjective"},{"en":"constrain","id":"membatasi","category":"Verb"},{"en":"contribute","id":"berkontribusi","category":"Verb"},{"en":"coordinate","id":"mengoordinasikan","category":"Verb"},{"en":"core","id":"inti","category":"Noun"},{"en":"corporate","id":"perusahaan","category":"Adjective"},{"en":"correspond","id":"berkorespondensi","category":"Verb"},{"en":"deduce","id":"menyimpulkan","category":"Verb"},{"en":"demonstrate","id":"mendemonstrasikan","category":"Verb"},{"en":"dominate","id":"mendominasi","category":"Verb"},{"en":"emphasis","id":"penekanan","category":"Noun"},{"en":"ensure","id":"memastikan","category":"Verb"},{"en":"exclude","id":"mengecualikan","category":"Verb"},{"en":"framework","id":"kerangka kerja","category":"Noun"},{"en":"fund","id":"dana","category":"Noun"},{"en":"illustrate","id":"mengilustrasikan","category":"Verb"},{"en":"immigrate","id":"berimigrasi","category":"Verb"},{"en":"imply","id":"menyiratkan","category":"Verb"},{"en":"initial","id":"awal","category":"Adjective"},{"en":"instance","id":"contoh","category":"Noun"},{"en":"interact","id":"berinteraksi","category":"Verb"},{"en":"justify","id":"membenarkan","category":"Verb"},{"en":"layer","id":"lapisan","category":"Noun"},{"en":"link","id":"tautan","category":"Noun"},{"en":"locate","id":"menemukan lokasi","category":"Verb"},{"en":"maximise","id":"memaksimalkan","category":"Verb"},{"en":"minor","id":"kecil","category":"Adjective"},{"en":"negate","id":"meniadakan","category":"Verb"},{"en":"outcome","id":"hasil","category":"Noun"},{"en":"partner","id":"mitra","category":"Noun"},{"en":"philosophy","id":"filsafat","category":"Noun"},{"en":"physical","id":"fisik","category":"Adjective"},{"en":"publish","id":"menerbitkan","category":"Verb"},{"en":"react","id":"bereaksi","category":"Verb"},{"en":"register","id":"mendaftar","category":"Verb"},{"en":"rely","id":"bergantung","category":"Verb"},{"en":"remove","id":"menghapus","category":"Verb"},{"en":"scheme","id":"skema","category":"Noun"},{"en":"sequence","id":"urutan","category":"Noun"},{"en":"shift","id":"pergeseran","category":"Noun"},{"en":"specify","id":"menentukan","category":"Verb"},{"en":"sufficient","id":"cukup","category":"Adjective"},{"en":"task","id":"tugas","category":"Noun"},{"en":"adequate","id":"memadai","category":"Adjective"},{"en":"annual","id":"tahunan","category":"Adjective"},{"en":"apparent","id":"tampak","category":"Adjective"},{"en":"approximate","id":"kira-kira","category":"Adjective"},{"en":"attitude","id":"sikap","category":"Noun"},{"en":"civil","id":"sipil","category":"Adjective"},{"en":"commit","id":"melakukan","category":"Verb"},{"en":"communicate","id":"berkomunikasi","category":"Verb"},{"en":"concentrate","id":"berkonsentrasi","category":"Verb"},{"en":"confer","id":"memberikan","category":"Verb"},{"en":"contrast","id":"kontras","category":"Noun"},{"en":"cycle","id":"siklus","category":"Noun"},{"en":"despite","id":"meskipun","category":"Preposition"},{"en":"emerge","id":"muncul","category":"Verb"},{"en":"error","id":"kesalahan","category":"Noun"},{"en":"goal","id":"tujuan","category":"Noun"},{"en":"grant","id":"hibah","category":"Noun"},{"en":"hence","id":"karena itu","category":"Adverb"},{"en":"hypothesis","id":"hipotesis","category":"Noun"},{"en":"implement","id":"menerapkan","category":"Verb"},{"en":"implicate","id":"melibatkan","category":"Verb"},{"en":"impose","id":"memaksakan","category":"Verb"},{"en":"integrate","id":"mengintegrasikan","category":"Verb"},{"en":"investigate","id":"menyelidiki","category":"Verb"},{"en":"job","id":"pekerjaan","category":"Noun"},{"en":"mechanism","id":"mekanisme","category":"Noun"},{"en":"obvious","id":"jelas","category":"Adjective"},{"en":"occupy","id":"menempati","category":"Verb"},{"en":"option","id":"pilihan","category":"Noun"},{"en":"output","id":"keluaran","category":"Noun"},{"en":"overall","id":"keseluruhan","category":"Adjective"},{"en":"parallel","id":"paralel","category":"Adjective"},{"en":"phase","id":"fase","category":"Noun"},{"en":"predict","id":"memprediksi","category":"Verb"},{"en":"principal","id":"kepala sekolah","category":"Noun"},{"en":"prior","id":"sebelumnya","category":"Adjective"},{"en":"promote","id":"mempromosikan","category":"Verb"},{"en":"regime","id":"rezim","category":"Noun"},{"en":"resolve","id":"menyelesaikan","category":"Verb"},{"en":"retain","id":"mempertahankan","category":"Verb"},{"en":"series","id":"seri","category":"Noun"},{"en":"statistic","id":"statistik","category":"Noun"},{"en":"status","id":"status","category":"Noun"},{"en":"stress","id":"stres","category":"Noun"},{"en":"subsequent","id":"berikutnya","category":"Adjective"},{"en":"sum","id":"jumlah","category":"Noun"},{"en":"summary","id":"ringkasan","category":"Noun"},{"en":"undertake","id":"melakukan","category":"Verb"},{"en":"adjust","id":"menyesuaikan","category":"Verb"},{"en":"alter","id":"mengubah","category":"Verb"},{"en":"amend","id":"mengamandemen","category":"Verb"},{"en":"aware","id":"sadar","category":"Adjective"},{"en":"challenge","id":"tantangan","category":"Noun"},{"en":"clause","id":"klausul","category":"Noun"},{"en":"compound","id":"senyawa","category":"Noun"},{"en":"consult","id":"berkonsultasi","category":"Verb"},{"en":"decline","id":"menurun","category":"Verb"},{"en":"discrete","id":"diskrit","category":"Adjective"},{"en":"enable","id":"memungkinkan","category":"Verb"},{"en":"enforce","id":"menegakkan","category":"Verb"},{"en":"entity","id":"entitas","category":"Noun"},{"en":"equivalent","id":"ekuivalen","category":"Adjective"},{"en":"evolve","id":"berevolusi","category":"Verb"},{"en":"expand","id":"memperluas","category":"Verb"},{"en":"expose","id":"mengekspos","category":"Verb"},{"en":"generate","id":"menghasilkan","category":"Verb"},{"en":"generation","id":"generasi","category":"Noun"},{"en":"image","id":"citra","category":"Noun"},{"en":"modify","id":"memodifikasi","category":"Verb"},{"en":"network","id":"jaringan","category":"Noun"},{"en":"notion","id":"gagasan","category":"Noun"},{"en":"orient","id":"berorientasi","category":"Verb"},{"en":"precise","id":"presisi","category":"Adjective"},{"en":"prime","id":"prima","category":"Adjective"},{"en":"pursue","id":"mengejar","category":"Verb"},{"en":"reject","id":"menolak","category":"Verb"},{"en":"revenue","id":"pendapatan","category":"Noun"},{"en":"style","id":"gaya","category":"Noun"},{"en":"substitute","id":"pengganti","category":"Noun"},{"en":"sustain","id":"mempertahankan","category":"Verb"},{"en":"welfare","id":"kesejahteraan","category":"Noun"},{"en":"whereas","id":"sedangkan","category":"Conjunction"},{"en":"acknowledge","id":"mengakui","category":"Verb"},{"en":"allocate","id":"mengalokasikan","category":"Verb"},{"en":"assign","id":"menugaskan","category":"Verb"},{"en":"attach","id":"melampirkan","category":"Verb"},{"en":"author","id":"penulis","category":"Noun"},{"en":"bond","id":"obligasi","category":"Noun"},{"en":"brief","id":"singkat","category":"Adjective"},{"en":"cite","id":"mengutip","category":"Verb"},{"en":"cooperate","id":"bekerja sama","category":"Verb"},{"en":"display","id":"menampilkan","category":"Verb"},{"en":"diverse","id":"beragam","category":"Adjective"},{"en":"enhance","id":"meningkatkan","category":"Verb"},{"en":"estate","id":"perkebunan","category":"Noun"},{"en":"exceed","id":"melebihi","category":"Verb"},{"en":"expert","id":"ahli","category":"Noun"},{"en":"fee","id":"biaya","category":"Noun"},{"en":"furthermore","id":"selain itu","category":"Adverb"},{"en":"ignorant","id":"bodoh","category":"Adjective"},{"en":"inhibit","id":"menghambat","category":"Verb"},{"en":"initiate","id":"memulai","category":"Verb"},{"en":"lecture","id":"kuliah","category":"Noun"},{"en":"migrate","id":"bermigrasi","category":"Verb"},{"en":"ministry","id":"kementerian","category":"Noun"},{"en":"nevertheless","id":"namun","category":"Adverb"},{"en":"overseas","id":"luar negeri","category":"Adjective"},{"en":"precede","id":"mendahului","category":"Verb"},{"en":"presume","id":"menganggap","category":"Verb"},{"en":"recover","id":"pulih","category":"Verb"},{"en":"reveal","id":"mengungkapkan","category":"Verb"},{"en":"trace","id":"jejak","category":"Noun"},{"en":"underlie","id":"mendasari","category":"Verb"},{"en":"utilise","id":"memanfaatkan","category":"Verb"},{"en":"adapt","id":"beradaptasi","category":"Verb"},{"en":"adult","id":"dewasa","category":"Noun"},{"en":"advocate","id":"memperjuangkan","category":"Noun"},{"en":"aid","id":"bantuan","category":"Noun"},{"en":"channel","id":"saluran","category":"Noun"},{"en":"chemical","id":"kimia","category":"Noun"},{"en":"comprise","id":"terdiri dari","category":"Verb"},{"en":"contrary","id":"sebaliknya","category":"Adjective"},{"en":"convert","id":"mengonversi","category":"Verb"},{"en":"couple","id":"pasangan","category":"Noun"},{"en":"definite","id":"pasti/jelas","category":"Adjective"},{"en":"deny","id":"menyangkal","category":"Verb"},{"en":"differentiate","id":"membedakan","category":"Verb"},{"en":"dispose","id":"membuang","category":"Verb"},{"en":"eliminate","id":"mengeliminasi","category":"Verb"},{"en":"equip","id":"melengkapi","category":"Verb"},{"en":"extract","id":"mengekstrak","category":"Verb"},{"en":"file","id":"berkas","category":"Noun"},{"en":"finite","id":"terbatas","category":"Adjective"},{"en":"grade","id":"nilai","category":"Noun"},{"en":"infer","id":"menyimpulkan","category":"Verb"},{"en":"insert","id":"menyisipkan","category":"Verb"},{"en":"prohibit","id":"melarang","category":"Verb"},{"en":"quote","id":"kutipan","category":"Noun"},{"en":"release","id":"melepaskan","category":"Verb"},{"en":"reverse","id":"membalikkan","category":"Verb"},{"en":"sole","id":"tunggal","category":"Adjective"},{"en":"somewhat","id":"agak","category":"Adverb"},{"en":"submit","id":"menyerahkan","category":"Verb"},{"en":"successor","id":"penerus","category":"Noun"},{"en":"survive","id":"bertahan","category":"Verb"},{"en":"ultimate","id":"penghabisan","category":"Adjective"},{"en":"visible","id":"terlihat","category":"Adjective"},{"en":"voluntary","id":"sukarela","category":"Adjective"},{"en":"abandon","id":"meninggalkan","category":"Verb"},{"en":"accompany","id":"menemani","category":"Verb"},{"en":"append","id":"menambahkan","category":"Verb"},{"en":"appreciate","id":"menghargai","category":"Verb"},{"en":"automate","id":"mengotomatisasi","category":"Verb"},{"en":"chart","id":"bagan","category":"Noun"},{"en":"complement","id":"melengkapi","category":"Verb"},{"en":"conform","id":"mematuhi","category":"Verb"},{"en":"contradict","id":"bertentangan dengan","category":"Verb"},{"en":"currency","id":"mata uang","category":"Noun"},{"en":"denote","id":"menandakan","category":"Verb"},{"en":"deviate","id":"menyimpang","category":"Verb"},{"en":"displace","id":"menggusur","category":"Verb"},{"en":"eventual","id":"akhirnya","category":"Adjective"},{"en":"guideline","id":"pedoman","category":"Noun"},{"en":"highlight","id":"menyoroti","category":"Verb"},{"en":"induce","id":"menginduksi","category":"Verb"},{"en":"inevitable","id":"tak bisa dihindari","category":"Adjective"},{"en":"inspect","id":"memeriksa","category":"Verb"},{"en":"minimise","id":"meminimalkan","category":"Verb"},{"en":"offset","id":"mengimbangi","category":"Verb"},{"en":"practitioner","id":"praktisi","category":"Noun"},{"en":"predominant","id":"utama","category":"Adjective"},{"en":"reinforce","id":"memperkuat","category":"Verb"},{"en":"restore","id":"memulihkan","category":"Verb"},{"en":"tense","id":"tegang","category":"Adjective"},{"en":"terminate","id":"mengakhiri","category":"Verb"},{"en":"thereby","id":"dengan demikian","category":"Adverb"},{"en":"uniform","id":"seragam","category":"Noun"},{"en":"vehicle","id":"kendaraan","category":"Noun"},{"en":"widespread","id":"meluas","category":"Adjective"},{"en":"assure","id":"meyakinkan","category":"Verb"},{"en":"attain","id":"mencapai","category":"Verb"},{"en":"behalf","id":"nama (atas nama)","category":"Noun"},{"en":"bulk","id":"massal","category":"Noun"},{"en":"cease","id":"berhenti","category":"Verb"},{"en":"coincide","id":"bertepatan","category":"Verb"},{"en":"commence","id":"memulai","category":"Verb"},{"en":"compatible","id":"cocok","category":"Adjective"},{"en":"concurrent","id":"bersamaan","category":"Adjective"},{"en":"confine","id":"membatasi","category":"Verb"},{"en":"converse","id":"bercakap-cakap","category":"Verb"},{"en":"device","id":"perangkat","category":"Noun"},{"en":"devote","id":"mencurahkan","category":"Verb"},{"en":"diminish","id":"mengurangi","category":"Verb"},{"en":"erode","id":"mengikis","category":"Verb"},{"en":"found","id":"mendirikan","category":"Verb"},{"en":"inherent","id":"melekat","category":"Adjective"},{"en":"insight","id":"wawasan","category":"Noun"},{"en":"intermediate","id":"menengah","category":"Adjective"},{"en":"mature","id":"dewasa","category":"Adjective"},{"en":"mediate","id":"menjadi perantara","category":"Verb"},{"en":"overlap","id":"tumpang tindih","category":"Verb"},{"en":"preliminary","id":"pendahuluan","category":"Adjective"},{"en":"refine","id":"memurnikan","category":"Verb"},{"en":"relax","id":"bersantai","category":"Verb"},{"en":"restrain","id":"menahan","category":"Verb"},{"en":"rigid","id":"kaku","category":"Adjective"},{"en":"sphere","id":"lapisan","category":"Noun"},{"en":"subordinate","id":"bawahan","category":"Noun"},{"en":"suspend","id":"menangguhkan","category":"Verb"},{"en":"temporary","id":"sementara","category":"Adjective"},{"en":"trigger","id":"memicu","category":"Verb"},{"en":"unify","id":"menyatukan","category":"Verb"},{"en":"violate","id":"melanggar","category":"Verb"},{"en":"vision","id":"penglihatan","category":"Noun"},{"en":"adjacent","id":"berdekatan","category":"Adjective"},{"en":"albeit","id":"meskipun","category":"Conjunction"},{"en":"assemble","id":"merakit","category":"Verb"},{"en":"collapse","id":"runtuh","category":"Verb"},{"en":"conceive","id":"mengkonsepsi","category":"Verb"},{"en":"convince","id":"meyakinkan","category":"Verb"},{"en":"depress","id":"menekan","category":"Verb"},{"en":"encounter","id":"bertemu","category":"Verb"},{"en":"enormous","id":"sangat besar","category":"Adjective"},{"en":"forthcoming","id":"mendatang","category":"Adjective"},{"en":"incline","id":"cenderung","category":"Verb"},{"en":"invoke","id":"memohon","category":"Verb"},{"en":"levy","id":"memungut","category":"Verb"},{"en":"likewise","id":"demikian juga","category":"Adverb"},{"en":"nonetheless","id":"namun","category":"Adverb"},{"en":"notwithstanding","id":"meskipun","category":"Preposition"},{"en":"odd","id":"aneh","category":"Adjective"},{"en":"ongoing","id":"berkelanjutan","category":"Adjective"},{"en":"persist","id":"bertahan","category":"Verb"},{"en":"pose","id":"mengajukan","category":"Verb"},{"en":"reluctance","id":"keengganan","category":"Noun"},{"en":"so-called","id":"apa yang disebut","category":"Adjective"},{"en":"straightforward","id":"langsung","category":"Adjective"},{"en":"undergo","id":"mengalami","category":"Verb"},{"en":"whereby","id":"dimana","category":"Conjunction"}];
const RD_CATS = [{id:"all",label:"Semua"},{id:"Saintek",label:"Saintek"},{id:"Soshum",label:"Soshum"},{id:"Lifestyle",label:"Lifestyle"},{id:"Economic",label:"Economic"},{id:"News",label:"News"},{id:"Education",label:"Education"},{id:"Literature",label:"Literature"}];

const C = {
  navy:"#1a2744",navyMid:"#243358",navyDark:"#141e36",
  sage:"#5d8a6e",sageLight:"#7aab8a",sagePale:"#e8f3ec",
  cream:"#f9f7f2",
  textDark:"#1a2744",textMid:"#4a5568",textLight:"#718096",
  correct:"#2f855a",correctBg:"#c6f6d5",wrong:"#c53030",wrongBg:"#fed7d7",
  border:"#e2e8f0",gold:"#c9a84c",goldLight:"#e8c87a",
};

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

// ═══════════════════════════════════════
// VOCAB MODULE (unchanged logic)
// ═══════════════════════════════════════
const VCATS=['All','Verb','Noun','Adjective'];

function VocabModule({ supabase, currentUser }){
  const [dbEn,setDbEn]=useState(DB_EN);
  const [dbId,setDbId]=useState(DB_ID);
  const [pkg,setPkg]=useState("common"); // "common" | "awl"
  const [scr,setScr]=useState("home"); // home | config | quiz | result | vocablist
  const [mode,setMode]=useState("en");
  const [selCats,setSelCats]=useState(new Set(["All"]));
  const [packN,setPackN]=useState(50);
  const [timeMin,setTimeMin]=useState(5);
  const [items,setItems]=useState([]);
  const [idx,setIdx]=useState(0);
  const [score,setScore]=useState(0);
  const [wrongs,setWrongs]=useState([]);
  const [ans,setAns]=useState(null);
  const [secLeft,setSecLeft]=useState(0);
  const [totalSec,setTotalSec]=useState(0);
  const [startT,setStartT]=useState(0);
  const [timedOut,setTimedOut]=useState(false);
  const [listCat,setListCat]=useState("All");
  const [listSearch,setListSearch]=useState("");
  const tmr=useRef(null);

  // AWL data converted to vocab format
  const awlEn = useMemo(()=>DB_AWL.map(w=>({word:w.en,meaning:w.id,category:w.category})),[]);
  const awlId = useMemo(()=>DB_AWL.map(w=>({word:w.id,meaning:w.en,category:w.category})),[]);

  // Active DB based on package
  const activeEn = pkg==="awl" ? awlEn : dbEn;
  const activeId  = pkg==="awl" ? awlId  : dbId;

    const saveVocabScore = async () => {
  console.log("1. saveVocabScore called");
  console.log("2. supabase:", supabase);
  console.log("3. currentUser:", currentUser);
  
  if (!supabase || !currentUser) {
    console.log("4. Missing supabase or currentUser, returning");
    return;
  }
  
  try {
    console.log("5. About to insert:", {
      user_id: currentUser.id,
      score: score,
      total: items.length,
      category: selCats.has("All") ? "All" : Array.from(selCats)[0],
      mode: mode,
      completed_at: new Date().toISOString()
    });

    const { data, error } = await supabase.from("vocab_scores").insert({
      user_id: currentUser.id,
      score: score,
      total: items.length,
      category: selCats.has("All") ? "All" : Array.from(selCats)[0],
      mode: mode,
      completed_at: new Date().toISOString()
    });

    console.log("6. Insert result - data:", data, "error:", error);
    
    if (error) {
      console.log("7. ERROR:", error);
    } else {
      console.log("✅ Score saved!");
    }
  } catch (err) {
    console.error("8. Catch error:", err);
  }
};

  // Fetch vocab from Google Sheets on mount
  useEffect(()=>{
    if(!GOOGLE_API_KEY||!SHEETS_ID)return;
    fetchSheet(SHEET_VOCAB).then(rows=>{
      if(!rows||!rows.length)return;
      const parsed=parseVocabSheet(rows);
      if(parsed.length>0){
        setDbEn(parsed);
        setDbId(parsed.map(w=>({word:w.meaning,meaning:w.word})));
      }
    }).catch(()=>{});
  },[]);

  // Listen for vocab uploads from admin
  useEffect(()=>{
    const handler=()=>{
      if(window.__vocabUpdate){
        setDbEn(prev=>[...prev,...window.__vocabUpdate]);
        setDbId(prev=>[...prev,...window.__vocabUpdate.map(w=>({word:w.meaning,meaning:w.word}))]);
        window.__vocabUpdate=null;
      }
    };
    window.addEventListener("vocabUpdate",handler);
    return()=>window.removeEventListener("vocabUpdate",handler);
  },[]);

  const catCounts=useMemo(()=>({All:activeEn.length,Verb:activeEn.filter(w=>w.category==='Verb').length,Noun:activeEn.filter(w=>w.category==='Noun').length,Adjective:activeEn.filter(w=>w.category==='Adjective').length}),[activeEn]);

  const getPool=useCallback(m=>{
    const db=m==='en'?activeEn:activeId;
    if(selCats.has('All'))return[...db];
    if(m==='en')return db.filter(w=>selCats.has(w.category));
    return db.filter(w=>{const r=activeEn.find(e=>e.word.toLowerCase()===w.meaning.toLowerCase());return r&&selCats.has(r.category);});
  },[selCats,activeEn,activeId]);

  const poolSize=useMemo(()=>getPool(mode).length,[getPool,mode]);

  function getDist(item,pool,m){
    if(m==='en'){const sc=pool.filter(w=>w.category===item.category&&w.word!==item.word&&w.meaning!==item.meaning);const fb=pool.filter(w=>w.word!==item.word&&w.meaning!==item.meaning);const s=sc.length>=3?sc:fb;return shuffle(s).slice(0,3).map(w=>w.meaning);}
    else{const correct=item.meaning.toLowerCase();const ref=dbEn.find(w=>w.word.toLowerCase()===correct);const cat=ref?ref.category:null;const cw=cat?new Set(dbEn.filter(w=>w.category===cat).map(w=>w.word)):null;const sc=pool.filter(w=>w.word!==item.word&&w.meaning.toLowerCase()!==correct&&(!cw||cw.has(w.meaning)));const fb=pool.filter(w=>w.word!==item.word&&w.meaning.toLowerCase()!==correct);const s=sc.length>=3?sc:fb;return shuffle(s).slice(0,3).map(w=>w.meaning);}
  }

  function startQuiz(retryItems){
    clearInterval(tmr.current);
    const pool=retryItems||getPool(mode);
    const n=retryItems?pool.length:Math.min(packN,pool.length);
    const q=shuffle(pool).slice(0,n);
    setItems(q);setIdx(0);setScore(0);setWrongs([]);setAns(null);
    const t=timeMin*60;setTotalSec(t);setSecLeft(t);setStartT(Date.now());setTimedOut(false);setScr("quiz");
  }

  useEffect(()=>{
    if(scr!=="quiz")return;
    tmr.current=setInterval(()=>{setSecLeft(p=>{if(p<=1){clearInterval(tmr.current);setTimedOut(true);setScr("result");return 0;}return p-1;});},1000);
    return()=>clearInterval(tmr.current);
  },[scr,startT]);

  function handleAns(txt,ok,item){
    if(ans)return;setAns({selected:txt,correct:ok});
    if(ok){setScore(s=>s+1);setTimeout(nextQ,400);}
    else{setWrongs(w=>[...w,{item,userAns:txt}]);setTimeout(nextQ,1500);}
  }
  function nextQ(){setAns(null);if(idx+1>=items.length){clearInterval(tmr.current);setScr("result");}else{setIdx(i=>i+1);}}

  const cur=items[idx];
  const curPool=scr==="quiz"?getPool(mode):[];
  const opts=useMemo(()=>{
    if(!cur||scr!=="quiz")return[];
    const d=getDist(cur,curPool,mode);
    return shuffle([{text:cur.meaning,correct:true},{text:d[0]||'—',correct:false},{text:d[1]||'—',correct:false},{text:d[2]||'—',correct:false}]);
  },[cur,scr]);

  const curCat=useMemo(()=>{
    if(!cur)return'—';
    if(mode==='en')return cur.category||'—';
    const r=dbEn.find(w=>w.word.toLowerCase()===cur.meaning.toLowerCase());
    return r?r.category:'—';
  },[cur,mode]);

  const resPct=items.length>0?Math.round((score/items.length)*100):0;
  const elapsed=Math.round((Date.now()-startT)/1000);
  const resMsg=resPct>=100?'🎉 Sempurna!':resPct>=80?'🔥 Hebat!':resPct>=60?'👍 Cukup baik!':'💪 Terus semangat!';

  const toggleCat=cat=>{setSelCats(p=>{const n=new Set(p);if(cat==='All'){n.clear();n.add('All');}else{n.delete('All');n.has(cat)?n.delete(cat):n.add(cat);if(n.size===0)n.add('All');}return n;});};

  const cardS={background:'#fff',borderRadius:14,padding:'22px 24px',boxShadow:'0 4px 20px rgba(26,39,68,0.09)',marginBottom:14};
  const lblS={fontWeight:700,fontSize:'0.74rem',textTransform:'uppercase',letterSpacing:'0.09em',color:C.textLight,marginBottom:13};

  if(scr==="home"){
    const pkgs=[
      {id:"common",icon:"📖",title:"Common Words",desc:"322 kata umum bahasa Inggris yang sering muncul di bacaan sehari-hari dan ujian.",count:dbEn.length,badge:""},
      {id:"awl",icon:"🎓",title:"Academic Word List",desc:"373 kosakata akademik penting (AWL) yang sering muncul di teks ilmiah dan ujian.",count:awlEn.length,badge:"AWL"},
    ];
    return(<div style={{background:C.cream,minHeight:'100vh'}}>
      <div style={{background:C.navy,padding:'40px 28px 72px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-70,right:-70,width:300,height:300,borderRadius:'50%',background:'rgba(93,138,110,0.13)'}}/>
        <h1 style={{fontFamily:"'DM Serif Display',serif",color:'#fff',fontSize:'2rem',lineHeight:1.25,maxWidth:500,margin:'0 auto 10px',position:'relative',zIndex:1}}>Latihan Vocab</h1>
        <p style={{color:'rgba(255,255,255,0.65)',fontSize:'0.88rem',lineHeight:1.65,maxWidth:420,margin:'0 auto',position:'relative',zIndex:1}}>Pilih paket vocab, lalu latihan quiz atau lihat seluruh daftar kata.</p>
      </div>

      {/* Package selector */}
      <div style={{maxWidth:700,margin:'-36px auto 0',padding:'0 22px',position:'relative',zIndex:2}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
          {pkgs.map(p=>(
            <div key={p.id} onClick={()=>setPkg(p.id)} style={{background:'#fff',borderRadius:16,padding:'22px 20px',boxShadow:'0 6px 28px rgba(26,39,68,0.12)',cursor:'pointer',border:`2px solid ${pkg===p.id?"#F39C12":C.border}`,transition:'all .18s',position:'relative'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#F39C12"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=pkg===p.id?"#F39C12":C.border}>
              {pkg===p.id&&<div style={{position:'absolute',top:12,right:12,width:20,height:20,borderRadius:'50%',background:"#F39C12",display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#fff'}}>✓</div>}
              <div style={{fontSize:26,marginBottom:10}}>{p.icon}</div>
              <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:4,color:C.navy}}>{p.title}</div>
              <div style={{fontSize:'0.72rem',color:C.textLight,marginBottom:10,lineHeight:1.5}}>{p.desc}</div>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:C.sage}}>{p.count} kata</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:32}}>
          {[{icon:'🔤',title:'Quiz EN → ID',desc:'Tebak arti Bahasa Indonesia',m:'en'},{icon:'🇮🇩',title:'Quiz ID → EN',desc:'Tebak kata Bahasa Inggris',m:'id'}].map(c=>(
            <div key={c.m} onClick={()=>{setMode(c.m);setScr("config");}} style={{background:'#fff',borderRadius:14,padding:'18px 18px',boxShadow:'0 4px 18px rgba(26,39,68,0.10)',cursor:'pointer',transition:'all .18s',border:'2px solid transparent'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#F39C12';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='transparent';e.currentTarget.style.transform='none';}}>
              <div style={{fontSize:22,marginBottom:8}}>{c.icon}</div>
              <div style={{fontWeight:700,fontSize:'0.85rem',marginBottom:3,color:C.navy}}>{c.title}</div>
              <div style={{fontSize:'0.73rem',color:C.textLight}}>{c.desc}</div>
              <div style={{marginTop:10,fontSize:'0.72rem',fontWeight:700,color:'#F39C12'}}>Mulai →</div>
            </div>
          ))}
        </div>

        {/* Lihat Semua Vocab */}
        <button onClick={()=>setScr("vocablist")} style={{width:'100%',padding:'14px',background:'#fff',border:`2px solid ${C.border}`,borderRadius:14,display:'flex',alignItems:'center',gap:14,cursor:'pointer',transition:'all .18s',marginBottom:40}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#1E2A47";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;}}>
          <div style={{width:42,height:42,borderRadius:10,background:"#FEF3CD",display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📋</div>
          <div style={{textAlign:'left'}}>
            <div style={{fontWeight:700,fontSize:'0.88rem',color:"#1E2A47"}}>Lihat Daftar Vocab Lengkap</div>
            <div style={{fontSize:'0.73rem',color:C.textLight,marginTop:2}}>Common Words (322) + Academic Word List (373) · total 695 kata</div>
          </div>
          <span style={{marginLeft:'auto',color:"#F39C12",fontSize:'1.2rem',fontWeight:700}}>›</span>
        </button>
      </div>
    </div>);
  }

  if(scr==="vocablist"){
    const listDb = pkg==="awl" ? awlEn : dbEn;
    const cats = ["All","Verb","Noun","Adjective","Adverb","Preposition","Conjunction"];
    const filtered = listDb.filter(w=>{
      const matchCat = listCat==="All" || w.category===listCat;
      const matchSearch = !listSearch || w.word.toLowerCase().includes(listSearch.toLowerCase()) || w.meaning.toLowerCase().includes(listSearch.toLowerCase());
      return matchCat && matchSearch;
    });
    const catClr={Verb:"#2d6a4f",Noun:"#1E2A47",Adjective:"#7c3aed",Adverb:"#c2410c",Preposition:"#0369a1",Conjunction:"#9d174d"};
    const catCount = (cat)=> cat==="All"?listDb.length:listDb.filter(w=>w.category===cat).length;

    return(<div style={{background:C.cream,minHeight:'100vh'}}>
      {/* Sticky Header */}
      <div style={{background:"#1E2A47",padding:'20px 22px',position:'sticky',top:48,zIndex:100,boxShadow:'0 2px 12px rgba(0,0,0,0.2)'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <button onClick={()=>setScr("home")} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'rgba(255,255,255,0.8)',fontSize:'0.78rem',fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",padding:'6px 12px',borderRadius:7,display:'flex',alignItems:'center',gap:5}}>← Kembali</button>
            <div style={{fontFamily:"'DM Serif Display',serif",color:'#fff',fontSize:'1.1rem'}}>Daftar Vocab</div>
            <div style={{marginLeft:'auto',fontSize:'0.75rem',color:'rgba(255,255,255,0.5)'}}>{filtered.length} kata</div>
          </div>

          {/* Package switcher */}
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {[{id:"common",label:"📖 Common Words",count:dbEn.length},{id:"awl",label:"🎓 Academic Word List",count:awlEn.length}].map(p=>(
              <button key={p.id} onClick={()=>setPkg(p.id)} style={{background:pkg===p.id?"#F39C12":"rgba(255,255,255,0.1)",border:'none',color:'#fff',padding:'7px 16px',borderRadius:8,fontSize:'0.78rem',fontWeight:pkg===p.id?700:500,cursor:'pointer',transition:'all .15s',display:'flex',alignItems:'center',gap:6}}>
                {p.label} <span style={{background:'rgba(255,255,255,0.2)',padding:'1px 7px',borderRadius:10,fontSize:'0.68rem'}}>{p.count}</span>
              </button>
            ))}
          </div>

          {/* Search + category filter */}
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <input value={listSearch} onChange={e=>setListSearch(e.target.value)} placeholder="🔍 Cari kata..." style={{padding:'7px 13px',borderRadius:8,border:'none',fontSize:'0.82rem',width:180,outline:'none',fontFamily:"'DM Sans',sans-serif",flexShrink:0}}/>
            <div style={{display:'flex',gap:5,overflowX:'auto',scrollbarWidth:'none',flex:1}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setListCat(c)} style={{background:listCat===c?'#F39C12':'rgba(255,255,255,0.1)',border:'none',color:'#fff',padding:'5px 12px',borderRadius:20,fontSize:'0.7rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'all .15s',flexShrink:0}}>
                  {c==="All"?"Semua":c} <span style={{opacity:0.7}}>({catCount(c)})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{background:'#fff',borderBottom:'1px solid #eee'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'12px 22px',display:'flex',gap:20,overflowX:'auto'}}>
          {[["Verb","#2d6a4f"],["Noun","#1E2A47"],["Adjective","#7c3aed"],["Adverb","#c2410c"],["Preposition","#0369a1"],["Conjunction","#9d174d"]].map(([cat,clr])=>(
            <div key={cat} style={{flexShrink:0,textAlign:'center',cursor:'pointer'}} onClick={()=>setListCat(cat)}>
              <div style={{fontSize:'0.95rem',fontWeight:700,color:clr}}>{catCount(cat)}</div>
              <div style={{fontSize:'0.65rem',color:'#9ca3af',fontWeight:600}}>{cat}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Vocab grid */}
      <div style={{maxWidth:900,margin:'0 auto',padding:'20px 22px 60px'}}>
        {listSearch&&<div style={{marginBottom:12,fontSize:'0.82rem',color:C.textLight}}>Menampilkan <strong>{filtered.length}</strong> hasil untuk "<strong>{listSearch}</strong>"</div>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:9}}>
          {filtered.map((w,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:11,padding:'13px 15px',boxShadow:'0 2px 8px rgba(26,39,68,0.07)',borderLeft:`3px solid ${catClr[w.category]||C.sage}`,transition:'box-shadow .15s'}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(26,39,68,0.14)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(26,39,68,0.07)'}>
              <div style={{fontWeight:700,fontSize:'0.9rem',color:"#1E2A47",marginBottom:4}}>{w.word}</div>
              <div style={{fontSize:'0.78rem',color:C.textLight,marginBottom:8,lineHeight:1.4}}>{w.meaning}</div>
              <span style={{fontSize:'0.63rem',fontWeight:700,color:catClr[w.category]||C.sage,background:(catClr[w.category]||C.sage)+'15',padding:'2px 8px',borderRadius:20}}>{w.category}</span>
            </div>
          ))}
        </div>
        {filtered.length===0&&<div style={{textAlign:'center',padding:'60px 0',color:C.textLight}}>
          <div style={{fontSize:'2rem',marginBottom:12}}>🔍</div>
          <div style={{fontWeight:600}}>Tidak ada kata yang cocok</div>
          <div style={{fontSize:'0.82rem',marginTop:6}}>Coba kata kunci yang berbeda</div>
        </div>}
      </div>
    </div>);
  }

  if(scr==="config"){
    return(<div style={{background:C.cream,minHeight:'100vh'}}>
      <div style={{maxWidth:600,margin:'36px auto',padding:'0 22px'}}>
        <button onClick={()=>setScr("home")} style={{display:'inline-flex',alignItems:'center',gap:6,color:C.textLight,fontSize:'0.8rem',fontWeight:600,cursor:'pointer',marginBottom:20,border:'none',background:'none',fontFamily:"'DM Sans',sans-serif"}}>← Beranda</button>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.5rem'}}>Vocab Quiz {mode==='en'?'EN → ID':'ID → EN'}</div>
        </div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:C.sagePale,borderRadius:20,padding:'4px 12px',marginBottom:14}}>
          <span style={{fontSize:'0.7rem',fontWeight:700,color:C.sage}}>{pkg==="awl"?"🎓 Academic Word List":"📖 Common Words"} · {activeEn.length} kata</span>
        </div>
        <div style={{color:C.textLight,fontSize:'0.84rem',marginBottom:22}}>{mode==='en'?'Lihat kata Bahasa Inggris, pilih artinya yang tepat.':'Lihat kata Bahasa Indonesia, pilih padanan Bahasa Inggrisnya.'}</div>
        <div style={cardS}><div style={lblS}>Filter Kategori</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
            {VCATS.map(cat=>(<div key={cat} onClick={()=>toggleCat(cat)} style={{display:'flex',alignItems:'center',gap:9,padding:'11px 13px',border:`2px solid ${selCats.has(cat)?C.sage:C.border}`,borderRadius:10,cursor:'pointer',transition:'all .16s',userSelect:'none',background:selCats.has(cat)?C.sagePale:'transparent'}}>
              <div style={{width:17,height:17,borderRadius:4,border:`2px solid ${selCats.has(cat)?C.sage:C.border}`,background:selCats.has(cat)?C.sage:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10}}>{selCats.has(cat)?'✓':''}</div>
              <span style={{fontWeight:500,fontSize:'0.85rem'}}>{cat==='All'?'All Words':cat}</span>
              <span style={{marginLeft:'auto',fontSize:'0.7rem',color:C.textLight}}>{catCounts[cat]||0}</span>
            </div>))}
          </div>
        </div>
        <div style={cardS}><div style={lblS}>Jumlah Soal</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:9}}>
            {[20,30,50,70,100].map(n=>(<button key={n} onClick={()=>setPackN(n)} style={{padding:'13px 6px',border:`2px solid ${packN===n?C.navy:C.border}`,borderRadius:10,background:packN===n?C.navy:'#fff',cursor:'pointer',textAlign:'center',fontFamily:"'DM Sans',sans-serif",color:packN===n?'#fff':C.textDark}}>
              <span style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',display:'block'}}>{n}</span>
              <span style={{fontSize:'0.61rem',textTransform:'uppercase',letterSpacing:'0.05em',opacity:0.6}}>soal</span>
            </button>))}
          </div>
        </div>
        <div style={cardS}><div style={lblS}>Pilih Durasi</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:9}}>
            {[3,5,7,9].map(t=>(<button key={t} onClick={()=>setTimeMin(t)} style={{padding:'13px 6px',border:`2px solid ${timeMin===t?C.sage:C.border}`,borderRadius:10,background:timeMin===t?C.sage:'#fff',cursor:'pointer',textAlign:'center',fontFamily:"'DM Sans',sans-serif",color:timeMin===t?'#fff':C.textDark}}>
              <span style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',display:'block'}}>{t}</span>
              <span style={{fontSize:'0.61rem',textTransform:'uppercase',letterSpacing:'0.05em',opacity:0.7}}>menit</span>
            </button>))}
          </div>
        </div>
        <button onClick={()=>startQuiz()} disabled={poolSize<4} style={{width:'100%',padding:15,background:poolSize<4?'#ccc':C.sage,color:'#fff',border:'none',borderRadius:12,fontFamily:"'DM Sans',sans-serif",fontSize:'0.93rem',fontWeight:700,cursor:poolSize<4?'not-allowed':'pointer'}}>Mulai Kuis →</button>
      </div>
    </div>);
  }

  if(scr==="quiz"&&cur){
    const tPct=totalSec>0?(secLeft/totalSec)*100:0;
    const pPct=items.length>0?(idx/items.length)*100:0;
    const m=Math.floor(secLeft/60),ss=secLeft%60;
    return(<div style={{background:C.cream,minHeight:'100vh'}}>
      <div style={{maxWidth:560,margin:'0 auto',padding:'24px 22px'}}>
        <div style={{marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
            <span style={{fontSize:'0.72rem',fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:'0.07em'}}>Waktu</span>
            <span style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.05rem',color:secLeft<=30?C.wrong:C.navy}}>{m}:{String(ss).padStart(2,'0')}</span>
          </div>
          <div style={{height:5,background:C.border,borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:tPct+'%',background:secLeft<=30?'linear-gradient(90deg,#e53e3e,#fc8181)':`linear-gradient(90deg,${C.sage},${C.sageLight})`,borderRadius:99,transition:'width 1s linear'}}/></div>
        </div>
        <div style={{marginBottom:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:'0.7rem',fontWeight:700,color:C.textLight,textTransform:'uppercase',letterSpacing:'0.07em'}}>Progress</span>
            <span style={{fontFamily:"'DM Serif Display',serif",fontSize:'0.98rem',color:C.navy}}>{idx+1}/{items.length}</span>
          </div>
          <div style={{height:4,background:C.border,borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:pPct+'%',background:C.navyMid,borderRadius:99,transition:'width .3s ease'}}/></div>
        </div>
        <div style={{background:C.navy,borderRadius:18,padding:'30px 28px',marginBottom:13,boxShadow:'0 10px 40px rgba(26,39,68,0.15)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-50,right:-50,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
          <div style={{display:'inline-block',background:'rgba(93,138,110,0.28)',color:C.sageLight,fontSize:'0.65rem',fontWeight:700,padding:'4px 11px',borderRadius:20,textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:14,position:'relative',zIndex:1}}>{curCat}</div>
          <div style={{color:'rgba(255,255,255,0.48)',fontSize:'0.77rem',marginBottom:7,position:'relative',zIndex:1}}>{mode==='en'?'Apa arti kata berikut?':'Apa kata Bahasa Inggris dari:'}</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'2.4rem',color:'#fff',position:'relative',zIndex:1,lineHeight:1.15}}>{cur.word}</div>
        </div>
        <div style={{display:'grid',gap:9}}>
          {opts.map((o,i)=>{
            let bg='#fff',bdr=`2px solid ${C.border}`,clr=C.textDark,lBg=C.border,lClr=C.textLight;
            if(ans){if(o.correct){bg=C.correctBg;bdr=`2px solid ${C.correct}`;clr=C.correct;lBg=C.correct;lClr='#fff';}
            else if(ans.selected===o.text&&!o.correct){bg=C.wrongBg;bdr=`2px solid ${C.wrong}`;clr=C.wrong;lBg=C.wrong;lClr='#fff';}}
            return(<button key={i} onClick={()=>handleAns(o.text,o.correct,cur)} disabled={!!ans} style={{padding:'14px 16px',background:bg,border:bdr,borderRadius:11,textAlign:'left',cursor:ans?'default':'pointer',fontFamily:"'DM Sans',sans-serif",fontSize:'0.88rem',fontWeight:500,color:clr,transition:'all .14s',display:'flex',alignItems:'center',gap:11,opacity:ans&&!o.correct&&ans.selected!==o.text?0.38:1}}>
              <span style={{width:26,height:26,borderRadius:7,background:lBg,color:lClr,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.69rem',fontWeight:700,flexShrink:0}}>{"ABCD"[i]}</span>
              <span>{o.text}</span>
              {ans&&o.correct&&<span style={{marginLeft:'auto'}}>✓</span>}
              {ans&&ans.selected===o.text&&!o.correct&&<span style={{marginLeft:'auto'}}>✗</span>}
            </button>);
          })}
        </div>
      </div>
    </div>);
  }

  if(scr==="result"){
    return(<div style={{background:C.cream,minHeight:'100vh'}}>
      <div style={{maxWidth:620,margin:'28px auto',padding:'0 22px'}}>
        {timedOut&&<div style={{background:C.wrongBg,border:'1px solid #feb2b2',borderRadius:10,padding:'12px 16px',marginBottom:14,color:C.wrong,fontWeight:700,fontSize:'0.84rem',textAlign:'center'}}>⏰ Waktu habis!</div>}
        <div style={{background:C.navy,borderRadius:18,padding:'40px 28px 32px',marginBottom:16,boxShadow:'0 10px 40px rgba(26,39,68,0.15)',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-60,right:-60,width:240,height:240,borderRadius:'50%',background:'rgba(93,138,110,0.15)'}}/>
          <div style={{color:'rgba(255,255,255,0.46)',fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.11em',marginBottom:10,position:'relative',zIndex:1}}>Hasil Kuis {mode==='en'?'EN → ID':'ID → EN'}</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'4rem',color:'#fff',lineHeight:1,position:'relative',zIndex:1}}>{score}<span style={{fontSize:'1.8rem',opacity:0.45}}>/{items.length}</span></div>
          <div style={{marginTop:8,fontSize:'1rem',fontWeight:700,position:'relative',zIndex:1,color:resPct>=70?'#6ee7b7':resPct>=50?'#fcd34d':'#fca5a5'}}>{resPct}%</div>
          <div style={{marginTop:9,color:'rgba(255,255,255,0.55)',fontSize:'0.84rem',position:'relative',zIndex:1}}>{resMsg}</div>
        </div>
        <div style={{background:'#fff',borderRadius:14,padding:20,boxShadow:'0 4px 20px rgba(26,39,68,0.09)',marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:'0.76rem',textTransform:'uppercase',letterSpacing:'0.08em',color:C.wrong,marginBottom:12}}>⚠ Perlu Dipelajari Ulang</div>
          {wrongs.length===0?<div style={{textAlign:'center',padding:18,color:C.correct,fontWeight:700,fontSize:'0.84rem'}}>🎉 Tidak ada yang salah!</div>
          :wrongs.map((w,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<wrongs.length-1?`1px solid ${C.border}`:'none',fontSize:'0.83rem'}}>
            <div><span style={{fontWeight:700,color:C.navy}}>{w.item.word}</span>{' → '}<span style={{color:C.wrong,textDecoration:'line-through',fontSize:'0.75rem'}}>{w.userAns}</span><span style={{color:C.correct,fontWeight:700,marginLeft:5}}>{w.item.meaning}</span></div>
          </div>))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11}}>
          <button onClick={async ()=>{await saveVocabScore();setScr("config");}} style={{padding:13,border:`2px solid ${C.border}`,borderRadius:11,background:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:'0.85rem',fontWeight:700,color:C.textDark,cursor:'pointer'}}>← Kuis Baru</button>
          {wrongs.length>0&&<button onClick={async ()=>{await saveVocabScore();startQuiz(wrongs.map(w=>w.item));}} style={{padding:13,border:`2px solid ${C.sage}`,borderRadius:11,background:C.sage,fontFamily:"'DM Sans',sans-serif",fontSize:'0.85rem',fontWeight:700,color:'#fff',cursor:'pointer'}}>Ulangi yang Salah</button>}
        </div>
      </div>
    </div>);
    // Setelah quiz selesai, save score

  }
  return null;
}

// ═══════════════════════════════════════
// READING TOOLTIP
// ═══════════════════════════════════════
function VocabTooltip({word,data,position,onClose}){
  const ref=useRef(null);
  const [pos,setPos]=useState(position);
  useEffect(()=>{if(!ref.current)return;const r=ref.current.getBoundingClientRect();let x=position.x;if(r.right>window.innerWidth-12)x=window.innerWidth-r.width-16;if(x<12)x=12;setPos({x,y:position.y});},[position]);
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:998}}/>
    <div ref={ref} style={{position:"fixed",left:pos.x,top:pos.y+8,zIndex:999,background:"#1a1a1a",color:"#f5f0eb",borderRadius:10,padding:"18px 22px",maxWidth:360,minWidth:240,boxShadow:"0 16px 48px rgba(0,0,0,0.4)",fontFamily:"'Source Sans 3',sans-serif",animation:"ttIn .2s ease-out"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
        <span style={{fontSize:20,fontWeight:700,fontFamily:"'Playfair Display',serif",color:C.goldLight}}>{word}</span>
        <span style={{fontSize:10,fontWeight:700,background:"rgba(232,200,122,0.15)",color:C.goldLight,padding:"2px 8px",borderRadius:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{data.pos}</span>
      </div>
      <div style={{fontSize:16,fontWeight:600,color:"#fff",paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.1)",marginBottom:10}}>{data.translation}</div>
      {data.context&&<div style={{fontSize:13,fontStyle:"italic",color:"rgba(245,240,235,0.65)",lineHeight:1.5}}>"{data.context}"</div>}
      <div style={{position:"absolute",top:-6,left:20,width:12,height:12,background:"#1a1a1a",transform:"rotate(45deg)"}}/>
    </div>
  </>);
}

// ═══════════════════════════════════════
// TRANSLATE PANEL
// ═══════════════════════════════════════
function TranslatePanel({dark:dk,apiKey}){
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [history,setHistory]=useState([]);
  const debounceRef=useRef(null);

  // Panel colors
  const panelBg=dk?"#1c1c1c":"#ffffff";
  const panelBorder=dk?"#333":"#e0dcd5";
  const inputBg=dk?"#2a2a2a":"#f9f7f2";
  const inputBorder=dk?"#444":"#d8d3c8";
  const txtMain=dk?"#f0ece4":"#1a1a1a";
  const txtMuted=dk?"rgba(240,236,228,0.4)":"#aaa";
  const histBg=dk?"#252525":"#f5f1ea";
  const histBorder=dk?"#333":"#e8e2d8";

  const doTranslate=useCallback(async(text)=>{
    if(!text.trim())return;
    setLoading(true);setError("");setResult(null);
    try{
      // Use Google Translate API v2
      const url=`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      const res=await fetch(url,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({q:text.trim(),source:"en",target:"id",format:"text"})
      });
      if(!res.ok){const e=await res.json();throw new Error(e?.error?.message||"API error");}
      const data=await res.json();
      const translated=data?.data?.translations?.[0]?.translatedText||"";
      setResult(translated);
      setHistory(prev=>{
        const entry={en:text.trim(),id:translated,ts:Date.now()};
        return [entry,...prev.filter(h=>h.en!==text.trim())].slice(0,8);
      });
    }catch(e){
      setError(e.message||"Gagal menghubungi API. Periksa API key.");
    }finally{setLoading(false);}
  },[apiKey]);

  // Auto-translate with debounce as user types
  useEffect(()=>{
    clearTimeout(debounceRef.current);
    if(input.trim().length<1){setResult(null);setError("");return;}
    debounceRef.current=setTimeout(()=>doTranslate(input),700);
    return()=>clearTimeout(debounceRef.current);
  },[input,doTranslate]);

  const clear=()=>{setInput("");setResult(null);setError("");};

  // Floating toggle button
  const toggleBtn=(
    <button onClick={()=>setOpen(o=>!o)} title="Translate" style={{
      position:"fixed",bottom:28,right:28,zIndex:600,
      width:52,height:52,borderRadius:"50%",
      background:open?"#c1554d":dk?"#2a2a2a":"#1a1a1a",
      color:"#fff",border:"none",cursor:"pointer",
      fontSize:22,boxShadow:"0 4px 20px rgba(0,0,0,0.25)",
      display:"flex",alignItems:"center",justifyContent:"center",
      transition:"all .2s",
    }}>{open?"✕":"🌐"}</button>
  );

  if(!open)return toggleBtn;

  return(<>
    {toggleBtn}
    <div style={{
      position:"fixed",bottom:90,right:28,zIndex:599,
      width:300,background:panelBg,border:`1px solid ${panelBorder}`,
      borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",
      fontFamily:"'Source Sans 3',sans-serif",
      animation:"fadeUp .2s ease-out",overflow:"hidden",
    }}>
      {/* Input area */}
      <div style={{padding:"14px 16px 10px"}}>
        <textarea
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="Ketik kata atau kalimat..."
          style={{
            width:"100%",minHeight:64,padding:"8px 10px",
            background:inputBg,
            border:`1.5px solid ${loading?"#c9a84c":error?"#c1554d":result?"#2d6a4f":inputBorder}`,
            borderRadius:8,resize:"none",fontSize:14,
            color:txtMain,fontFamily:"'Source Serif 4',serif",
            outline:"none",lineHeight:1.6,transition:"border .2s",
          }}
          autoFocus
        />
        {input&&(
          <button onClick={clear} style={{
            marginTop:4,fontSize:11,color:txtMuted,background:"none",
            border:"none",cursor:"pointer",padding:0,
          }}>hapus</button>
        )}
      </div>

      {/* Divider */}
      <div style={{height:1,background:panelBorder,margin:"0 16px"}}/>

      {/* Result area */}
      <div style={{padding:"10px 16px 14px",minHeight:52}}>
        {loading&&(
          <div style={{display:"flex",alignItems:"center",gap:7,color:txtMuted,fontSize:13,paddingTop:4}}>
            <span style={{display:"inline-block",width:12,height:12,border:"1.5px solid #c9a84c",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>
            <span style={{letterSpacing:"0.02em"}}>Menerjemahkan...</span>
          </div>
        )}
        {result&&!loading&&(
          <p style={{
            fontSize:15,fontWeight:500,
            color:dk?"#b8f0c8":"#1b4332",
            lineHeight:1.65,margin:0,
            letterSpacing:"0.01em",
          }}>{result}</p>
        )}
        {!result&&!loading&&!error&&(
          <p style={{fontSize:13,color:txtMuted,margin:0,paddingTop:4,fontStyle:"italic"}}>
            Terjemahan muncul di sini
          </p>
        )}
        {error&&!loading&&(
          <p style={{fontSize:12,color:dk?"#fca5a5":"#c1554d",margin:0,lineHeight:1.5}}>
            ⚠ {error}
          </p>
        )}
        {!apiKey&&(
          <p style={{fontSize:11,color:dk?"#fcd34d":"#b45309",margin:0,lineHeight:1.5}}>
            ⚠ API Key belum diset di App.jsx
          </p>
        )}
      </div>

      {/* History */}
      {history.length>0&&(
        <div style={{borderTop:`1px solid ${histBorder}`}}>
          <div style={{maxHeight:160,overflowY:"auto"}}>
            {history.map((h,i)=>(
              <div key={i} onClick={()=>{setInput(h.en);setResult(h.id);}}
                style={{
                  padding:"8px 16px",cursor:"pointer",
                  borderBottom:i<history.length-1?`1px solid ${histBorder}`:"none",
                  transition:"background .1s",
                }}
                onMouseEnter={e=>e.currentTarget.style.background=histBg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <div style={{fontSize:12,color:txtMain,marginBottom:2}}>{h.en}</div>
                <div style={{fontSize:11,color:dk?"#6ee7b7":"#2d6a4f"}}>{h.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </>);
}

// ═══════════════════════════════════════
// HIGHLIGHTED TEXT
// ═══════════════════════════════════════
function HighlightedText({content,vocabList,dark:dk}){
  const [tip,setTip]=useState(null);
  const onWord=useCallback((e,word,data)=>{e.stopPropagation();const r=e.target.getBoundingClientRect();setTip({word,data,position:{x:r.left,y:r.bottom}});},[]);

  const renderP=useCallback((text,pi)=>{
    if(!vocabList||!vocabList.length)return text;
    const sorted=[...vocabList].sort((a,b)=>b.word.length-a.word.length);
    const esc=sorted.map(v=>v.word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
    let pattern;
    try{pattern=new RegExp("\\b("+esc.join("|")+")\\b","gi");}catch(e){return text;}
    const parts=text.split(pattern);
    return parts.map((part,i)=>{
      const match=sorted.find(v=>v.word.toLowerCase()===part.toLowerCase());
      if(match)return(<span key={pi+"-"+i} onClick={e=>onWord(e,match.word,match)} style={{background:"linear-gradient(to bottom, transparent 62%, rgba(232,200,122,0.3) 62%)",cursor:"pointer",borderBottom:"1.5px dashed #c9a84c",paddingBottom:1,borderRadius:2,transition:"all .15s"}} onMouseEnter={e=>{e.target.style.background="rgba(232,200,122,0.25)";e.target.style.borderBottomStyle="solid";}} onMouseLeave={e=>{e.target.style.background="linear-gradient(to bottom, transparent 62%, rgba(232,200,122,0.3) 62%)";e.target.style.borderBottomStyle="dashed";}}>{part}</span>);
      return part;
    });
  },[vocabList,onWord]);

  const tc=dk?"#d4cfc8":"#2a2a2a";
  const dc=dk?"#f0ece4":"#1a1a1a";
  return(
    <div onClick={()=>setTip(null)}>
    {content.split(/\n\n+|\n/).filter(p=>p.trim().length>0).map((p,i)=>(
        <p key={i} style={{fontSize:18,lineHeight:1.6,marginBottom:18,color:tc,fontFamily:"'Source Serif 4','Georgia',serif",letterSpacing:"0.015em",transition:"color .3s"}}>
          {i===0&&<span style={{float:"left",fontSize:58,lineHeight:"48px",paddingRight:8,paddingTop:6,fontFamily:"'Playfair Display',serif",fontWeight:900,color:dc,transition:"color .3s"}}>{p.charAt(0)}</span>}
          {renderP(i===0?p.slice(1):p,i)}
        </p>
      ))}
      {tip&&<VocabTooltip word={tip.word} data={tip.data} position={tip.position} onClose={()=>setTip(null)}/>}
    </div>
  );
}

// ═══════════════════════════════════════
// VOCAB PRACTICE TAB
// ═══════════════════════════════════════
function VocabPracticeTab({vl, dark:dk, C, txtP, txtS, bdgBg, bgCard, bdrC}){
  const [sentences, setSentences] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [allSubmitted, setAllSubmitted] = useState(false);

  const inputBg = dk ? "#1a1a1a" : "#fff";
  const inputBdr = dk ? "#333" : "#d8d3c8";
  const cardBg = (i) => i % 2 === 0 ? bgCard : (dk ? "#222" : "#f9f6f0");
  const bdr = "1px solid " + (dk ? "#2a2a2a" : "#e8e2d8");
  const mutedClr = dk ? "rgba(240,236,228,0.45)" : "#888";
  const allFilled = vl.length > 0 && vl.every(v => sentences[v.vid || v.word]?.trim());

  const handleSend = (vid) => {
    if (sentences[vid]?.trim()) {
      setSubmitted(p => ({ ...p, [vid]: true }));
    }
  };

  const handleEdit = (vid) => {
    setSubmitted(p => ({ ...p, [vid]: false }));
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:txtP,margin:0}}>Vocabulary List</h3>
        <span style={{fontSize:12,color:mutedClr}}>{Object.values(submitted).filter(Boolean).length}/{vl.length} kalimat</span>
      </div>

      <div style={{background:dk?"#1e1c18":"#fef9ef",borderRadius:8,padding:"12px 16px",marginBottom:24,fontSize:13,color:dk?"#c9a84c":"#6b5634",borderLeft:"4px solid #c9a84c",lineHeight:1.5}}>
        ✏️ <strong>Latihan:</strong> Buat satu kalimat sendiri dari setiap kata vocab di bawah, lalu klik <strong>↑</strong> untuk menyimpan.
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {vl.map((v, i) => {
          const vid = v.vid || v.word;
          const isSub = submitted[vid];
          const sent = sentences[vid] || "";
          const hasSent = sent.trim().length > 0;

          return (
            <div key={vid} style={{background:cardBg(i),border:bdr,borderRadius:10,padding:"18px 22px",borderLeft:isSub?"4px solid #2d6a4f":"4px solid #c9a84c",transition:"all .2s"}}>
              {/* Word header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:txtP}}>{v.word}</span>
                  {v.pos&&<span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#8b7355",background:bdgBg,padding:"3px 10px",borderRadius:4}}>{v.pos}</span>}
                </div>
                {isSub&&<span style={{fontSize:11,color:"#2d6a4f",fontWeight:700}}>✓ Tersimpan</span>}
              </div>
              <div style={{fontSize:15,fontWeight:600,color:C.gold,marginBottom:8}}>{v.translation}</div>
              {v.context&&<div style={{fontSize:13,fontStyle:"italic",color:mutedClr,lineHeight:1.5,marginBottom:12,paddingBottom:10,borderBottom:"1px solid "+(dk?"#2a2a2a":"#eee")}}>"{v.context}"</div>}

              {/* Sentence input */}
              <div style={{marginTop:8}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:mutedClr,marginBottom:6}}>Buat kalimatmu:</div>
                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  {isSub ? (
                    <div style={{flex:1,padding:"10px 14px",background:dk?"#1a2a1a":"#f0f9f0",border:"2px solid #2d6a4f",borderRadius:8,fontSize:14,lineHeight:1.5,color:dk?"#a3d9a5":"#1b4332",fontFamily:"'Source Serif 4',serif",minHeight:44}}>
                      {sent}
                    </div>
                  ) : (
                    <textarea
                      value={sent}
                      onChange={e => setSentences(p => ({...p, [vid]: e.target.value}))}
                      placeholder={`Tulis kalimat menggunakan "${v.word}"...`}
                      rows={2}
                      style={{flex:1,padding:"10px 14px",background:inputBg,border:"1.5px solid "+(hasSent?"#c9a84c":inputBdr),borderRadius:8,fontSize:14,fontFamily:"'Source Serif 4',serif",color:dk?"#e8e4dc":"#1a1a1a",resize:"vertical",outline:"none",lineHeight:1.5,transition:"border .2s"}}
                    />
                  )}
                  <button
                    onClick={() => isSub ? handleEdit(vid) : handleSend(vid)}
                    disabled={!isSub && !hasSent}
                    title={isSub ? "Klik untuk edit" : "Simpan kalimat"}
                    style={{width:40,height:40,borderRadius:"50%",border:"none",cursor:(!isSub&&!hasSent)?"not-allowed":"pointer",background:isSub?"#2d6a4f":hasSent?"#c9a84c":"#d0c9bc",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s",boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}}
                  >
                    {isSub ? "✏" : "↑"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit all */}
      <div style={{marginTop:32,paddingTop:24,borderTop:"2px solid "+(dk?"#333":"#e8e2d8"),textAlign:"center"}}>
        {allSubmitted ? (
          <div style={{background:dk?"#1a2a1a":"#f0f9f0",border:"2px solid #2d6a4f",borderRadius:12,padding:"20px 24px"}}>
            <div style={{fontSize:28,marginBottom:8}}>🎉</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:dk?"#a3d9a5":"#1b4332",marginBottom:4}}>Latihan Selesai!</div>
            <div style={{fontSize:14,color:mutedClr}}>{Object.values(submitted).filter(Boolean).length} dari {vl.length} kalimat dibuat.</div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setAllSubmitted(true)}
              disabled={!allFilled}
              style={{padding:"14px 40px",background:allFilled?"#1a1a1a":"#d0c9bc",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:15,cursor:allFilled?"pointer":"not-allowed",fontFamily:"'Source Sans 3',sans-serif",transition:"all .2s",boxShadow:allFilled?"0 4px 16px rgba(0,0,0,0.2)":"none"}}
            >
              ✓ Submit Latihan
            </button>
            {!allFilled&&<p style={{fontSize:12,color:mutedClr,marginTop:8}}>Isi semua kalimat dulu sebelum submit</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// READING QUIZ
// ═══════════════════════════════════════
function ReadingQuiz({questions,dark:dk,onAnswersChange,onSubmit}){
  const [ans,setAns]=useState({});
  const [done,setDone]=useState(false);
  // Notify parent when answers change
  useEffect(() => {
    if (onAnswersChange) onAnswersChange(ans);
  }, [ans, onAnswersChange]);
  // Notify parent once the quiz is actually submitted
  useEffect(() => {
    if (done && onSubmit) onSubmit();
  }, [done, onSubmit]);
  const sc=useMemo(()=>done?questions.reduce((a,q)=>a+(ans[q.qid]===q.answer?1:0),0):0,[done,ans,questions]);
  const qBg=dk?"#1a1a1a":"#f5f1ea";const qBdr=dk?"#2a2a2a":"#e0d9cd";const qTxt=dk?"#f0ece4":"#1a1a1a";
  const oBg=dk?"#242424":"#fff";const oBdr=dk?"#333":"#d8d3c8";const oClr=dk?"#d4cfc8":"#333";
  return(
    <div style={{background:qBg,borderRadius:12,padding:"32px 28px",marginTop:48,border:"1px solid "+qBdr,transition:"background .3s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:qTxt,margin:0}}>Reading Comprehension Quiz</h3>
          <p style={{fontSize:13,color:dk?"rgba(240,236,228,0.4)":"#888",margin:"4px 0 0",fontFamily:"'Source Sans 3',sans-serif"}}>Test your understanding</p>
        </div>
        {done&&<div style={{background:sc===questions.length?"#2d6a4f":sc>=questions.length/2?C.gold:"#c1554d",color:"#fff",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:14}}>Score: {sc}/{questions.length}</div>}
      </div>
      {questions.map((q,qi)=>(
        <div key={q.qid} style={{marginBottom:28,paddingBottom:24,borderBottom:qi<questions.length-1?"1px solid "+qBdr:"none"}}>
          <p style={{fontSize:15,fontWeight:600,color:qTxt,marginBottom:14,lineHeight:1.5,fontFamily:"'Source Sans 3',sans-serif"}}><span style={{color:C.gold,marginRight:8}}>Q{qi+1}.</span>{q.question}</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {q.options.map((opt,oi)=>{
              const sel=ans[q.qid]===opt;const isA=q.answer===opt;
              let bg=oBg,bdr="1px solid "+oBdr,clr=oClr;
              if(done&&isA){bg="#e6f4ea";bdr="2px solid #2d6a4f";clr="#1b4332";}
              else if(done&&sel&&!isA){bg="#fce8e6";bdr="2px solid #c1554d";clr="#7c2d12";}
              else if(sel){bg=dk?"#2a2000":"#fef9ef";bdr="2px solid "+C.gold;clr=qTxt;}
              return(<button key={oi} onClick={()=>!done&&setAns(p=>({...p,[q.qid]:opt}))} style={{background:bg,border:bdr,color:clr,borderRadius:8,padding:"12px 16px",textAlign:"left",cursor:done?"default":"pointer",fontSize:14,lineHeight:1.45,fontFamily:"'Source Sans 3',sans-serif",transition:"all .15s"}}>
                <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",border:sel?"2px solid "+C.gold:"1.5px solid #bbb",marginRight:10,fontSize:11,fontWeight:700,background:sel?C.gold:"transparent",color:sel?"#fff":"#999"}}>{"ABCD"[oi]}</span>
                {opt}{done&&isA&&<span style={{float:"right"}}>✓</span>}{done&&sel&&!isA&&<span style={{float:"right"}}>✗</span>}
              </button>);
            })}
          </div>
        </div>
      ))}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
        {done&&<button onClick={()=>{setAns({});setDone(false);}} style={{background:"transparent",border:"1.5px solid "+C.gold,color:"#8b7355",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontWeight:600,fontSize:14}}>Try Again</button>}
        {!done&&<button onClick={()=>setDone(true)} disabled={Object.keys(ans).length<questions.length} style={{background:Object.keys(ans).length<questions.length?"#d0c9bc":"#1a1a1a",color:"#fff",border:"none",borderRadius:8,padding:"12px 32px",cursor:Object.keys(ans).length<questions.length?"not-allowed":"pointer",fontWeight:700,fontSize:14}}>Submit Answers</button>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ADD ARTICLE WIZARD
// ═══════════════════════════════════════
function AddArticleWizard({onCancel,onSave,existingIds}){
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({title:"",topics:"Science",level:"B",body:"",image:""});
  const [vList,setVList]=useState([{word:"",translation:"",pos:"Noun",context:""}]);
  const [qCount,setQCount]=useState(4);
  const [qList,setQList]=useState([]);
  const newId=useMemo(()=>{const nums=existingIds.map(id=>parseInt(id.replace(/\D/g,''))||0);return"A"+(Math.max(0,...nums)+1);},[existingIds]);
  const sI={width:"100%",padding:"10px 14px",border:"1.5px solid #d8d3c8",borderRadius:8,fontSize:14,fontFamily:"'Source Sans 3',sans-serif",background:"#fff",outline:"none"};
  const sT={...sI,minHeight:180,resize:"vertical",lineHeight:1.7,fontFamily:"'Source Serif 4',serif"};
  const sS={padding:"10px 14px",border:"1.5px solid #d8d3c8",borderRadius:8,fontSize:14,fontFamily:"'Source Sans 3',sans-serif",background:"#fff",outline:"none",cursor:"pointer"};
  const bP={padding:"11px 28px",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Source Sans 3',sans-serif"};
  const bS={...bP,background:"transparent",color:"#888",border:"1.5px solid #d8d3c8"};
  const lS={display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"};
  const ok1=form.title.trim()&&form.body.trim();
  const ok2=vList.every(v=>v.word.trim()&&v.translation.trim());
  const initQ=()=>{setQList(Array.from({length:qCount},()=>({question:"",options:["","","",""],answer:""})));setStep(4);};
  const uQ=(i,f,v)=>setQList(p=>p.map((q,j)=>j===i?{...q,[f]:v}:q));
  const uQO=(qi,oi,v)=>setQList(p=>p.map((q,j)=>j===qi?{...q,options:q.options.map((o,k)=>k===oi?v:o)}:q));
  const okSave=qList.length>0&&qList.every(q=>q.question.trim()&&q.options.every(o=>o.trim())&&q.answer.trim());
  const doSave=()=>{
    const art={id:newId,title:form.title.trim(),topics:form.topics,level:form.level,body:form.body.trim(),image:form.image.trim()||"https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800"};
    const vocs=vList.filter(v=>v.word.trim()).map((v,i)=>({aid:newId,vid:newId+"_V"+(i+1),word:v.word.trim(),translation:v.translation.trim(),pos:v.pos,context:v.context.trim()}));
    const quizzes=qList.filter(q=>q.question.trim()&&q.answer.trim()).map((q,i)=>({qid:newId+"_Q"+(i+1),aid:newId,question:q.question.trim(),options:q.options.map(o=>o.trim()),answer:q.answer.trim()}));
    onSave(art,vocs,quizzes);
  };
  const steps=["Article Details","Vocabulary","Quiz Setup","Quiz Questions"];
  return(
    <div style={{maxWidth:720,margin:"0 auto",padding:"32px 24px 80px",animation:"fadeUp .3s ease-out"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#1a1a1a",margin:0}}>Add New Article</h2>
        <button onClick={onCancel} style={bS}>Cancel</button>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:28}}>{steps.map((l,i)=>(<div key={i} style={{flex:1,textAlign:"center"}}><div style={{height:4,borderRadius:2,background:i+1<=step?"#1a1a1a":"#e0dcd5",marginBottom:6}}/><span style={{fontSize:10,fontWeight:i+1===step?700:500,color:i+1<=step?"#1a1a1a":"#aaa",textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</span></div>))}</div>
      {step===1&&<div style={{display:"flex",flexDirection:"column",gap:18}}>
        <div><label style={lS}>Title *</label><input style={sI} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Enter article title..."/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><label style={lS}>Category</label><select style={{...sS,width:"100%"}} value={form.topics} onChange={e=>setForm(p=>({...p,topics:e.target.value}))}>{["Science","Social","Lifestyle","Economics","Politics"].map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={lS}>Level</label><select style={{...sS,width:"100%"}} value={form.level} onChange={e=>setForm(p=>({...p,level:e.target.value}))}>{[["A","Beginner"],["B","Intermediate"],["C","Advanced"],["D","Expert"]].map(([v,l])=><option key={v} value={v}>{v} — {l}</option>)}</select></div>
        </div>
        <div><label style={lS}>Image URL (optional)</label><input style={sI} value={form.image} onChange={e=>setForm(p=>({...p,image:e.target.value}))} placeholder="https://..."/></div>
        <div><label style={lS}>Body Text *</label><textarea style={sT} value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))} placeholder="Paste full article. Separate paragraphs with blank lines."/><div style={{fontSize:11,color:"#aaa",marginTop:4}}>{form.body.split(/\s+/).filter(Boolean).length} words</div></div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button onClick={onCancel} style={bS}>Cancel</button><button onClick={()=>setStep(2)} disabled={!ok1} style={{...bP,opacity:ok1?1:0.4,cursor:ok1?"pointer":"not-allowed"}}>Next: Vocabulary →</button></div>
      </div>}
      {step===2&&<div>
        <p style={{fontSize:14,color:"#666",marginBottom:18}}>Add vocabulary words to highlight in the article.</p>
        {vList.map((v,i)=>(<div key={i} style={{background:i%2===0?"#fff":"#f9f6f0",border:"1px solid #e8e2d8",borderRadius:10,padding:"16px 18px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:12,fontWeight:700,color:"#8b7355"}}>Word {i+1}</span>{vList.length>1&&<button onClick={()=>setVList(p=>p.filter((_,j)=>j!==i))} style={{padding:"4px 10px",background:"transparent",color:"#c1554d",border:"1px solid #e8c0bc",borderRadius:6,fontSize:12,cursor:"pointer"}}>Remove</button>}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 100px",gap:10,marginBottom:8}}>
            <input style={sI} value={v.word} onChange={e=>{const n=[...vList];n[i].word=e.target.value;setVList(n);}} placeholder="English word"/>
            <input style={sI} value={v.translation} onChange={e=>{const n=[...vList];n[i].translation=e.target.value;setVList(n);}} placeholder="Indonesian"/>
            <select style={sS} value={v.pos} onChange={e=>{const n=[...vList];n[i].pos=e.target.value;setVList(n);}}>{["Noun","Verb","Adjective","Adverb","Preposition"].map(p=><option key={p}>{p}</option>)}</select>
          </div>
          <input style={sI} value={v.context} onChange={e=>{const n=[...vList];n[i].context=e.target.value;setVList(n);}} placeholder="Context sentence (optional)"/>
        </div>))}
        <button onClick={()=>setVList(p=>[...p,{word:"",translation:"",pos:"Noun",context:""}])} style={{width:"100%",padding:12,border:"2px dashed #d8d3c8",borderRadius:10,background:"transparent",color:"#8b7355",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:18}}>+ Add Another Word</button>
        <div style={{display:"flex",justifyContent:"space-between",gap:10}}><button onClick={()=>setStep(1)} style={bS}>← Back</button><button onClick={()=>setStep(3)} disabled={!ok2} style={{...bP,opacity:ok2?1:0.4,cursor:ok2?"pointer":"not-allowed"}}>Next: Quiz Setup →</button></div>
      </div>}
      {step===3&&<div style={{textAlign:"center",padding:"40px 0"}}>
        <div style={{fontSize:48,marginBottom:16}}>🧠</div>
        <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,marginBottom:8}}>Reading Comprehension Quiz</h3>
        <p style={{fontSize:14,color:"#666",marginBottom:28,maxWidth:400,margin:"0 auto 28px"}}>How many quiz questions?</p>
        <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:32}}>{[2,3,4,5,6].map(n=>(<button key={n} onClick={()=>setQCount(n)} style={{width:56,height:56,borderRadius:12,border:`2px solid ${qCount===n?"#1a1a1a":"#d8d3c8"}`,background:qCount===n?"#1a1a1a":"#fff",color:qCount===n?"#fff":"#333",fontFamily:"'DM Serif Display',serif",fontSize:22,cursor:"pointer"}}>{n}</button>))}</div>
        <div style={{display:"flex",justifyContent:"center",gap:10}}><button onClick={()=>setStep(2)} style={bS}>← Back</button><button onClick={initQ} style={bP}>Next: Write Questions →</button></div>
      </div>}
      {step===4&&<div>
        {qList.map((q,qi)=>(<div key={qi} style={{background:"#fff",border:"1px solid #e8e2d8",borderRadius:12,padding:"20px 22px",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:10}}>Question {qi+1} of {qCount}</div>
          <textarea style={{...sT,minHeight:70,marginBottom:12}} value={q.question} onChange={e=>uQ(qi,"question",e.target.value)} placeholder="Write question..."/>
          <div style={{fontSize:12,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Options (click radio for correct answer)</div>
          {q.options.map((opt,oi)=>(<div key={oi} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <input type="radio" name={"a"+qi} checked={q.answer===opt&&opt.trim()!==""} onChange={()=>uQ(qi,"answer",opt)} style={{accentColor:C.gold,width:18,height:18,cursor:"pointer"}}/>
            <span style={{width:22,height:22,borderRadius:6,background:"#f0ece4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#8b7355",flexShrink:0}}>{"ABCD"[oi]}</span>
            <input style={{...sI,flex:1}} value={opt} onChange={e=>{uQO(qi,oi,e.target.value);if(q.answer===q.options[oi])uQ(qi,"answer",e.target.value);}} placeholder={`Option ${"ABCD"[oi]}`}/>
          </div>))}
        </div>))}
        <div style={{display:"flex",justifyContent:"space-between",gap:10,marginTop:8}}><button onClick={()=>setStep(3)} style={bS}>← Back</button><button onClick={doSave} disabled={!okSave} style={{...bP,background:okSave?"#2d6a4f":"#ccc",cursor:okSave?"pointer":"not-allowed"}}>✓ Save Article</button></div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════
// READING MODULE
// ═══════════════════════════════════════
// Reading scroll progress bar
function ReadingProgressBar({ dark }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? Math.min(100, Math.round((scrolled / total) * 100)) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,height:3,background:"transparent",pointerEvents:"none"}}>
      <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#F39C12,#f5b942)",transition:"width .1s linear",borderRadius:"0 2px 2px 0",boxShadow:"0 0 8px rgba(243,156,18,0.6)"}}/>
    </div>
  );
}

// Topik dropdown untuk menu Reading Room
function TopikDropdown({ cat, setCat, dark }) {
  const [open, setOpen] = useState(false);
  const OTHER_TOPICS = ["Lifestyle","Economic","News","Education","Literature"];
  const isActive = OTHER_TOPICS.includes(cat);
  return (
    <div style={{position:"relative"}} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      <button style={{background:"none",border:"none",padding:"14px 18px",color:isActive?(dark?"#fff":"#1a1a1a"):(dark?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.45)"),fontFamily:"'Source Sans 3',sans-serif",fontSize:13,fontWeight:isActive?700:600,cursor:"pointer",borderBottom:isActive?"3px solid #F39C12":"3px solid transparent",transition:"all .15s",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
        {isActive ? cat : "Topik"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition:"transform .2s",transform:open?"rotate(180deg)":"none"}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"100%",left:0,background:dark?"#1e2a47":"#fff",borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,0.18)",minWidth:160,overflow:"hidden",border:"1px solid "+(dark?"rgba(255,255,255,0.08)":"#e5e7eb"),zIndex:200}}>
          {isActive&&<button onClick={()=>{setCat("all");setOpen(false);}} style={{display:"block",width:"100%",background:"none",border:"none",padding:"10px 16px",color:dark?"rgba(255,255,255,0.5)":"#9ca3af",fontFamily:"'Source Sans 3',sans-serif",fontSize:12,cursor:"pointer",textAlign:"left",borderBottom:"1px solid "+(dark?"rgba(255,255,255,0.06)":"#f3f4f6")}}>← Semua Topik</button>}
          {OTHER_TOPICS.map(t=>(
            <button key={t} onClick={()=>{setCat(t);setOpen(false);}} style={{display:"block",width:"100%",background:cat===t?(dark?"rgba(243,156,18,0.15)":"#FEF3CD"):"none",border:"none",padding:"11px 16px",color:cat===t?"#F39C12":(dark?"rgba(255,255,255,0.8)":"#374151"),fontFamily:"'Source Sans 3',sans-serif",fontSize:13,fontWeight:cat===t?700:500,cursor:"pointer",textAlign:"left",transition:"background .12s"}}
              onMouseEnter={e=>{if(cat!==t)e.currentTarget.style.background=dark?"rgba(255,255,255,0.05)":"#f9fafb";}}
              onMouseLeave={e=>{if(cat!==t)e.currentTarget.style.background="none";}}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ARTICLE LIST SKELETON (shown while sheets load & no cache yet)
// ═══════════════════════════════════════
function ArticleSkeleton({ dark }){
  const pulse={background:dark?"#2a2a2a":"#ece7de",borderRadius:6,animation:"skPulse 1.2s ease-in-out infinite"};
  return(
    <div style={{maxWidth:1100,margin:"0 auto",padding:"20px 24px 60px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:36,marginBottom:40,paddingBottom:40,borderBottom:"2px solid "+(dark?"#2a2a2a":"#e0dcd5")}}>
        <div style={{aspectRatio:"4/3",borderRadius:8,...pulse}}/>
        <div>
          <div style={{...pulse,width:90,height:12,marginBottom:14}}/>
          <div style={{...pulse,width:"78%",height:28,marginBottom:14}}/>
          <div style={{...pulse,width:"58%",height:28,marginBottom:18}}/>
          <div style={{...pulse,width:"100%",height:14,marginBottom:9}}/>
          <div style={{...pulse,width:"94%",height:14,marginBottom:9}}/>
          <div style={{...pulse,width:"72%",height:14}}/>
        </div>
      </div>
      {[0,1,2].map(i=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"230px 1fr",gap:24,marginBottom:28,paddingBottom:28,borderBottom:"1px solid "+(dark?"#2a2a2a":"#e0dcd5")}}>
          <div style={{aspectRatio:"16/10",borderRadius:8,...pulse}}/>
          <div>
            <div style={{...pulse,width:80,height:11,marginBottom:12}}/>
            <div style={{...pulse,width:"64%",height:20,marginBottom:12}}/>
            <div style={{...pulse,width:"100%",height:13,marginBottom:8}}/>
            <div style={{...pulse,width:"88%",height:13}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// PODCAST BUKU — rekomendasi podcast buku bahasa Indonesia
// ═══════════════════════════════════════
const PODCAST_BUKU = [
  { id:"ah", icon:"📚", title:"The Atomic Habits Workbook", author:"James Clear", year:"2025", desc:"Panduan praktis membangun kebiasaan baik dan menghentikan kebiasaan buruk lewat perubahan kecil yang konsisten.", url:"https://www.youtube.com/watch?v=EjsOVI6jhFs&list=PLVkOdA10Gcho" },
  { id:"sc", icon:"💬", title:"Supercommunicators", author:"Charles Duhigg", year:"2024", desc:"Membedah ilmu komunikasi: tiga jenis percakapan dan cara terhubung dengan siapa pun.", url:"https://www.youtube.com/watch?v=Ssp_6hXQrZE&list=PLVkOdA10Gcho&index=2" },
  { id:"lt", icon:"🕊️", title:"The Let Them Theory", author:"Mel Robbins", year:"2024", desc:"Filosofi melepas kendali atas orang lain agar kamu fokus pada yang bisa kamu kendalikan: dirimu sendiri.", url:"https://www.youtube.com/watch?v=U6LDy_WeQoQ&list=PLVkOdA10Gcho&index=3" },
  { id:"ps", icon:"🧩", title:"Problem Solving 101", author:"Ken Watanabe", year:"2007", desc:"Kerangka berpikir sederhana untuk memecahkan masalah dengan jernih, dari yang kecil hingga yang kompleks.", url:"https://www.youtube.com/watch?v=AiML-SkvXz4&list=PLVkOdA10Gcho&index=4" },
  { id:"wn", icon:"🌏", title:"Why Nations Fail", author:"Daron Acemoglu & James Robinson", year:"2012", desc:"Mengapa ada negara maju dan ada yang tertinggal? Kuncinya terletak pada institusi politik dan ekonominya.", url:"https://www.youtube.com/watch?v=I-hYerihcS4&list=PLVkOdA10Gcho&index=5" },
];

function PodcastSlider({ dark, onSeeMore }){
  const ref=useRef(null);
  const scroll=(dir)=>ref.current?.scrollBy({left:dir*220,behavior:"smooth"});
  const cardBg=dark?"#1a1a1a":"#fff";
  const bdrC=dark?"#333":"#eee";
  const txtP=dark?"#f0ece4":"#1a1a1a";
  const txtS=dark?"rgba(240,236,228,0.5)":"#718096";
  const btn=dark?"rgba(255,255,255,0.15)":"#fff";
  return(
    <div style={{position:"relative"}}>
      <div ref={ref} style={{display:"flex",gap:14,overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",padding:"2px 2px 10px"}}>
        {PODCAST_BUKU.map(p=>(
          <div key={p.id} onClick={()=>window.open(p.url,"_blank","noopener")} style={{flexShrink:0,width:200,background:cardBg,borderRadius:14,padding:18,border:"1px solid "+bdrC,cursor:"pointer",boxShadow:dark?"none":"0 4px 18px rgba(26,39,68,0.08)",transition:"all .18s",display:"flex",flexDirection:"column"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=dark?"0 6px 24px rgba(0,0,0,0.4)":"0 8px 24px rgba(26,39,68,0.14)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=dark?"none":"0 4px 18px rgba(26,39,68,0.08)";}}>
            <div style={{fontSize:30,marginBottom:12}}>{p.icon}</div>
            <div style={{fontWeight:700,fontSize:"0.85rem",color:txtP,marginBottom:4,lineHeight:1.3}}>{p.title}</div>
            <div style={{fontSize:"0.72rem",color:txtS}}>{p.author} · {p.year}</div>
          </div>
        ))}
        <div onClick={onSeeMore} style={{flexShrink:0,width:200,borderRadius:14,padding:18,cursor:"pointer",background:"linear-gradient(135deg,#1a2744,#243358)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,color:"#fff",textAlign:"center"}}>
          <span style={{fontSize:26}}>🎧</span>
          <span style={{fontSize:"0.85rem",fontWeight:700}}>Lebih banyak</span>
          <span style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.6)"}}>{PODCAST_BUKU.length} podcast buku</span>
          <span style={{fontSize:"1.2rem",color:"#F39C12",lineHeight:1}}>›</span>
        </div>
      </div>
      <button onClick={()=>scroll(-1)} aria-label="Geser kiri" style={{position:"absolute",left:-8,top:"46%",transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",background:btn,border:"1px solid "+(dark?"#444":"#d8d3c8"),color:txtP,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",zIndex:2}}>‹</button>
      <button onClick={()=>scroll(1)} aria-label="Geser kanan" style={{position:"absolute",right:-8,top:"46%",transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",background:btn,border:"1px solid "+(dark?"#444":"#d8d3c8"),color:txtP,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",zIndex:2}}>›</button>
    </div>
  );
}

function PodcastBukuPage({ onBack, dark }){
  const txtP=dark?"#f0ece4":"#1a1a1a";
  const txtS=dark?"rgba(240,236,228,0.55)":"#666";
  const bgCard=dark?"#1a1a1a":"#fff";
  const bdrC=dark?"#333":"#ddd";
  return(
    <div style={{minHeight:"100vh",background:dark?"#0f0f0f":"#faf7f2",fontFamily:"'Source Sans 3',sans-serif"}}>
      <div style={{position:"sticky",top:48,zIndex:100,background:dark?"rgba(15,15,15,0.97)":"rgba(250,247,242,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid "+bdrC,padding:"12px 0"}}>
        <div style={{maxWidth:900,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",gap:16}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:"#8b7355",fontFamily:"'Source Sans 3',sans-serif"}}>← Kembali</button>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:txtP}}>🎧 Podcast Buku</span>
        </div>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 24px 80px"}}>
        <p style={{fontSize:14,color:txtS,lineHeight:1.6,marginBottom:24,fontFamily:"'Source Serif 4',serif"}}>
          Rekomendasi podcast berbahasa Indonesia yang membahas buku, literasi, dan budaya membaca. Cocok menemani kamu belajar dan menambah wawasan.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
          {PODCAST_BUKU.map(p=>(
            <div key={p.id} style={{background:bgCard,borderRadius:14,padding:20,border:"1px solid "+bdrC,display:"flex",flexDirection:"column",boxShadow:dark?"none":"0 2px 12px rgba(26,39,68,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:"#FEF3CD",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{p.icon}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:txtP,lineHeight:1.3}}>{p.title}</div>
                  <div style={{fontSize:12,color:C.sage,fontWeight:600,marginTop:2}}>{p.author} · {p.year}</div>
                </div>
              </div>
              <p style={{fontSize:13,color:txtS,lineHeight:1.55,marginBottom:16,flex:1}}>{p.desc}</p>
              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,alignSelf:"flex-start",padding:"8px 16px",background:"#c4302b",color:"#fff",borderRadius:8,fontSize:12,fontWeight:700,textDecoration:"none",fontFamily:"'Source Sans 3',sans-serif"}}>▶ Tonton di YouTube</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReadingModule({ supabase, currentUser }){
  console.log("🔵 ReadingModule mounted");
  console.log("supabase:", supabase);
  console.log("currentUser:", currentUser);
  const [articles,setArticles]=useState(INIT_ARTICLES);
  const [artVocab,setArtVocab]=useState(INIT_AV);
  const [rdQuiz,setRdQuiz]=useState(INIT_QUIZ);
  const [cat,setCat]=useState("all");
  const [selArt,setSelArt]=useState(null);
  const [artTab,setArtTab]=useState("read");
  const [dark,setDark]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [checked,setChecked]=useState(new Set());
  const [editing,setEditing]=useState(null);
  const [editVal,setEditVal]=useState("");
  const [sheetsStatus,setSheetsStatus]=useState("idle"); // idle|loading|ok|error
  const [uploadStatus,setUploadStatus]=useState("");
  const [readingAns, setReadingAns] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [langMode, setLangMode] = useState("en"); // "en"|"id" body language toggle
  const [featuredIds, setFeaturedIds] = useState(new Set(["A1","A2","A3"])); // Featured top articles
  const [levelFilter, setLevelFilter] = useState("all"); // Level filter 1/2/3/4/all
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showPodcast, setShowPodcast] = useState(false); // "Podcast Buku" page
  const [completedIds, setCompletedIds] = useState(new Set()); // article ids whose quiz is already answered

  // Load which articles this user already finished the quiz for, so they can be hidden from the list
  useEffect(() => {
    if (!supabase || !currentUser) { setCompletedIds(new Set()); return; }
    supabase.from("reading_progress").select("article_id").eq("user_id", currentUser.id)
      .then(({ data, error }) => {
        if (error) { console.error("Error loading reading progress:", error); return; }
        setCompletedIds(new Set((data || []).map(r => r.article_id)));
      });
  }, [supabase, currentUser]);

  // Free access: non-logged-in users get first 2 articles of Level 1 + first 2 of Level 2
  const freeArticleIds = useMemo(() => {
    const lvl1 = articles.filter(a => a.level === "1").sort((a, b) => (b.date ? new Date(b.date) : new Date(0)) - (a.date ? new Date(a.date) : new Date(0))).slice(0, 2).map(a => a.id);
    const lvl2 = articles.filter(a => a.level === "2").sort((a, b) => (b.date ? new Date(b.date) : new Date(0)) - (a.date ? new Date(a.date) : new Date(0))).slice(0, 2).map(a => a.id);
    return new Set([...lvl1, ...lvl2]);
  }, [articles]);

  const isArticleFree = (a) => currentUser || freeArticleIds.has(a.id);

  const handleArticleClick = (a) => {
    if (isArticleFree(a)) { setSelArt(a); setReadingAns({}); setQuizSubmitted(false); } else { setShowLoginGate(true); }
  };
  // Fetch from Google Sheets on mount.
  // Strategy: show cached copy instantly (no blank space), then refresh in background.
  // Articles fetch first so the list appears ASAP; vocab+quiz fetch in parallel.
  useEffect(()=>{
    if(!GOOGLE_API_KEY||!SHEETS_ID){setSheetsStatus("idle");return;}
    let cancelled=false;

    const saveCache=(articles,vocab,quiz)=>{
      try{
        const prev=JSON.parse(localStorage.getItem(SHEETS_CACHE_KEY)||"{}");
        localStorage.setItem(SHEETS_CACHE_KEY, JSON.stringify({
          articles: articles??prev.articles??[],
          vocab: vocab??prev.vocab??[],
          quiz: quiz??prev.quiz??[]
        }));
      }catch(e){console.error("Cache save error:",e);}
    };

    // 1) Render cached data instantly → zero blank space on repeat visits
    try{
      const raw=localStorage.getItem(SHEETS_CACHE_KEY);
      if(raw){
        const c=JSON.parse(raw);
        if(c&&Array.isArray(c.articles)&&c.articles.length){
          setArticles(c.articles);
          setArtVocab(c.vocab||[]);
          setRdQuiz(c.quiz||[]);
          setSheetsStatus("ok");
        }
      }
    }catch(e){console.error("Cache read error:",e);}

    setSheetsStatus(s=>s==="ok"?"ok":"loading");

    // 2) Articles first — the list appears as soon as this resolves
    fetchSheet(SHEET_ARTICLES).then(artRows=>{
      if(cancelled)return;
      const {articles:a}=parseArticlesSheet(artRows||[]);
      if(a.length>0){setArticles(a);saveCache(a,null,null);setSheetsStatus("ok");}
      else{setSheetsStatus(s=>s==="ok"?"ok":"error");}
      console.log(`✅ Articles loaded: ${a.length}`);
    }).catch(e=>{
      console.error("❌ Articles sheet error:",e);
      if(!cancelled)setSheetsStatus("error");
    });

    // 3) Vocab + quiz in parallel, then finalize cache
    Promise.all([
      fetchSheet(SHEET_RD_VOCAB),
      fetchSheet(SHEET_RD_QUIZ)
    ]).then(([vocabRows,quizRows])=>{
      if(cancelled)return;
      const v=parseVocabSheetNew(vocabRows||[]);
      const q=parseQuizSheetNew(quizRows||[]);
      setArtVocab(v);
      setRdQuiz(q);
      saveCache(null,v,q);
      setSheetsStatus("ok");
      console.log(`✅ Vocab/quiz loaded: ${v.length}/${q.length}`);
    }).catch(e=>{
      console.error("❌ Vocab/quiz sheet error:",e);
      if(!cancelled)setSheetsStatus("error");
    });

    return()=>{cancelled=true;};
  },[]);

  // Admin: upload Excel for articles
  const handleArticleUpload=async(file)=>{
    setUploadStatus("Memproses file...");
    try{
      let rows;
      if(file.name.endsWith(".csv")){
        rows=await parseCsvFile(file);
      }else{
        const sheets=await parseExcelFile(file);
        // Use first sheet
        const firstSheet=Object.values(sheets)[0];
        rows=firstSheet;
      }
      if(!rows||!rows.length){setUploadStatus("❌ File kosong atau format tidak sesuai.");return;}
      // Normalize headers to lowercase
      rows=rows.map(r=>{const o={};Object.keys(r).forEach(k=>{o[k.trim().toLowerCase().replace(/\s+/g,"_")]=String(r[k]||"").trim();});return o;});
      const {articles:a,vocab:v,quiz:q}=parseArticlesSheet(rows);
      if(a.length===0){setUploadStatus("❌ Tidak ada artikel valid ditemukan. Pastikan ada kolom: id, title, body");return;}
      // If Sheets configured, try to append
      if(GOOGLE_API_KEY&&SHEETS_ID){
        setUploadStatus("Mengirim ke Google Sheets...");
        const artHeaders=["id","title","topics","level","body","image_url",
          ...Array.from({length:10},(_,i)=>[`vocab_${i+1}`,`trans_${i+1}`,`pos_${i+1}`,`context_${i+1}`]).flat(),
          ...Array.from({length:5},(_,i)=>[`q${i+1}_question`,`q${i+1}_a`,`q${i+1}_b`,`q${i+1}_c`,`q${i+1}_d`,`q${i+1}_answer`]).flat()
        ];
        try{
          await appendToSheet(SHEET_ARTICLES,artHeaders,rows);
          setUploadStatus(`✅ ${a.length} artikel berhasil dikirim ke Google Sheets!`);
        }catch(e){
          setUploadStatus(`⚠ Tersimpan lokal. Gagal kirim ke Sheets: ${e.message}`);
        }
      }else{
        setUploadStatus(`✅ ${a.length} artikel dimuat (lokal).`);
      }
      // Update local state
      setArticles(prev=>[...prev,...a]);
      setArtVocab(prev=>[...prev,...v]);
      setRdQuiz(prev=>[...prev,...q]);
    }catch(e){
      setUploadStatus(`❌ Error: ${e.message}`);
    }
  };

  const dk=dark;
  const lc={"1":"#2d6a4f","2":"#c9a84c","3":"#c1554d","4":"#6b21a8",A:"#2d6a4f",B:"#c9a84c",C:"#c1554d",D:"#6b21a8"};
  const ll={"1":"Level 1","2":"Level 2","3":"Level 3","4":"Level 4",A:"Level 1",B:"Level 2",C:"Level 3",D:"Level 4"};
  const gv=aid=>artVocab.filter(v=>v.aid===aid);
  const gq=aid=>rdQuiz.filter(q=>q.aid===aid);
  const filt=useMemo(()=>{
    let f=cat==="all"?articles:articles.filter(a=>a.topics.toLowerCase().includes(cat.toLowerCase()));
    if(levelFilter!=="all") f=f.filter(a=>a.level===levelFilter);
    f=f.filter(a=>!completedIds.has(a.id)); // hide articles whose quiz is already answered — they live in profile history instead
    // Sort by date descending (newest first)
    f=[...f].sort((a,b)=>{
      const da=a.date?new Date(a.date):new Date(0);
      const db=b.date?new Date(b.date):new Date(0);
      return db-da;
    });
    return f;
  },[articles,cat,levelFilter,completedIds]);

  const delChecked=()=>{if(checked.size===0)return;setArticles(p=>p.filter(a=>!checked.has(a.id)));setArtVocab(p=>p.filter(v=>!checked.has(v.aid)));setRdQuiz(p=>p.filter(q=>!checked.has(q.aid)));setChecked(new Set());};
  const togCheck=id=>setChecked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const togAll=()=>setChecked(p=>p.size===articles.length?new Set():new Set(articles.map(a=>a.id)));
  const startEdit=(id,f,v)=>{setEditing({id,f});setEditVal(v);};
  const saveEdit=()=>{if(!editing)return;setArticles(p=>p.map(a=>a.id===editing.id?{...a,[editing.f]:editVal}:a));setEditing(null);setEditVal("");};
  const onAddSave=(art,vocs,quizzes)=>{setArticles(p=>[...p,art]);setArtVocab(p=>[...p,...vocs]);setRdQuiz(p=>[...p,...quizzes]);setShowAdd(false);};

  // Theme vars
  const bg=dk?"#0f0f0f":"#faf7f2";
  const bgCard=dk?"#1a1a1a":"#fff";
  const navBg=dk?"rgba(15,15,15,0.97)":"rgba(250,247,242,0.97)";
  const navBtnBg=dk?"#fff":"#1a1a1a";
  const navBtnClr=dk?"#0f0f0f":"#faf7f2";
  const navInact=dk?"rgba(255,255,255,0.45)":"#666";
  const txtP=dk?"#f0ece4":"#1a1a1a";
  const txtS=dk?"rgba(240,236,228,0.55)":"#666";
  const txtM=dk?"rgba(240,236,228,0.35)":"#aaa";
  const bdrC=dk?"#333":"#ddd";
  const bdrS=dk?"#444":"#1a1a1a";
  const bdgBg=dk?"#2a2a2a":"#f0ece4";
  const bdgClr=dk?"#c9a84c":"#8b7355";
  const hintBg=dk?"rgba(201,168,76,0.1)":"#f0ece4";
  const footBg=dk?"#070707":"#1a1a1a";

  // Save reading progress to database — only once the quiz has actually been submitted,
  // so the article moves into profile history and disappears from the reading list.
  const saveReadingProgress = async () => {
    if (!supabase || !currentUser || !selArt || !quizSubmitted) return;
    if (gq(selArt.id).length === 0) return; // no quiz to answer — nothing to mark as completed

    try {
      const vocabCount = gv(selArt.id).length;
      const quizCount = Object.keys(readingAns || {}).length;

      const { error } = await supabase.from("reading_progress").upsert({
        user_id: currentUser.id,
        article_id: selArt.id,
        vocab_completed: vocabCount,
        quiz_answered: quizCount,
        completed_at: new Date().toISOString()
      }, { onConflict: "user_id,article_id" });

      if (error) throw error;
      setCompletedIds(prev => new Set(prev).add(selArt.id));
    } catch (err) {
      console.error("Error saving reading progress:", err);
    }
  };
  // ── PODCAST BUKU ──
  if(showPodcast)return(<PodcastBukuPage dark={dk} onBack={()=>setShowPodcast(false)}/>);

  // ── ADD WIZARD ──
  if(showAdd)return(
    <div style={{minHeight:"100vh",background:"#faf7f2",fontFamily:"'Source Sans 3',sans-serif"}}>
      <div style={{position:"sticky",top:48,zIndex:100,background:"rgba(250,247,242,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #e0dcd5",padding:"12px 0"}}>
        <div style={{maxWidth:780,margin:"0 auto",padding:"0 24px"}}><button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:"#8b7355",fontFamily:"'Source Sans 3',sans-serif"}}>← Back to Admin</button></div>
      </div>
      <AddArticleWizard onCancel={()=>setShowAdd(false)} onSave={onAddSave} existingIds={articles.map(a=>a.id)}/>
    </div>
  );

  // ── ADMIN ──
  if(showAdmin){
    const th={padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#8b7355",borderBottom:"2px solid #1a1a1a",whiteSpace:"nowrap"};
    const td={padding:"10px 14px",fontSize:13,borderBottom:"1px solid #e8e2d8",verticalAlign:"middle"};
    return(
      <div style={{minHeight:"100vh",background:"#faf7f2",fontFamily:"'Source Sans 3',sans-serif"}}>
        <div style={{position:"sticky",top:48,zIndex:100,background:"rgba(250,247,242,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #e0dcd5",padding:"12px 0"}}>
          <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>setShowAdmin(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:"#8b7355",fontFamily:"'Source Sans 3',sans-serif"}}>← Back to Reading</button>
            <div style={{display:"flex",gap:10}}>
              {checked.size>0&&<button onClick={delChecked} style={{padding:"8px 18px",background:"#c1554d",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>Delete ({checked.size})</button>}
              <button onClick={()=>setShowAdd(true)} style={{padding:"8px 18px",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add Article</button>
            </div>
          </div>
        </div>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px 80px"}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:"#1a1a1a",marginBottom:6}}>Article Manager</h2>
          <p style={{fontSize:14,color:"#888",marginBottom:24}}>Click Title or Category to edit inline.</p>
          <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 4px 24px rgba(26,39,68,0.08)",border:"1px solid #e8e2d8"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#f9f6f0"}}>
              <th style={{...th,width:40,textAlign:"center"}}><input type="checkbox" checked={checked.size===articles.length&&articles.length>0} onChange={togAll} style={{accentColor:C.gold,width:16,height:16,cursor:"pointer"}}/></th>
              <th style={{...th,width:70}}>Code</th><th style={th}>Title</th><th style={{...th,width:110}}>Category</th><th style={{...th,width:70}}>Level</th><th style={{...th,width:60,textAlign:"center"}}>Vocab</th><th style={{...th,width:50,textAlign:"center"}}>Quiz</th><th style={{...th,width:70,textAlign:"center"}}>Featured</th>
            </tr></thead><tbody>
              {articles.map((a,i)=>{const isSel=checked.has(a.id);return(
                <tr key={a.id} style={{background:isSel?"#fef9ef":i%2===0?"#fff":"#fdfcf9"}}>
                  <td style={{...td,textAlign:"center"}}><input type="checkbox" checked={isSel} onChange={()=>togCheck(a.id)} style={{accentColor:C.gold,width:16,height:16,cursor:"pointer"}}/></td>
                  <td style={{...td,fontFamily:"'DM Serif Display',serif",fontWeight:700,color:C.gold,fontSize:14}}>{a.id}</td>
                  <td style={td}>{editing?.id===a.id&&editing?.f==="title"?<div style={{display:"flex",gap:6}}><input value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&saveEdit()} style={{flex:1,padding:"6px 10px",border:"1.5px solid "+C.gold,borderRadius:6,fontSize:13,outline:"none"}}/><button onClick={saveEdit} style={{padding:"4px 10px",background:"#2d6a4f",color:"#fff",border:"none",borderRadius:6,fontSize:11,cursor:"pointer"}}>Save</button><button onClick={()=>setEditing(null)} style={{padding:"4px 8px",background:"#eee",border:"none",borderRadius:6,fontSize:11,cursor:"pointer"}}>✕</button></div>:<span onClick={()=>startEdit(a.id,"title",a.title)} style={{cursor:"pointer",fontWeight:600,fontSize:13,borderBottom:"1px dashed #ccc",paddingBottom:1}} title="Click to edit">{a.title}</span>}</td>
                  <td style={td}>{editing?.id===a.id&&editing?.f==="topics"?<div style={{display:"flex",gap:6}}><select value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus style={{padding:"6px 10px",border:"1.5px solid "+C.gold,borderRadius:6,fontSize:13,outline:"none",cursor:"pointer"}}>{["Science","Social","Lifestyle","Economics","Politics"].map(cc=><option key={cc}>{cc}</option>)}</select><button onClick={saveEdit} style={{padding:"4px 10px",background:"#2d6a4f",color:"#fff",border:"none",borderRadius:6,fontSize:11,cursor:"pointer"}}>Save</button><button onClick={()=>setEditing(null)} style={{padding:"4px 8px",background:"#eee",border:"none",borderRadius:6,fontSize:11,cursor:"pointer"}}>✕</button></div>:<span onClick={()=>startEdit(a.id,"topics",a.topics)} style={{cursor:"pointer",fontSize:12,fontWeight:600,color:"#8b7355",background:"#f0ece4",padding:"3px 10px",borderRadius:4,display:"inline-block"}} title="Click to edit">{a.topics}</span>}</td>
                  <td style={td}><span style={{fontSize:11,fontWeight:700,color:lc[a.level]||"#888",background:(lc[a.level]||"#888")+"18",padding:"3px 10px",borderRadius:4}}>Level {a.level}</span></td>
                  <td style={{...td,textAlign:"center",fontWeight:600,fontSize:13}}>{gv(a.id).length}</td>
                  <td style={{...td,textAlign:"center",fontWeight:600,fontSize:13}}>{gq(a.id).length}</td>
                  <td style={{...td,textAlign:"center"}}><button onClick={()=>setFeaturedIds(p=>{const n=new Set(p);n.has(a.id)?n.delete(a.id):n.size<3?n.add(a.id):null;return n;})} style={{padding:"4px 12px",background:featuredIds.has(a.id)?"#c9a84c":"#eee",color:featuredIds.has(a.id)?"#fff":"#999",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>{featuredIds.has(a.id)?"⭐ Yes":"No"}</button></td>
                </tr>);})}
            </tbody></table>
            {articles.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"#aaa"}}><div style={{fontSize:32,marginBottom:10}}>📭</div>No articles yet.</div>}
          </div>

          {/* SHEETS STATUS */}
          <div style={{marginTop:20,padding:"14px 18px",background:sheetsStatus==="ok"?"#e6f4ea":sheetsStatus==="error"?"#fce8e6":"#f5f1ea",borderRadius:10,border:"1px solid "+(sheetsStatus==="ok"?"#a5d6a7":sheetsStatus==="error"?"#e8c0bc":"#e0d9cd")}}>
            <div style={{fontSize:12,fontWeight:700,color:sheetsStatus==="ok"?"#2d6a4f":sheetsStatus==="error"?"#c1554d":"#8b7355",marginBottom:4}}>
              {sheetsStatus==="ok"?"✅ Terhubung ke Google Sheets":sheetsStatus==="error"?"❌ Gagal terhubung ke Google Sheets":sheetsStatus==="loading"?"⏳ Menghubungkan ke Google Sheets...":"⚠ Google Sheets belum dikonfigurasi"}
            </div>
            <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>
              {(!GOOGLE_API_KEY||!SHEETS_ID)?"Isi GOOGLE_API_KEY dan SHEETS_ID di App.jsx untuk mengaktifkan sinkronisasi.":"Sheet ID: "+SHEETS_ID.slice(0,12)+"..."}
            </div>
          </div>

          {/* UPLOAD ARTICLES */}
          <div style={{marginTop:24,padding:"24px 22px",background:"#fff",borderRadius:12,border:"1px solid #e8e2d8",boxShadow:"0 2px 12px rgba(26,39,68,0.05)"}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:4,color:"#1a1a1a"}}>📤 Import Artikel dari Excel/CSV</h3>
            <p style={{fontSize:12,color:"#888",marginBottom:14,lineHeight:1.5}}>Upload file Excel (.xlsx) atau CSV dengan kolom: <strong>id, title, topics, level, body, image_url, vocab_1, trans_1, pos_1, context_1, ... vocab_10, trans_10, pos_10, context_10, q1_question, q1_a, q1_b, q1_c, q1_d, q1_answer, ... q5_answer</strong></p>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <label style={{padding:"10px 20px",background:"#1a1a1a",color:"#fff",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                📁 Pilih File
                <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleArticleUpload(e.target.files[0]);e.target.value="";}}/>
              </label>
              {uploadStatus&&<span style={{fontSize:13,color:uploadStatus.startsWith("✅")?"#2d6a4f":uploadStatus.startsWith("❌")?"#c1554d":"#8b7355"}}>{uploadStatus}</span>}
            </div>
          </div>

          {/* UPLOAD VOCAB QUIZ */}
          <div style={{marginTop:16,padding:"24px 22px",background:"#fff",borderRadius:12,border:"1px solid #e8e2d8",boxShadow:"0 2px 12px rgba(26,39,68,0.05)"}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:4,color:"#1a1a1a"}}>🔤 Import Vocab Quiz dari Excel/CSV</h3>
            <p style={{fontSize:12,color:"#888",marginBottom:14,lineHeight:1.5}}>Upload file dengan kolom: <strong>word_en, translation_id, category</strong> (Verb/Noun/Adjective). Kata baru akan ditambahkan ke database vocab quiz.</p>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <label style={{padding:"10px 20px",background:C.sage,color:"#fff",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                📁 Pilih File Vocab
                <input type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={async e=>{
                  const f=e.target.files[0];if(!f)return;e.target.value="";
                  setUploadStatus("Memproses vocab...");
                  try{
                    let rows;
                    if(f.name.endsWith(".csv")){rows=await parseCsvFile(f);}
                    else{const sh=await parseExcelFile(f);rows=Object.values(sh)[0];}
                    if(!rows||!rows.length){setUploadStatus("❌ File kosong.");return;}
                    rows=rows.map(r=>{const o={};Object.keys(r).forEach(k=>{o[k.trim().toLowerCase().replace(/\s+/g,"_")]=String(r[k]||"").trim();});return o;});
                    const parsed=parseVocabSheet(rows);
                    if(!parsed.length){setUploadStatus("❌ Tidak ada vocab valid. Pastikan kolom: word_en, translation_id, category");return;}
                    // If Sheets configured, append
                    if(GOOGLE_API_KEY&&SHEETS_ID){
                      setUploadStatus("Mengirim ke Google Sheets...");
                      try{await appendToSheet(SHEET_VOCAB,["word_en","translation_id","category"],rows);setUploadStatus(`✅ ${parsed.length} kata berhasil dikirim ke Sheets!`);}
                      catch(err){setUploadStatus(`⚠ Lokal OK. Sheets error: ${err.message}`);}
                    }else{setUploadStatus(`✅ ${parsed.length} kata dimuat (lokal).`);}
                    // Dispatch event to update VocabModule
                    window.__vocabUpdate=parsed;
                    window.dispatchEvent(new Event("vocabUpdate"));
                  }catch(err){setUploadStatus(`❌ Error: ${err.message}`);}
                }}/>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ARTICLE VIEW ──
  if(selArt){
    const vl=gv(selArt.id);const ql=gq(selArt.id);
    return(
      <div style={{minHeight:"100vh",background:dk?"#111":"#faf7f2",fontFamily:"'Source Sans 3',sans-serif",transition:"background .3s"}}>
        {/* Reading Progress Bar */}
        {artTab==="read"&&<ReadingProgressBar dark={dk}/>}
        <div style={{position:"sticky",top:48,zIndex:100,background:dk?"rgba(17,17,17,0.97)":"rgba(250,247,242,0.95)",backdropFilter:"blur(10px)",borderBottom:`1px solid ${bdrC}`,padding:"12px 0"}}>
          <div style={{maxWidth:780,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
           <button onClick={async ()=>{
  await saveReadingProgress();
  setSelArt(null);
  setArtTab("read");
}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:"#8b7355",fontFamily:"'Source Sans 3',sans-serif"}}>← Back</button>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>setDark(d=>!d)} style={{padding:"5px 12px",background:dk?"#2a2a2a":"#f0ece4",border:`1px solid ${dk?"#444":"#d8d3c8"}`,borderRadius:6,fontSize:12,cursor:"pointer",color:dk?"#e8c87a":"#8b7355",fontWeight:600,fontFamily:"'Source Sans 3',sans-serif"}}>{dk?"☀":"🌙"}</button>
              {selArt.body_idn&&<div style={{display:"flex",background:dk?"#2a2a2a":"#e8e2d8",borderRadius:6,padding:2,gap:1}}>
                <button onClick={()=>setLangMode("en")} style={{padding:"4px 10px",background:langMode==="en"?(dk?"#555":"#fff"):"transparent",border:"none",borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:langMode==="en"?700:500,color:langMode==="en"?"#1a1a1a":"#888",transition:"all .15s"}}>🇬🇧 EN</button>
                <button onClick={()=>setLangMode("id")} style={{padding:"4px 10px",background:langMode==="id"?(dk?"#555":"#fff"):"transparent",border:"none",borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:langMode==="id"?700:500,color:langMode==="id"?"#1a1a1a":"#888",transition:"all .15s"}}>🇮🇩 ID</button>
              </div>}
              <div style={{display:"flex",background:dk?"#2a2a2a":"#e8e2d8",borderRadius:8,padding:3}}>
                {[{id:"read",label:"Read",icon:"📖"},{id:"vocab",label:"Vocabulary ("+vl.length+")",icon:"📝"},{id:"quiz",label:"Quiz ("+ql.length+")",icon:"🧠"}].map(t=>(
                  <button key={t.id} onClick={()=>setArtTab(t.id)} style={{background:artTab===t.id?bgCard:"transparent",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:artTab===t.id?700:500,color:artTab===t.id?txtP:"#888",fontFamily:"'Source Sans 3',sans-serif",boxShadow:artTab===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none",transition:"all .15s"}}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <article style={{maxWidth:780,margin:"0 auto",padding:"40px 24px 80px"}}>
          <span style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.14em",color:"#8b7355"}}>{selArt.topics}</span>
          <h1 style={{fontSize:42,fontWeight:700,lineHeight:1.1,margin:"16px 0 20px",fontFamily:"'Playfair Display',serif",color:txtP,transition:"color .3s"}}>{selArt.title}</h1>
          <div style={{paddingBottom:24,borderBottom:"1px solid "+bdrC,marginBottom:32}}>
            <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:lc[selArt.level]||"#888",background:(lc[selArt.level]||"#888")+"22",padding:"4px 12px",borderRadius:4}}>{ll[selArt.level]||"Level "+selArt.level}</span>
              {selArt.word_count&&<span style={{fontSize:11,color:txtM,background:dk?"#2a2a2a":"#f0ece4",padding:"3px 10px",borderRadius:4}}>{selArt.word_count} words</span>}
              <span style={{fontSize:11,color:"#8b7355",background:bdgBg,padding:"3px 10px",borderRadius:4}}>{vl.length} vocab · {ql.length} quiz</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:16,fontSize:13,color:txtS}}>
              {selArt.writers&&<span>✍ {selArt.writers}</span>}
              {selArt.source&&<span>📰 {selArt.source}</span>}
              {selArt.date&&<span>🗓 {String(selArt.date).split("T")[0]}</span>}
            </div>
          </div>
          <div style={{marginBottom:36,borderRadius:6,overflow:"hidden"}}><img src={selArt.image} alt="" style={{width:"100%",height:380,objectFit:"cover",filter:dk?"grayscale(30%) brightness(0.75)":"grayscale(8%)",transition:"filter .3s"}}/></div>

          {artTab==="read"&&<div>
            <div style={{background:hintBg,borderRadius:8,padding:"14px 18px",marginBottom:36,display:"flex",alignItems:"center",gap:10,fontSize:14,color:dk?"#c9a84c":"#6b5634",borderLeft:"4px solid #c9a84c"}}>
              <span style={{fontSize:18}}>📖</span><span><strong>{vl.length} kata penting</strong> ter-highlight di artikel ini. Klik kata bergaris bawah untuk melihat artinya.</span>
            </div>
            {langMode==="id"&&selArt.body_idn?(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,padding:"10px 14px",background:dk?"#1a2a1a":"#f0f9f0",borderRadius:8,border:"1px solid #2d6a4f44"}}>
                  <span>🇮🇩</span>
                  <span style={{fontSize:12,color:dk?"#a3d9a5":"#2d6a4f",fontWeight:600}}>Membaca dalam Bahasa Indonesia</span>
                  <button onClick={()=>setLangMode("en")} style={{marginLeft:"auto",fontSize:11,color:"#8b7355",background:"none",border:"1px solid #c9a84c",borderRadius:4,padding:"3px 8px",cursor:"pointer"}}>Switch ke 🇬🇧 EN</button>
                </div>
                {selArt.body_idn.split(/\n\n+|\n/).map(p=>p.trim()).filter(p=>p.length>0).map((p,i)=>(
                  <p key={i} style={{fontSize:18,lineHeight:1.7,marginBottom:22,color:dk?"#d4cfc8":"#2a2a2a",fontFamily:"'Source Serif 4','Georgia',serif",letterSpacing:"0.01em"}}>{p}</p>
                ))}
              </div>
            ):(
              <HighlightedText content={selArt.body} vocabList={vl} dark={dk}/>
            )}
          </div>}

          {artTab==="vocab"&&<VocabPracticeTab vl={vl} dark={dk} C={C} txtP={txtP} txtS={txtS} bdgBg={bdgBg} bgCard={bgCard} bdrC={bdrC}/>}
          {artTab==="quiz"&&<ReadingQuiz questions={ql} dark={dk} onAnswersChange={setReadingAns} onSubmit={()=>setQuizSubmitted(true)}/>}
        </article>
        <TranslatePanel dark={dk} apiKey={GOOGLE_API_KEY}/>
      </div>
    );
  }

  // ── READING HOME ──
  return(
    <div style={{minHeight:"100vh",background:bg,fontFamily:"'Source Sans 3',sans-serif",transition:"background .3s"}}>
      <div style={{textAlign:"center",padding:"36px 24px 8px",borderBottom:dk?"3px double #444":"3px double #1a1a1a",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:11,color:txtM,letterSpacing:"0.14em",textTransform:"uppercase"}}>English Reading Practice</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:48,fontWeight:900,color:txtP,letterSpacing:"-0.02em",marginBottom:6,lineHeight:1,transition:"color .3s"}}>The Reading Room</h1>
        <div style={{fontSize:13,color:txtM,fontFamily:"'Source Serif 4',serif",fontStyle:"italic",marginBottom:10}}>Baca, pelajari, dan perkaya kosakata Inggrismu</div>
      </div>

      {/* STICKY NAV: Saintek | Soshum | Topik dropdown | Dark/Light */}
      <div style={{position:"sticky",top:48,zIndex:150,background:navBg,backdropFilter:"blur(8px)",borderBottom:"1px solid "+(dk?"#2a2a2a":"#e0dcd5")}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 16px",display:"flex",alignItems:"center",gap:0}}>
          <button onClick={()=>setCat(cat==="Saintek"?"all":"Saintek")} style={{background:"none",border:"none",padding:"14px 18px",color:cat==="Saintek"?txtP:navInact,fontFamily:"'Source Sans 3',sans-serif",fontSize:13,fontWeight:cat==="Saintek"?700:600,cursor:"pointer",borderBottom:cat==="Saintek"?"3px solid #F39C12":"3px solid transparent",transition:"all .15s",whiteSpace:"nowrap"}}>Saintek</button>
          <button onClick={()=>setCat(cat==="Soshum"?"all":"Soshum")} style={{background:"none",border:"none",padding:"14px 18px",color:cat==="Soshum"?txtP:navInact,fontFamily:"'Source Sans 3',sans-serif",fontSize:13,fontWeight:cat==="Soshum"?700:600,cursor:"pointer",borderBottom:cat==="Soshum"?"3px solid #F39C12":"3px solid transparent",transition:"all .15s",whiteSpace:"nowrap"}}>Soshum</button>
          <TopikDropdown cat={cat} setCat={setCat} dark={dk}/>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <button onClick={()=>setDark(d=>!d)} style={{padding:"7px 14px",background:dk?"#2a2a2a":"#f0ece4",border:"1.5px solid "+(dk?"#444":"#d8d3c8"),borderRadius:7,fontSize:12,cursor:"pointer",color:dk?"#e8c87a":"#8b7355",fontWeight:600}}>{dk?"☀ Light":"🌙 Dark"}</button>
            {currentUser?.role==="admin"&&<button onClick={()=>setShowAdmin(true)} style={{padding:"7px 14px",background:"transparent",border:"1.5px solid "+(dk?"#444":"#d8d3c8"),borderRadius:7,fontSize:12,fontWeight:600,color:dk?"rgba(255,255,255,0.4)":"#8b7355",cursor:"pointer"}}>⚙</button>}
          </div>
        </div>
      </div>

      {/* INLINE FILTER: Level */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 24px 0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:11,fontWeight:700,color:txtM,textTransform:"uppercase",letterSpacing:"0.08em",marginRight:4}}>Level:</span>
        {[["all","Semua"],["1","Level 1"],["2","Level 2"],["3","Level 3"],["4","Level 4"]].map(([val,label])=>(
          <button key={val} onClick={()=>setLevelFilter(val)} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid "+(levelFilter===val?"#F39C12":(dk?"#444":"#d8d3c8")),background:levelFilter===val?"#F39C12":(dk?"#1a1a1a":"#fff"),color:levelFilter===val?"#fff":(dk?"rgba(255,255,255,0.6)":"#555"),fontSize:12,fontWeight:levelFilter===val?700:500,cursor:"pointer",transition:"all .15s"}}>
            {label}
          </button>
        ))}
        <span style={{marginLeft:"auto",fontSize:12,color:txtM}}>{filt.length} artikel</span>
      </div>

      {/* ARTICLE LIST */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px 24px 60px"}}>
        {sheetsStatus==="loading"&&filt.length===0&&<ArticleSkeleton dark={dk}/>}
        {filt.length===0&&sheetsStatus!=="loading"&&<div style={{textAlign:"center",padding:"60px 20px",color:txtM}}><div style={{fontSize:40,marginBottom:12}}>📭</div><div style={{fontSize:16,fontWeight:600,color:txtS}}>Tidak ada artikel di kategori ini</div></div>}
        {filt.map((a,i)=>{
          const vc=gv(a.id).length,qc=gq(a.id).length;
          if(i===0) return(
            <div key={a.id} onClick={()=>setSelArt(a)} style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:36,marginBottom:40,paddingBottom:40,borderBottom:"2px solid "+(dk?"#2a2a2a":"#e0dcd5"),cursor:"pointer"}}>
              <div style={{overflow:"hidden",borderRadius:8,aspectRatio:"4/3"}}><img src={a.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",filter:dk?"grayscale(30%) brightness(0.8)":"grayscale(8%)",transition:"transform .3s"}} onMouseEnter={e=>e.target.style.transform="scale(1.03)"} onMouseLeave={e=>e.target.style.transform="none"}/></div>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:bdgClr}}>{a.topics}</span>
                  <span style={{fontSize:10,fontWeight:700,color:lc[a.level]||"#888",background:(lc[a.level]||"#888")+"22",padding:"2px 9px",borderRadius:4}}>{ll[a.level]||"Level "+a.level}</span>
                </div>
                <h2 style={{fontSize:30,fontWeight:700,lineHeight:1.15,margin:"0 0 12px",fontFamily:"'Playfair Display',serif",color:txtP}}>{a.title}</h2>
                <p style={{fontSize:14,lineHeight:1.55,color:txtS,margin:"0 0 14px",fontFamily:"'Source Serif 4',serif",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.body.split("\n\n")[0]}</p>
                <div style={{display:"flex",gap:10,fontSize:11,color:txtM}}>
                  {a.date&&<span>🗓 {String(a.date).split("T")[0]}</span>}
                  {vc>0&&<span>📝 {vc} vocab</span>}
                  {qc>0&&<span>🧠 {qc} quiz</span>}
                </div>
              </div>
            </div>
          );
          return(
           <div key={a.id} onClick={()=>handleArticleClick(a)} style={{cursor:"pointer",borderBottom:"1px solid "+(dk?"#2a2a2a":"#eee"),paddingBottom:20,marginBottom:20,display:"flex",gap:18,transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,marginBottom:5,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:bdgClr}}>{a.topics}</span>
                  <span style={{fontSize:10,fontWeight:700,color:lc[a.level]||"#888",background:(lc[a.level]||"#888")+"22",padding:"2px 8px",borderRadius:4}}>{ll[a.level]||"Level "+a.level}</span>
                </div>
                <h3 style={{fontSize:20,fontWeight:700,lineHeight:1.25,margin:"4px 0 6px",fontFamily:"'Playfair Display',serif",color:txtP}}>{a.title}</h3>
                <p style={{fontSize:13,lineHeight:1.45,color:txtS,margin:"0 0 8px",fontFamily:"'Source Serif 4',serif",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.body.split("\n\n")[0]}</p>
                <div style={{display:"flex",gap:10,fontSize:11,color:txtM}}>
                  {a.date&&<span>🗓 {String(a.date).split("T")[0]}</span>}
                  {vc>0&&<span>📝 {vc} vocab</span>}
                  {qc>0&&<span>🧠 {qc} quiz</span>}
                </div>
              </div>
              {a.image&&<div style={{width:130,minWidth:130,height:95,overflow:"hidden",borderRadius:6,flexShrink:0}}><img src={a.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",filter:dk?"grayscale(30%) brightness(0.8)":"grayscale(8%)"}}/></div>}
            </div>
          );
        })}
      </div>
      {/* PODCAST BUKU — REKOMENDASI SLIDER */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
          <div>
            <div style={{fontSize:11,color:txtM,letterSpacing:"0.14em",textTransform:"uppercase"}}>Rekomendasi</div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:txtP,marginTop:2}}>🎧 Podcast Buku</h3>
          </div>
          <button onClick={()=>setShowPodcast(true)} style={{padding:"8px 16px",background:"none",border:"1.5px solid "+(dk?"#444":"#d8d3c8"),borderRadius:8,fontSize:12,fontWeight:600,color:dk?"rgba(255,255,255,0.7)":"#555",cursor:"pointer",fontFamily:"'Source Sans 3',sans-serif",whiteSpace:"nowrap"}}>Lebih banyak →</button>
        </div>
        <PodcastSlider dark={dk} onSeeMore={()=>setShowPodcast(true)}/>
      </div>
     {/* LOGIN GATE MODAL */}
      {showLoginGate&&<div onClick={()=>setShowLoginGate(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"40px 32px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔒</div>
          <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.4rem",color:"#1E2A47",marginBottom:10}}>Login untuk Membaca</h3>
          <p style={{color:"#6b7280",fontSize:14,lineHeight:1.6,marginBottom:8}}>Artikel ini hanya bisa diakses oleh pengguna yang sudah login.</p>
          <p style={{color:"#9ca3af",fontSize:12,lineHeight:1.6,marginBottom:24}}>Tanpa login, kamu bisa membaca 2 artikel Level 1 dan 2 artikel Level 2 secara gratis.</p>
          <button onClick={()=>setShowLoginGate(false)} style={{background:"none",border:"1px solid #d1d5db",color:"#6b7280",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>Nanti saja</button>
        </div>
      </div>}
      {/* LOGIN GATE MODAL */}
      {showLoginGate&&<div onClick={()=>setShowLoginGate(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"40px 32px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔒</div>
          <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.4rem",color:"#1E2A47",marginBottom:10}}>Login untuk Membaca</h3>
          <p style={{color:"#6b7280",fontSize:14,lineHeight:1.6,marginBottom:8}}>Artikel ini hanya bisa diakses oleh pengguna yang sudah login.</p>
          <p style={{color:"#9ca3af",fontSize:12,lineHeight:1.6,marginBottom:24}}>Tanpa login, kamu bisa membaca 2 artikel Level 1 dan 2 artikel Level 2 secara gratis.</p>
          <button onClick={()=>setShowLoginGate(false)} style={{background:"none",border:"1px solid #d1d5db",color:"#6b7280",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>Nanti saja</button>
        </div>
      </div>}
        {/* LOGIN GATE MODAL */}
      {showLoginGate&&<div onClick={()=>setShowLoginGate(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"40px 32px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔒</div>
          <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.4rem",color:"#1E2A47",marginBottom:10}}>Login untuk Membaca</h3>
          <p style={{color:"#6b7280",fontSize:14,lineHeight:1.6,marginBottom:8}}>Artikel ini hanya bisa diakses oleh pengguna yang sudah login.</p>
          <p style={{color:"#9ca3af",fontSize:12,lineHeight:1.6,marginBottom:24}}>Tanpa login, kamu bisa membaca 2 artikel Level 1 dan 2 artikel Level 2 secara gratis.</p>
          <button onClick={()=>setShowLoginGate(false)} style={{background:"none",border:"1px solid #d1d5db",color:"#6b7280",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>Nanti saja</button>
        </div>
      </div>}
      {/* LOGIN GATE MODAL */}
      {showLoginGate&&<div onClick={()=>setShowLoginGate(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"40px 32px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔒</div>
          <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.4rem",color:"#1E2A47",marginBottom:10}}>Login untuk Membaca</h3>
          <p style={{color:"#6b7280",fontSize:14,lineHeight:1.6,marginBottom:8}}>Artikel ini hanya bisa diakses oleh pengguna yang sudah login.</p>
          <p style={{color:"#9ca3af",fontSize:12,lineHeight:1.6,marginBottom:24}}>Tanpa login, kamu bisa membaca 2 artikel Level 1 dan 2 artikel Level 2 secara gratis.</p>
          <button onClick={()=>setShowLoginGate(false)} style={{background:"none",border:"1px solid #d1d5db",color:"#6b7280",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>Nanti saja</button>
        </div>
      </div>}
      <TranslatePanel dark={dk} apiKey={GOOGLE_API_KEY}/>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function App(){
  const [currentUser, setCurrentUser] = useState(null);
  const [mod, setMod] = useState("reading"); // vocab | reading | login | profile
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(()=>{
    const s=document.createElement("style");
    s.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap');
      @keyframes ttIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes skPulse{0%,100%{opacity:1}50%{opacity:.4}}
      *{box-sizing:border-box;margin:0;padding:0}
      ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}
    `;
    document.head.appendChild(s);
    return()=>document.head.removeChild(s);
  },[]);

  // Check session on mount — tanpa block render
  useEffect(() => {
    if (!supabase) { setSessionLoaded(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setCurrentUser(data.session.user);
      }
      setSessionLoaded(true);
    });
    // Listen for auth state changes (e.g. after OAuth redirect)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        setMod("reading");
      } else {
        setCurrentUser(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null);
    setMod("reading");
  };

  const Header = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const isModuleActive = mod === "vocab" || mod === "reading";
    return (
      <div style={{background:C.navyDark,padding:0,position:"sticky",top:0,zIndex:500}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",maxWidth:1200,margin:"0 auto"}}>
          {/* Home icon logo */}
          <div onClick={()=>setMod("reading")} title="Beranda" style={{display:"flex",alignItems:"center",padding:"14px 8px",cursor:"pointer",flexShrink:0}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={mod==="reading"?"#fff":"rgba(255,255,255,0.45)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
              <polyline points="9 21 9 12 15 12 15 21"/>
            </svg>
          </div>

          {/* Brand name */}
          <div onClick={()=>setMod("reading")} style={{cursor:"pointer",padding:"0 12px",flexShrink:0}}>
            <span style={{fontFamily:"'DM Serif Display',serif",color:"#fff",fontSize:"1.1rem"}}>Tumbuh<span style={{color:"#F39C12"}}>Academy</span></span>
          </div>

          {/* Nav */}
          <div style={{display:"flex",gap:0,flex:1,alignItems:"center"}}>
            {/* Mulai Yuk dropdown */}
            <div style={{position:"relative"}} onMouseEnter={()=>setDropdownOpen(true)} onMouseLeave={()=>setDropdownOpen(false)}>
              <button style={{background:"none",border:"none",padding:"16px 18px",color:isModuleActive?"#fff":"rgba(255,255,255,0.5)",fontFamily:"'DM Sans',sans-serif",fontSize:"0.82rem",fontWeight:isModuleActive?700:500,cursor:"pointer",borderBottom:isModuleActive?"3px solid #F39C12":"3px solid transparent",transition:"all .15s",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                Mulai Yuk
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition:"transform .2s",transform:dropdownOpen?"rotate(180deg)":"none"}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {dropdownOpen && (
                <div style={{position:"absolute",top:"100%",left:0,background:"#1e2a47",borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,0.35)",minWidth:180,overflow:"hidden",animation:"ttIn .15s ease-out",border:"1px solid rgba(255,255,255,0.08)"}}>
                  <button onClick={()=>{setMod("vocab");setDropdownOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:mod==="vocab"?"rgba(243,156,18,0.12)":"none",border:"none",padding:"12px 18px",color:mod==="vocab"?"#F39C12":"rgba(255,255,255,0.75)",fontFamily:"'DM Sans',sans-serif",fontSize:"0.83rem",cursor:"pointer",textAlign:"left",transition:"background .12s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
                    onMouseLeave={e=>e.currentTarget.style.background=mod==="vocab"?"rgba(243,156,18,0.12)":"none"}>
                    <span style={{fontSize:15}}>📝</span> Latihan Vocab
                  </button>
                  <div style={{height:1,background:"rgba(255,255,255,0.07)",margin:"0 12px"}}/>
                  <button onClick={()=>{setMod("reading");setDropdownOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:mod==="reading"?"rgba(243,156,18,0.12)":"none",border:"none",padding:"12px 18px",color:mod==="reading"?"#F39C12":"rgba(255,255,255,0.75)",fontFamily:"'DM Sans',sans-serif",fontSize:"0.83rem",cursor:"pointer",textAlign:"left",transition:"background .12s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
                    onMouseLeave={e=>e.currentTarget.style.background=mod==="reading"?"rgba(243,156,18,0.12)":"none"}>
                    <span style={{fontSize:15}}>📰</span> Ayo Reading!
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Auth area — name only, no Keluar button */}
          <div style={{display:"flex",alignItems:"center",flexShrink:0}}>
            {currentUser ? (
              <button onClick={()=>setMod("profile")} style={{background:"none",border:"none",padding:"8px 10px",color:mod==="profile"?"#fff":"rgba(255,255,255,0.6)",fontFamily:"'DM Sans',sans-serif",fontSize:"0.82rem",cursor:"pointer",borderBottom:mod==="profile"?"3px solid #F39C12":"3px solid transparent",transition:"all .15s",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(243,156,18,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#F39C12",fontWeight:700,flexShrink:0}}>
                  {(currentUser.user_metadata?.name||currentUser.email||"?")[0].toUpperCase()}
                </div>
                {currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "Profil"}
              </button>
            ) : (
              <button onClick={()=>setMod("login")} style={{background:"#F39C12",border:"none",padding:"8px 18px",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",borderRadius:8,whiteSpace:"nowrap",transition:"all .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#e08e0b"}
                onMouseLeave={e=>e.currentTarget.style.background="#F39C12"}>
                Masuk
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Tunggu session check selesai dulu sebelum render
  if (!sessionLoaded) return null;

  // Login page — tetap dengan header supaya bisa balik
  if (mod === "login") {
    return (
      <div>
        <Header />
        <LoginPage
          onLoginSuccess={(u) => { setCurrentUser(u); setMod("reading"); }}
          supabase={supabase}
        />
      </div>
    );
  }

  // Semua halaman utama — terbuka untuk semua, login tidak wajib
  return (
    <div>
      <Header />
      {mod === "vocab"    && <VocabModule supabase={supabase} currentUser={currentUser} />}
      {mod === "reading"  && <ReadingModule supabase={supabase} currentUser={currentUser} />}
      {mod === "profile"  && currentUser && <UserProfile user={currentUser} onLogout={handleLogout} supabase={supabase} />}
    </div>
  );
}