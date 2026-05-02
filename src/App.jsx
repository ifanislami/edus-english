import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════
// DATA — VOCAB
// ═══════════════════════════════════════
const DB_EN = [{"word": "govern", "meaning": "memerintah", "category": "Verb"}, {"word": "vowel", "meaning": "huruf vokal", "category": "Noun"}, {"word": "noun", "meaning": "kata benda", "category": "Noun"}, {"word": "pattern", "meaning": "pola", "category": "Noun"}, {"word": "figure", "meaning": "angka", "category": "Noun"}, {"word": "certain", "meaning": "pasti", "category": "Adjective"}, {"word": "science", "meaning": "ilmu pengetahuan", "category": "Noun"}, {"word": "machine", "meaning": "mesin", "category": "Noun"}, {"word": "example", "meaning": "contoh", "category": "Noun"}, {"word": "serve", "meaning": "melayani", "category": "Verb"}, {"word": "appear", "meaning": "muncul", "category": "Verb"}, {"word": "toward", "meaning": "menuju", "category": "Preposition"}, {"word": "several", "meaning": "beberapa", "category": "Adjective"}, {"word": "base", "meaning": "dasar", "category": "Noun"}, {"word": "mark", "meaning": "tanda", "category": "Noun"}, {"word": "rule", "meaning": "aturan", "category": "Noun"}, {"word": "notice", "meaning": "pemberitahuan", "category": "Noun"}, {"word": "power", "meaning": "kekuatan", "category": "Noun"}, {"word": "center", "meaning": "pusat", "category": "Noun"}, {"word": "contain", "meaning": "mengandung", "category": "Verb"}, {"word": "usual", "meaning": "biasa", "category": "Adjective"}, {"word": "develop", "meaning": "mengembangkan", "category": "Verb"}, {"word": "direct", "meaning": "langsung", "category": "Verb"}, {"word": "measure", "meaning": "mengukur", "category": "Verb"}, {"word": "produce", "meaning": "menghasilkan", "category": "Verb"}, {"word": "product", "meaning": "produk", "category": "Noun"}, {"word": "multiply", "meaning": "mengalikan", "category": "Noun"}, {"word": "numeral", "meaning": "angka", "category": "Noun"}, {"word": "complete", "meaning": "lengkap", "category": "Noun"}, {"word": "force", "meaning": "kekuatan", "category": "Noun"}, {"word": "surface", "meaning": "permukaan", "category": "Noun"}, {"word": "record", "meaning": "catatan", "category": "Noun"}, {"word": "possible", "meaning": "mungkin", "category": "Adjective"}, {"word": "wonder", "meaning": "keajaiban", "category": "Noun"}, {"word": "equate", "meaning": "menyamakan", "category": "Verb"}, {"word": "interest", "meaning": "minat", "category": "Noun"}, {"word": "reach", "meaning": "mencapai", "category": "Verb"}, {"word": "distant", "meaning": "jauh", "category": "Noun"}, {"word": "consider", "meaning": "mempertimbangkan", "category": "Noun"}, {"word": "century", "meaning": "abad", "category": "Noun"}, {"word": "language", "meaning": "bahasa", "category": "Noun"}, {"word": "among", "meaning": "di antara", "category": "Noun"}, {"word": "though", "meaning": "meskipun", "category": "Conjunction"}, {"word": "decide", "meaning": "memutuskan", "category": "Verb"}, {"word": "problem", "meaning": "masalah", "category": "Noun"}, {"word": "probable", "meaning": "kemungkinan", "category": "Noun"}, {"word": "section", "meaning": "bagian", "category": "Noun"}, {"word": "forest", "meaning": "hutan", "category": "Noun"}, {"word": "surprise", "meaning": "kejutan", "category": "Noun"}, {"word": "exercise", "meaning": "latihan", "category": "Noun"}, {"word": "field", "meaning": "bidang", "category": "Noun"}, {"word": "rest", "meaning": "istirahat", "category": "Noun"}, {"word": "correct", "meaning": "benar", "category": "Adjective"}, {"word": "able", "meaning": "mampu", "category": "Adjective"}, {"word": "beauty", "meaning": "keindahan", "category": "Noun"}, {"word": "enough", "meaning": "cukup", "category": "Noun"}, {"word": "plain", "meaning": "polos", "category": "Adjective"}, {"word": "stood", "meaning": "berdiri", "category": "Verb"}, {"word": "front", "meaning": "depan", "category": "Noun"}, {"word": "ready", "meaning": "siap", "category": "Noun"}, {"word": "quick", "meaning": "cepat", "category": "Noun"}, {"word": "ocean", "meaning": "lautan", "category": "Noun"}, {"word": "warm", "meaning": "hangat", "category": "Noun"}, {"word": "minute", "meaning": "menit", "category": "Noun"}, {"word": "strong", "meaning": "kuat", "category": "Noun"}, {"word": "behind", "meaning": "di belakang", "category": "Noun"}, {"word": "clear", "meaning": "jelas", "category": "Noun"}, {"word": "fact", "meaning": "fakta", "category": "Noun"}, {"word": "street", "meaning": "jalan", "category": "Noun"}, {"word": "short", "meaning": "pendek", "category": "Noun"}, {"word": "nothing", "meaning": "tidak ada", "category": "Verb"}, {"word": "course", "meaning": "kursus", "category": "Noun"}, {"word": "wind", "meaning": "angin", "category": "Noun"}, {"word": "happen", "meaning": "terjadi", "category": "Noun"}, {"word": "ship", "meaning": "kapal", "category": "Noun"}, {"word": "deep", "meaning": "dalam", "category": "Noun"}, {"word": "island", "meaning": "pulau", "category": "Noun"}, {"word": "busy", "meaning": "sibuk", "category": "Noun"}, {"word": "laugh", "meaning": "tertawa", "category": "Noun"}, {"word": "leave", "meaning": "meninggalkan", "category": "Noun"}, {"word": "half", "meaning": "setengah", "category": "Noun"}, {"word": "full", "meaning": "penuh", "category": "Noun"}, {"word": "soil", "meaning": "tanah", "category": "Noun"}, {"word": "engine", "meaning": "mesin", "category": "Noun"}, {"word": "vary", "meaning": "bervariasi", "category": "Verb"}, {"word": "value", "meaning": "nilai", "category": "Noun"}, {"word": "settle", "meaning": "menetap", "category": "Verb"}, {"word": "weight", "meaning": "berat", "category": "Noun"}, {"word": "general", "meaning": "umum", "category": "Adjective"}, {"word": "excite", "meaning": "menggembirakan", "category": "Noun"}, {"word": "sense", "meaning": "indera", "category": "Noun"}, {"word": "include", "meaning": "termasuk", "category": "Verb"}, {"word": "divide", "meaning": "membagi", "category": "Verb"}, {"word": "perhaps", "meaning": "mungkin", "category": "Adverb"}, {"word": "reason", "meaning": "alasan", "category": "Noun"}, {"word": "represent", "meaning": "mewakili", "category": "Verb"}, {"word": "observe", "meaning": "mengamati", "category": "Verb"}, {"word": "region", "meaning": "wilayah", "category": "Noun"}, {"word": "nation", "meaning": "negara", "category": "Noun"}, {"word": "person", "meaning": "orang", "category": "Noun"}, {"word": "always", "meaning": "selalu", "category": "Noun"}, {"word": "money", "meaning": "uang", "category": "Noun"}, {"word": "against", "meaning": "melawan", "category": "Preposition"}, {"word": "mountain", "meaning": "gunung", "category": "Noun"}, {"word": "war", "meaning": "perang", "category": "Noun"}, {"word": "begin", "meaning": "memulai", "category": "Noun"}, {"word": "lay", "meaning": "meletakkan", "category": "Noun"}, {"word": "both", "meaning": "keduanya", "category": "Noun"}, {"word": "often", "meaning": "sering", "category": "Noun"}, {"word": "letter", "meaning": "surat", "category": "Noun"}, {"word": "carry", "meaning": "membawa", "category": "Verb"}, {"word": "voice", "meaning": "suara", "category": "Noun"}, {"word": "lead", "meaning": "memimpin", "category": "Noun"}, {"word": "idea", "meaning": "gagasan", "category": "Noun"}, {"word": "press", "meaning": "menekan", "category": "Verb"}, {"word": "close", "meaning": "dekat", "category": "Noun"}, {"word": "real", "meaning": "nyata", "category": "Adjective"}, {"word": "under", "meaning": "di bawah", "category": "Noun"}, {"word": "north", "meaning": "utara", "category": "Noun"}, {"word": "state", "meaning": "keadaan", "category": "Verb"}, {"word": "between", "meaning": "antara", "category": "Noun"}, {"word": "thought", "meaning": "pikiran", "category": "Noun"}, {"word": "cover", "meaning": "menutupi", "category": "Noun"}, {"word": "plant", "meaning": "tanaman", "category": "Noun"}, {"word": "over", "meaning": "di atas", "category": "Noun"}, {"word": "been", "meaning": "telah", "category": "Noun"}, {"word": "take", "meaning": "mengambil", "category": "Noun"}, {"word": "made", "meaning": "membuat", "category": "Noun"}, {"word": "might", "meaning": "mungkin", "category": "Noun"}, {"word": "saw", "meaning": "melihat", "category": "Noun"}, {"word": "few", "meaning": "beberapa", "category": "Noun"}, {"word": "ease", "meaning": "memudahkan", "category": "Noun"}, {"word": "pull", "meaning": "menarik", "category": "Verb"}, {"word": "pair", "meaning": "pasangan", "category": "Noun"}, {"word": "else", "meaning": "lain", "category": "Adverb"}, {"word": "felt", "meaning": "merasa", "category": "Verb"}, {"word": "farm", "meaning": "pertanian", "category": "Noun"}, {"word": "grow", "meaning": "tumbuh", "category": "Noun"}, {"word": "tree", "meaning": "pohon", "category": "Noun"}, {"word": "hear", "meaning": "mendengar", "category": "Noun"}, {"word": "took", "meaning": "mengambil", "category": "Noun"}, {"word": "seem", "meaning": "tampak", "category": "Noun"}, {"word": "give", "meaning": "memberi", "category": "Adjective"}, {"word": "little", "meaning": "sedikit", "category": "Noun"}, {"word": "while", "meaning": "sementara", "category": "Noun"}, {"word": "far", "meaning": "jauh", "category": "Noun"}, {"word": "got", "meaning": "mendapatkan", "category": "Noun"}, {"word": "fall", "meaning": "jatuh", "category": "Noun"}, {"word": "experiment", "meaning": "eksperimen", "category": "Noun"}, {"word": "trade", "meaning": "perdagangan", "category": "Noun"}, {"word": "receive", "meaning": "menerima", "category": "Verb"}, {"word": "exact", "meaning": "tepat", "category": "Adjective"}, {"word": "weather", "meaning": "cuaca", "category": "Noun"}, {"word": "million", "meaning": "juta", "category": "Number"}, {"word": "scale", "meaning": "skala", "category": "Noun"}, {"word": "length", "meaning": "panjang", "category": "Noun"}, {"word": "temperature", "meaning": "suhu", "category": "Noun"}, {"word": "fraction", "meaning": "pecahan", "category": "Noun"}, {"word": "prove", "meaning": "membuktikan", "category": "Verb"}, {"word": "single", "meaning": "tunggal", "category": "Adjective"}, {"word": "mount", "meaning": "gunung", "category": "Noun"}, {"word": "iron", "meaning": "besi", "category": "Noun"}, {"word": "crease", "meaning": "lipatan", "category": "Noun"}, {"word": "silent", "meaning": "diam", "category": "Adjective"}, {"word": "probably", "meaning": "mungkin", "category": "Adverb"}, {"word": "straight", "meaning": "lurus", "category": "Adjective"}, {"word": "quiet", "meaning": "tenang", "category": "Adjective"}, {"word": "bottom", "meaning": "bawah", "category": "Noun"}, {"word": "edge", "meaning": "tepi", "category": "Noun"}, {"word": "except", "meaning": "kecuali", "category": "Preposition"}, {"word": "written", "meaning": "tertulis", "category": "Adjective"}, {"word": "present", "meaning": "hadir", "category": "Adjective"}, {"word": "coast", "meaning": "pantai", "category": "Noun"}, {"word": "heavy", "meaning": "berat", "category": "Adjective"}, {"word": "size", "meaning": "ukuran", "category": "Noun"}, {"word": "lie", "meaning": "berbohong", "category": "Verb"}, {"word": "case", "meaning": "kasus", "category": "Noun"}, {"word": "pick", "meaning": "memilih", "category": "Verb"}, {"word": "sudden", "meaning": "tiba-tiba", "category": "Adjective"}, {"word": "count", "meaning": "menghitung", "category": "Verb"}, {"word": "loud", "meaning": "keras", "category": "Adjective"}, {"word": "hunt", "meaning": "berburu", "category": "Verb"}, {"word": "ride", "meaning": "naik", "category": "Verb"}, {"word": "pay", "meaning": "membayar", "category": "Verb"}, {"word": "dress", "meaning": "gaun", "category": "Noun"}, {"word": "tiny", "meaning": "kecil", "category": "Adjective"}, {"word": "climb", "meaning": "memanjat", "category": "Verb"}, {"word": "lone", "meaning": "sendirian", "category": "Adjective"}, {"word": "poor", "meaning": "miskin", "category": "Adjective"}, {"word": "catch", "meaning": "menangkap", "category": "Verb"}, {"word": "flat", "meaning": "datar", "category": "Adjective"}, {"word": "joy", "meaning": "kegembiraan", "category": "Noun"}, {"word": "skin", "meaning": "kulit", "category": "Noun"}, {"word": "wild", "meaning": "liar", "category": "Adjective"}, {"word": "hole", "meaning": "lubang", "category": "Noun"}, {"word": "kept", "meaning": "menyimpan", "category": "Verb"}, {"word": "office", "meaning": "kantor", "category": "Noun"}, {"word": "sign", "meaning": "tanda", "category": "Noun"}, {"word": "least", "meaning": "paling sedikit", "category": "Adverb"}, {"word": "trouble", "meaning": "masalah", "category": "Noun"}, {"word": "bright", "meaning": "terang", "category": "Adjective"}, {"word": "shout", "meaning": "berteriak", "category": "Verb"}, {"word": "seed", "meaning": "benih", "category": "Noun"}, {"word": "indicate", "meaning": "menunjukkan", "category": "Verb"}, {"word": "require", "meaning": "memerlukan", "category": "Verb"}, {"word": "separate", "meaning": "terpisah", "category": "Adjective"}, {"word": "locate", "meaning": "menempatkan", "category": "Verb"}, {"word": "select", "meaning": "memilih", "category": "Verb"}, {"word": "provide", "meaning": "menyediakan", "category": "Verb"}, {"word": "supply", "meaning": "memasok", "category": "Verb"}, {"word": "collect", "meaning": "mengumpulkan", "category": "Verb"}, {"word": "gather", "meaning": "mengumpulkan", "category": "Noun"}, {"word": "prepare", "meaning": "mempersiapkan", "category": "Verb"}, {"word": "protect", "meaning": "melindungi", "category": "Verb"}, {"word": "expect", "meaning": "mengharapkan", "category": "Verb"}, {"word": "suggest", "meaning": "menyarankan", "category": "Verb"}, {"word": "describe", "meaning": "menggambarkan", "category": "Verb"}, {"word": "imagine", "meaning": "membayangkan", "category": "Verb"}, {"word": "stretch", "meaning": "meregangkan", "category": "Noun"}, {"word": "flow", "meaning": "mengalir", "category": "Verb"}, {"word": "equal", "meaning": "sama", "category": "Adjective"}, {"word": "throw", "meaning": "melempar", "category": "Noun"}, {"word": "wear", "meaning": "memakai", "category": "Verb"}, {"word": "share", "meaning": "berbagi", "category": "Noun"}, {"word": "form", "meaning": "membentuk", "category": "Noun"}, {"word": "improve", "meaning": "meningkatkan", "category": "Verb"}, {"word": "increase", "meaning": "meningkatkan", "category": "Noun"}, {"word": "experience", "meaning": "pengalaman", "category": "Noun"}, {"word": "continent", "meaning": "benua", "category": "Noun"}, {"word": "capital", "meaning": "ibu kota", "category": "Noun"}, {"word": "chance", "meaning": "kesempatan", "category": "Noun"}, {"word": "bear", "meaning": "beruang", "category": "Noun"}, {"word": "hope", "meaning": "berharap", "category": "Noun"}, {"word": "break", "meaning": "istirahat", "category": "Verb"}, {"word": "strange", "meaning": "aneh", "category": "Adjective"}, {"word": "rise", "meaning": "naik", "category": "Noun"}, {"word": "gone", "meaning": "pergi hilang", "category": "Noun"}, {"word": "blow", "meaning": "meniup", "category": "Verb"}, {"word": "root", "meaning": "akar", "category": "Noun"}, {"word": "mix", "meaning": "mencampur", "category": "Noun"}, {"word": "raise", "meaning": "meningkatkan", "category": "Verb"}, {"word": "solve", "meaning": "menyelesaikan", "category": "Noun"}, {"word": "write", "meaning": "menulis", "category": "Noun"}, {"word": "whether", "meaning": "apakah", "category": "Conjunction"}, {"word": "lost", "meaning": "tersesat", "category": "Noun"}, {"word": "push", "meaning": "mendorong", "category": "Noun"}, {"word": "shall", "meaning": "akan", "category": "Verb"}, {"word": "sent", "meaning": "dikirim", "category": "Noun"}, {"word": "held", "meaning": "diadakan", "category": "Noun"}, {"word": "choose", "meaning": "memilih", "category": "Noun"}, {"word": "cook", "meaning": "memasak", "category": "Noun"}, {"word": "fair", "meaning": "wajar", "category": "Adjective"}, {"word": "either", "meaning": "salah satu", "category": "Noun"}, {"word": "safe", "meaning": "aman", "category": "Adjective"}, {"word": "noise", "meaning": "bising", "category": "Noun"}, {"word": "shine", "meaning": "bersinar", "category": "Noun"}, {"word": "whose", "meaning": "milik siapa", "category": "Noun"}, {"word": "caught", "meaning": "menangkap", "category": "Verb"}, {"word": "repeat", "meaning": "mengulangi", "category": "Verb"}, {"word": "spoke", "meaning": "berbicara", "category": "Noun"}, {"word": "anger", "meaning": "kemarahan", "category": "Noun"}, {"word": "match", "meaning": "cocok", "category": "Noun"}, {"word": "wont", "meaning": "tidak akan", "category": "Noun"}, {"word": "afraid", "meaning": "takut", "category": "Adjective"}, {"word": "huge", "meaning": "sangat besar", "category": "Adjective"}, {"word": "danger", "meaning": "bahaya", "category": "Noun"}, {"word": "thick", "meaning": "tebal", "category": "Adjective"}, {"word": "forward", "meaning": "ke depan", "category": "Noun"}, {"word": "similar", "meaning": "mirip", "category": "Adjective"}, {"word": "guess", "meaning": "menebak", "category": "Verb"}, {"word": "necessary", "meaning": "perlu", "category": "Adjective"}, {"word": "sharp", "meaning": "tajam", "category": "Noun"}, {"word": "bought", "meaning": "membeli", "category": "Verb"}, {"word": "led", "meaning": "memimpin", "category": "Verb"}, {"word": "pitch", "meaning": "nada", "category": "Noun"}, {"word": "neighbor", "meaning": "tetangga", "category": "Noun"}, {"word": "rather", "meaning": "lebih", "category": "Adverb"}, {"word": "crowd", "meaning": "kerumunan", "category": "Noun"}, {"word": "rope", "meaning": "tali", "category": "Noun"}, {"word": "corn", "meaning": "jagung", "category": "Noun"}, {"word": "slip", "meaning": "terpeleset", "category": "Verb"}, {"word": "compare", "meaning": "membandingkan", "category": "Verb"}, {"word": "dream", "meaning": "mimpi", "category": "Noun"}, {"word": "string", "meaning": "benang", "category": "Verb"}, {"word": "depend", "meaning": "bergantung", "category": "Verb"}, {"word": "feed", "meaning": "memberi makan", "category": "Noun"}, {"word": "meat", "meaning": "daging", "category": "Noun"}, {"word": "rub", "meaning": "menggosok", "category": "Noun"}, {"word": "famous", "meaning": "terkenal", "category": "Adjective"}, {"word": "smell", "meaning": "mencium bau", "category": "Noun"}, {"word": "nor", "meaning": "maupun", "category": "Conjunction"}, {"word": "fear", "meaning": "takut", "category": "Noun"}, {"word": "sight", "meaning": "penglihatan", "category": "Noun"}, {"word": "thin", "meaning": "tipis", "category": "Adjective"}, {"word": "arrive", "meaning": "tiba", "category": "Verb"}, {"word": "track", "meaning": "jalur", "category": "Noun"}, {"word": "hurry", "meaning": "buru-buru", "category": "Noun"}, {"word": "mine", "meaning": "milikku", "category": "Noun"}, {"word": "tie", "meaning": "mengikat", "category": "Verb"}, {"word": "favor", "meaning": "bantuan", "category": "Noun"}, {"word": "major", "meaning": "utama", "category": "Adjective"}, {"word": "spend", "meaning": "menghabiskan", "category": "Noun"}, {"word": "glad", "meaning": "senang", "category": "Noun"}, {"word": "allow", "meaning": "mengizinkan", "category": "Noun"}, {"word": "charge", "meaning": "biaya", "category": "Noun"}, {"word": "suit", "meaning": "jas", "category": "Noun"}, {"word": "current", "meaning": "saat ini", "category": "Adjective"}, {"word": "lift", "meaning": "mengangkat", "category": "Noun"}, {"word": "offer", "meaning": "menawarkan", "category": "Noun"}, {"word": "chick", "meaning": "anak ayam", "category": "Noun"}, {"word": "enemy", "meaning": "musuh", "category": "Noun"}, {"word": "particular", "meaning": "khusus", "category": "Adjective"}, {"word": "occur", "meaning": "terjadi", "category": "Noun"}, {"word": "opposite", "meaning": "kebalikan", "category": "Noun"}, {"word": "spread", "meaning": "menyebar", "category": "Verb"}, {"word": "arrange", "meaning": "mengatur", "category": "Verb"}, {"word": "invent", "meaning": "menemukan", "category": "Verb"}, {"word": "meant", "meaning": "berarti", "category": "Verb"}, {"word": "born", "meaning": "lahir", "category": "Verb"}, {"word": "determine", "meaning": "menentukan", "category": "Verb"}];
const DB_ID = [{"word": "memerintah", "meaning": "govern"}, {"word": "huruf vokal", "meaning": "vowel"}, {"word": "kata benda", "meaning": "noun"}, {"word": "pola", "meaning": "pattern"}, {"word": "angka", "meaning": "figure"}, {"word": "pasti", "meaning": "certain"}, {"word": "ilmu pengetahuan", "meaning": "science"}, {"word": "mesin", "meaning": "machine"}, {"word": "contoh", "meaning": "example"}, {"word": "melayani", "meaning": "serve"}, {"word": "muncul", "meaning": "appear"}, {"word": "menuju", "meaning": "toward"}, {"word": "beberapa", "meaning": "several"}, {"word": "dasar", "meaning": "base"}, {"word": "tanda", "meaning": "mark"}, {"word": "aturan", "meaning": "rule"}, {"word": "pemberitahuan", "meaning": "notice"}, {"word": "kekuatan", "meaning": "power"}, {"word": "pusat", "meaning": "center"}, {"word": "mengandung", "meaning": "contain"}, {"word": "biasa", "meaning": "usual"}, {"word": "mengembangkan", "meaning": "develop"}, {"word": "langsung", "meaning": "direct"}, {"word": "mengukur", "meaning": "measure"}, {"word": "menghasilkan", "meaning": "produce"}, {"word": "produk", "meaning": "product"}, {"word": "mengalikan", "meaning": "multiply"}, {"word": "lengkap", "meaning": "complete"}, {"word": "permukaan", "meaning": "surface"}, {"word": "catatan", "meaning": "record"}, {"word": "mungkin", "meaning": "possible"}, {"word": "keajaiban", "meaning": "wonder"}, {"word": "menyamakan", "meaning": "equate"}, {"word": "minat", "meaning": "interest"}, {"word": "mencapai", "meaning": "reach"}, {"word": "jauh", "meaning": "distant"}, {"word": "mempertimbangkan", "meaning": "consider"}, {"word": "abad", "meaning": "century"}, {"word": "bahasa", "meaning": "language"}, {"word": "di antara", "meaning": "among"}, {"word": "meskipun", "meaning": "though"}, {"word": "memutuskan", "meaning": "decide"}, {"word": "masalah", "meaning": "problem"}, {"word": "kemungkinan", "meaning": "probable"}, {"word": "bagian", "meaning": "section"}, {"word": "hutan", "meaning": "forest"}, {"word": "kejutan", "meaning": "surprise"}, {"word": "latihan", "meaning": "exercise"}, {"word": "bidang", "meaning": "field"}, {"word": "istirahat", "meaning": "rest"}, {"word": "benar", "meaning": "correct"}, {"word": "mampu", "meaning": "able"}, {"word": "keindahan", "meaning": "beauty"}, {"word": "cukup", "meaning": "enough"}, {"word": "polos", "meaning": "plain"}, {"word": "berdiri", "meaning": "stood"}, {"word": "depan", "meaning": "front"}, {"word": "siap", "meaning": "ready"}, {"word": "cepat", "meaning": "quick"}, {"word": "lautan", "meaning": "ocean"}, {"word": "hangat", "meaning": "warm"}, {"word": "menit", "meaning": "minute"}, {"word": "kuat", "meaning": "strong"}, {"word": "di belakang", "meaning": "behind"}, {"word": "jelas", "meaning": "clear"}, {"word": "fakta", "meaning": "fact"}, {"word": "jalan", "meaning": "street"}, {"word": "pendek", "meaning": "short"}, {"word": "tidak ada", "meaning": "nothing"}, {"word": "kursus", "meaning": "course"}, {"word": "angin", "meaning": "wind"}, {"word": "terjadi", "meaning": "happen"}, {"word": "kapal", "meaning": "ship"}, {"word": "dalam", "meaning": "deep"}, {"word": "pulau", "meaning": "island"}, {"word": "sibuk", "meaning": "busy"}, {"word": "tertawa", "meaning": "laugh"}, {"word": "meninggalkan", "meaning": "leave"}, {"word": "setengah", "meaning": "half"}, {"word": "penuh", "meaning": "full"}, {"word": "tanah", "meaning": "soil"}, {"word": "mesin", "meaning": "engine"}, {"word": "bervariasi", "meaning": "vary"}, {"word": "nilai", "meaning": "value"}, {"word": "menetap", "meaning": "settle"}, {"word": "berat", "meaning": "weight"}, {"word": "umum", "meaning": "general"}, {"word": "menggembirakan", "meaning": "excite"}, {"word": "indera", "meaning": "sense"}, {"word": "termasuk", "meaning": "include"}, {"word": "membagi", "meaning": "divide"}, {"word": "alasan", "meaning": "reason"}, {"word": "mewakili", "meaning": "represent"}, {"word": "mengamati", "meaning": "observe"}, {"word": "wilayah", "meaning": "region"}, {"word": "negara", "meaning": "nation"}, {"word": "orang", "meaning": "person"}, {"word": "selalu", "meaning": "always"}, {"word": "uang", "meaning": "money"}, {"word": "melawan", "meaning": "against"}, {"word": "gunung", "meaning": "mountain"}, {"word": "perang", "meaning": "war"}, {"word": "memulai", "meaning": "begin"}, {"word": "meletakkan", "meaning": "lay"}, {"word": "keduanya", "meaning": "both"}, {"word": "sering", "meaning": "often"}, {"word": "surat", "meaning": "letter"}, {"word": "membawa", "meaning": "carry"}, {"word": "suara", "meaning": "voice"}, {"word": "memimpin", "meaning": "lead"}, {"word": "gagasan", "meaning": "idea"}, {"word": "menekan", "meaning": "press"}, {"word": "dekat", "meaning": "close"}, {"word": "nyata", "meaning": "real"}, {"word": "di bawah", "meaning": "under"}, {"word": "utara", "meaning": "north"}, {"word": "keadaan", "meaning": "state"}, {"word": "antara", "meaning": "between"}, {"word": "pikiran", "meaning": "thought"}, {"word": "menutupi", "meaning": "cover"}, {"word": "tanaman", "meaning": "plant"}, {"word": "di atas", "meaning": "over"}, {"word": "telah", "meaning": "been"}, {"word": "mengambil", "meaning": "take"}, {"word": "membuat", "meaning": "made"}, {"word": "melihat", "meaning": "saw"}, {"word": "memudahkan", "meaning": "ease"}, {"word": "menarik", "meaning": "pull"}, {"word": "pasangan", "meaning": "pair"}, {"word": "lain", "meaning": "else"}, {"word": "merasa", "meaning": "felt"}, {"word": "pertanian", "meaning": "farm"}, {"word": "tumbuh", "meaning": "grow"}, {"word": "pohon", "meaning": "tree"}, {"word": "mendengar", "meaning": "hear"}, {"word": "tampak", "meaning": "seem"}, {"word": "memberi", "meaning": "give"}, {"word": "sedikit", "meaning": "little"}, {"word": "sementara", "meaning": "while"}, {"word": "mendapatkan", "meaning": "got"}, {"word": "jatuh", "meaning": "fall"}, {"word": "eksperimen", "meaning": "experiment"}, {"word": "perdagangan", "meaning": "trade"}, {"word": "menerima", "meaning": "receive"}, {"word": "tepat", "meaning": "exact"}, {"word": "cuaca", "meaning": "weather"}, {"word": "juta", "meaning": "million"}, {"word": "skala", "meaning": "scale"}, {"word": "panjang", "meaning": "length"}, {"word": "suhu", "meaning": "temperature"}, {"word": "pecahan", "meaning": "fraction"}, {"word": "membuktikan", "meaning": "prove"}, {"word": "tunggal", "meaning": "single"}, {"word": "besi", "meaning": "iron"}, {"word": "lipatan", "meaning": "crease"}, {"word": "diam", "meaning": "silent"}, {"word": "lurus", "meaning": "straight"}, {"word": "tenang", "meaning": "quiet"}, {"word": "bawah", "meaning": "bottom"}, {"word": "tepi", "meaning": "edge"}, {"word": "kecuali", "meaning": "except"}, {"word": "tertulis", "meaning": "written"}, {"word": "hadir", "meaning": "present"}, {"word": "pantai", "meaning": "coast"}, {"word": "berat", "meaning": "heavy"}, {"word": "ukuran", "meaning": "size"}, {"word": "berbohong", "meaning": "lie"}, {"word": "kasus", "meaning": "case"}, {"word": "memilih", "meaning": "pick"}, {"word": "tiba-tiba", "meaning": "sudden"}, {"word": "menghitung", "meaning": "count"}, {"word": "keras", "meaning": "loud"}, {"word": "berburu", "meaning": "hunt"}, {"word": "naik", "meaning": "ride"}, {"word": "membayar", "meaning": "pay"}, {"word": "gaun", "meaning": "dress"}, {"word": "kecil", "meaning": "tiny"}, {"word": "memanjat", "meaning": "climb"}, {"word": "sendirian", "meaning": "lone"}, {"word": "miskin", "meaning": "poor"}, {"word": "menangkap", "meaning": "catch"}, {"word": "datar", "meaning": "flat"}, {"word": "kegembiraan", "meaning": "joy"}, {"word": "kulit", "meaning": "skin"}, {"word": "liar", "meaning": "wild"}, {"word": "lubang", "meaning": "hole"}, {"word": "menyimpan", "meaning": "kept"}, {"word": "kantor", "meaning": "office"}, {"word": "tanda", "meaning": "sign"}, {"word": "paling sedikit", "meaning": "least"}, {"word": "masalah", "meaning": "trouble"}, {"word": "terang", "meaning": "bright"}, {"word": "berteriak", "meaning": "shout"}, {"word": "benih", "meaning": "seed"}, {"word": "menunjukkan", "meaning": "indicate"}, {"word": "memerlukan", "meaning": "require"}, {"word": "terpisah", "meaning": "separate"}, {"word": "menempatkan", "meaning": "locate"}, {"word": "menyediakan", "meaning": "provide"}, {"word": "memasok", "meaning": "supply"}, {"word": "mengumpulkan", "meaning": "collect"}, {"word": "mempersiapkan", "meaning": "prepare"}, {"word": "melindungi", "meaning": "protect"}, {"word": "mengharapkan", "meaning": "expect"}, {"word": "menyarankan", "meaning": "suggest"}, {"word": "menggambarkan", "meaning": "describe"}, {"word": "membayangkan", "meaning": "imagine"}, {"word": "meregangkan", "meaning": "stretch"}, {"word": "mengalir", "meaning": "flow"}, {"word": "sama", "meaning": "equal"}, {"word": "melempar", "meaning": "throw"}, {"word": "memakai", "meaning": "wear"}, {"word": "berbagi", "meaning": "share"}, {"word": "membentuk", "meaning": "form"}, {"word": "meningkatkan", "meaning": "improve"}, {"word": "pengalaman", "meaning": "experience"}, {"word": "benua", "meaning": "continent"}, {"word": "ibu kota", "meaning": "capital"}, {"word": "kesempatan", "meaning": "chance"}, {"word": "beruang", "meaning": "bear"}, {"word": "berharap", "meaning": "hope"}, {"word": "aneh", "meaning": "strange"}, {"word": "meniup", "meaning": "blow"}, {"word": "akar", "meaning": "root"}, {"word": "mencampur", "meaning": "mix"}, {"word": "menyelesaikan", "meaning": "solve"}, {"word": "menulis", "meaning": "write"}, {"word": "apakah", "meaning": "whether"}, {"word": "tersesat", "meaning": "lost"}, {"word": "mendorong", "meaning": "push"}, {"word": "akan", "meaning": "shall"}, {"word": "dikirim", "meaning": "sent"}, {"word": "diadakan", "meaning": "held"}, {"word": "memasak", "meaning": "cook"}, {"word": "wajar", "meaning": "fair"}, {"word": "salah satu", "meaning": "either"}, {"word": "aman", "meaning": "safe"}, {"word": "bising", "meaning": "noise"}, {"word": "bersinar", "meaning": "shine"}, {"word": "milik siapa", "meaning": "whose"}, {"word": "mengulangi", "meaning": "repeat"}, {"word": "berbicara", "meaning": "spoke"}, {"word": "kemarahan", "meaning": "anger"}, {"word": "cocok", "meaning": "match"}, {"word": "tidak akan", "meaning": "wont"}, {"word": "takut", "meaning": "afraid"}, {"word": "sangat besar", "meaning": "huge"}, {"word": "bahaya", "meaning": "danger"}, {"word": "tebal", "meaning": "thick"}, {"word": "ke depan", "meaning": "forward"}, {"word": "mirip", "meaning": "similar"}, {"word": "menebak", "meaning": "guess"}, {"word": "perlu", "meaning": "necessary"}, {"word": "tajam", "meaning": "sharp"}, {"word": "membeli", "meaning": "bought"}, {"word": "nada", "meaning": "pitch"}, {"word": "tetangga", "meaning": "neighbor"}, {"word": "lebih", "meaning": "rather"}, {"word": "kerumunan", "meaning": "crowd"}, {"word": "tali", "meaning": "rope"}, {"word": "jagung", "meaning": "corn"}, {"word": "terpeleset", "meaning": "slip"}, {"word": "membandingkan", "meaning": "compare"}, {"word": "mimpi", "meaning": "dream"}, {"word": "benang", "meaning": "string"}, {"word": "bergantung", "meaning": "depend"}, {"word": "memberi makan", "meaning": "feed"}, {"word": "daging", "meaning": "meat"}, {"word": "menggosok", "meaning": "rub"}, {"word": "terkenal", "meaning": "famous"}, {"word": "mencium bau", "meaning": "smell"}, {"word": "maupun", "meaning": "nor"}, {"word": "penglihatan", "meaning": "sight"}, {"word": "tipis", "meaning": "thin"}, {"word": "tiba", "meaning": "arrive"}, {"word": "jalur", "meaning": "track"}, {"word": "buru-buru", "meaning": "hurry"}, {"word": "milikku", "meaning": "mine"}, {"word": "mengikat", "meaning": "tie"}, {"word": "bantuan", "meaning": "favor"}, {"word": "utama", "meaning": "major"}, {"word": "menghabiskan", "meaning": "spend"}, {"word": "senang", "meaning": "glad"}, {"word": "mengizinkan", "meaning": "allow"}, {"word": "biaya", "meaning": "charge"}, {"word": "jas", "meaning": "suit"}, {"word": "saat ini", "meaning": "current"}, {"word": "mengangkat", "meaning": "lift"}, {"word": "menawarkan", "meaning": "offer"}, {"word": "anak ayam", "meaning": "chick"}, {"word": "musuh", "meaning": "enemy"}, {"word": "khusus", "meaning": "particular"}, {"word": "kebalikan", "meaning": "opposite"}, {"word": "menyebar", "meaning": "spread"}, {"word": "mengatur", "meaning": "arrange"}, {"word": "menemukan", "meaning": "invent"}, {"word": "berarti", "meaning": "meant"}, {"word": "lahir", "meaning": "born"}, {"word": "menentukan", "meaning": "determine"}];

// ═══════════════════════════════════════
// DATA — READING
// ═══════════════════════════════════════
const INIT_ARTICLES = [{"id": "A1", "title": "The Intelligence of Plants", "topics": "Science", "body": "This article discusses the increasing evidence that plants have a form of intelligence. Talking to a co-author of a book on the subject, it explains why this is the case and why this hasn't really been researched into in the past. It also says what the importance of plants is to our survival and that we really need to start paying them more attention.\n\nPlants are intelligent. Plants deserve rights. Plants are like the Internet - or more accurately the Internet is like plants. To most of us these statements may sound, at best, insupportable or, at worst, crazy. But a new book, Amazing Plants: the Intelligence of plants, by plant neurobiologist (yes, plant neurobiologist), Stefano Rivili and journalist, Alessandra Vickers, makes a compelling and fascinating case not only for plant sentience and smarts, but also plant rights.\n\nFor centuries Western philosophy and science largely viewed animals as unthinking automatons, simple slaves to instinct. But research in recent decades has shattered that view. We now know that not only are chimpanzees, dolphins and elephants thinking, feeling and personality-driven beings, but many others are as well. Octopuses can use tools, whales sing, bees can count, crows demonstrate complex reasoning, paper wasps can recognise faces and fish can differentiate types of music. All these examples have one thing in common: they are animals with brains. But plants don't have a brain. How can they solve problems, act intelligently or respond to stimuli without a brain?\n\n\"Today's view of intelligence - as the product of the brain in the same way that urine is of the kidneys - is a huge oversimplification. A brain without a body produces the same amount of intelligence of the nut that it resembles,\" said Rivili, who as well as co-writing Amazing Plants, is the director of the Institute of Plant Neurobiology in Milan.\n\nAs radical as Rivili's ideas may seem, he's actually in good company. Charles Darwin, who studied plants meticulously for decades, was one of the first scientists to break from the crowd and recognise that plants move and respond to sensation - i.e., are sentient. Moreover, Darwin - who studied plants meticulously for most of his life, observed that the radicle - the root tip - \"acts like the brain of one of the lower animals.\"\n\nPlant problem solvers\n\nPlants face many of the same problems as animals, though they differ significantly in their approach. Plants have to find energy, reproduce and stave off predators. To do these things, Rivili argues, plants have developed smarts and sentience. \"Intelligence is the ability to solve problems and plants are amazingly good at solving their problems,\" Rivili noted. To solve their energy needs, most plants turn to the sun - in some cases literally. Plants are able to grow through shady areas to locate light and many even turn their leaves during the day to capture the best light. Some plants have taken a different route, however, supplying themselves with energy by preying on animals, including everything from insects to mice to even birds. The Venus flytrap may be the most famous of these, but there are at least 600 species of animal-eating flora. In order to do this, these plants have evolved complex lures and rapid reactions to catch, hold and devour animal prey.\n\nPlants also harness animals in order to reproduce. Many plants use complex trickery or provide snacks and advertisements (colours) to lure in pollinators, communicating either through direct deception or rewards. New research finds that some plants even distinguish between different pollinators and only germinate their pollen for the best.\n\nFinally, plants have evolved an incredible variety of toxic compounds to ward off predators. When attacked by an insect, many plants release a specific chemical compound. But they don't just throw out compounds, but often release the precious chemical only in the leaf that's under attack. Plants are both tricky and thrifty.\n\n\"Each choice a plant makes is based on this type of calculation: what is the smallest quantity of resources that will serve to solve the problem?\" Rivili and Vickers write in their book. In other words, plants don't just react to threats or opportunities, but must decide how far to react.\n\nThe bottom of the plant may be the most sophisticated of all though. Scientists have observed that roots do not flounder randomly but search for the best position to take in water, avoid competition and garner chemicals. In some cases, roots will alter course before they hit an obstacle, showing that plants are capable of \"seeing\" an obstacle through their many senses. Humans have five basic senses. But scientists have discovered that plants have at least 20 different senses used to monitor complex conditions in their environment. According to Rivili, they have senses that roughly correspond to our five, but also have additional ones that can do such things as measure humidity, detect gravity and sense electromagnetic fields.\n\nPlants are also complex communicators. Today, scientists know that plants communicate in a wide variety of ways. The most well known of these is chemical volatiles - why some plants smell so good and others awful - but scientists have also discovered that plants also communicate via electrical signals and even vibrations. \"Plants are wonderful communicators: they share a lot of information with neighbouring plants or with other organisms such as insects or other animals. The scent of a rose, or something less fascinating as the stench of rotting meat produced by some flowers, is a message for pollinators.\"\n\nMany plants will even warn others of their species when danger is near. If attacked by an insect, a plant will send a chemical signal to their fellows as if to say, \"hey, I'm being eaten - so prepare your defences.\" Researchers have even discovered that plants recognize their close kin, reacting differently to plants from the same parent as those from a different parent. \"In the last several decades science has been showing that plants are endowed with feeling, weave complex social relations and can communicate with themselves and with animals,\" write Rivili and Vickers, who also argue that plants show behaviours similar to sleeping and playing.\n\nAnd it turns out Darwin was likely right all along. Rivili has found rising evidence that the key to plant intelligence is in the radicle or root apex. Rivili and colleagues recorded the same signals given off from this part of the plant as those from neurons in the animal brain. One root apex may not be able to do much. But instead of having just one root, most plants have millions of individual roots, each with a single radicle.\n\nSo, instead of a single powerful brain, Rivili argues that plants have a million tiny computing structures that work together in a complex network, which he compares to the Internet. The strength of this evolutionary choice is that it allows a plant to survive even after losing 90% or more of its biomass. \"The main driver of evolution in plants was to survive the massive removal of a part of the body,\" said Rivili. \"Thus, plants are built of a huge number of basic modules that interact as nodes of a network. Without single organs or centralised functions plants may tolerate predation without losing functionality. The Internet was born for the same reason and, inevitably, reached the same solution.\"\n\nHaving a single brain - just like having a single heart or a pair of lungs - would make plants much easier to kill. \"This is why plants have no brain: not because they are not intelligent, but because they would be vulnerable,\" Rivili said. \"In this way, it may be better to think of a single plant as a colony, rather than an individual. Just as the death of one ant doesn't mean the demise of the colony, so the destruction of one leaf or one root means the plant still carries on.\"\n\nThe wide gulf\n\nSo, why has plant sentience - or if you don't buy that yet, plant behaviour - been ignored for so long? Rivili says this is because plants are so drastically different from us. For example, plants largely live on a different timescale than animals, moving and acting so slowly that we hardly notice they are, indeed, reacting to outside stimuli. Consequently, it is \"impossible\" for us to put ourselves in the place of a plant. \"We are too different; the fruit of two diverse evolutive tracks...plants would appear very different to us,\" he says. \"But at the same time, we have things in common with them too. For example, we both have the same needs to survive and we evolved on the same planet as well. We pretty much respond in the same way to the same impulses.\"\n\nBut due to these vast differences, Rivili says, plants fail to attract interest in the same way as, say, a tiger or an elephant. \"The love for plants is an adult love. It is almost impossible to find a baby interested in plants; they love animals,\" he said. \"No child thinks that a plant is funny. And for me it was no different: I began to be interested in plants during my doctorate when I realised that they were capable of surprising abilities.\"\n\nThis has resulted in very few researchers studying plant behaviour or intelligence, unlike queries into animals. \"Today the vast majority of the plant scientists are molecular biologists who know [as much] about the behaviour of plants as much as I know of cricket,\" said Rivili. \"We take plants for granted. Expecting that they will always be there, not worrying or even considering the possibility that one might not be.\"\n\nYet, humankind's disinterest and dispassion about plant behaviour and intelligence may be to our detriment, and put our own very survival at stake.\n\nTotally dependent on plants\n\nWhilst plants are by no means as diverse as the world's animals (no one beats beetles for diversity), they have truly conquered the world. Today, plants make up more than 99 percent of biomass on the planet. Think about that: this means all the world's animals - including ants, blue whales, and us - make up less than one percent. \"So we depend on plants, thus plant conservation is necessary for man's conservation,\" said Rivili.\n\nYet, human actions - including deforestation, habitat destruction, pollution, climate change, etc. - have ushered in a mass extinction crisis. While plants in the past have fared better in previous mass extinctions, there is no guarantee they will this time. \"Every day a consistent number of plant species that we have never encountered, disappears,\" noted Rivili.\n\nAt the same time, we don't even know for certain how many plant species exist on the planet. Currently, scientists have described around 20,000 species of plants. But there are probably more unknown than known. \"We have no idea about the number of plant species living on the planet. There are different estimates saying we know from 10 to 50% (no more) of the existing plants,\" said Rivili. Many of these could be wiped out without ever being described, especially as unexplored rainforests and cloud forest - the most biodiverse communities on the planet - continue to fall in places like Brazil, Indonesia, Malaysia, the Democratic Republic of the Congo and Papua New Guinea, among others.\n\nYet, we depend on plants not only for many of our raw materials and our food, but also for the oxygen we breathe and, increasingly it seems, the rain we require. Plants drive many of the biophysical forces that make the Earth habitable for humans - and all animals.\n\n\"Sentient or not sentient, intelligent or not, the life of the planet is green...The life on the Earth is possible just because plants exist,\" said Rivili. \"Is not a matter of preserving plants: plants will survive. The conservation implications are for humans: fragile and dependent organisms.\"\n\nStill, there are few big conservation groups working directly on plants - most target the bigger, fluffer and more publicly appealing animals. Much like plant behaviour research, plant conservation has been little-funded and long-ignored.\n\nRivili says the state of plant conservation and the rising evidence that plants are sentient beings should make people consider something really radical: plants' rights. \"It is my opinion that a discussion about plants' rights is no longer deferrable. I know that the first reaction, even of the more open-minded people, will be 'Jeez! He's exaggerating now. Plant's right is nonsense,' but should we not care? After all the reaction of the Romans' to the proposal of rights for women and children, was no different. The road to rights is always difficult, but it is necessary. Providing rights to plants is a way to prevent our extinction.\"\",\"lure, ward off, roughly, endowed with, take plants for granted, at stake, fared\"", "image": "https://images.newscientist.com/wp-content/uploads/2014/12/mg22429980.400-1_800.jpg", "level": "B"}, {"id": "A2", "title": "Superstitions and Their Strange Origins", "topics": "Social", "body": "Some superstitions are so ingrained in modern English-speaking societies that everyone, even scientists, succumb to them (or, at least, feel slightly uneasy about not doing so). So why don't we walk under ladders? Why, after voicing optimism, do we knock on wood? Why do non-religious people \"God bless\" a sneeze? And why do we avoid at all costs opening umbrellas indoors? Is there a logical explanation for them?\n\nIf you know what these superstitions originally emanated from, you'll find that there kind of is. And this is what you're going to learn below for both the aforementioned and five other common superstitious customs we have.\n\nIt's bad luck to open an umbrella indoors\n\nThough some historians tentatively trace this belief back to ancient Egyptian times, the superstitions that surrounded pharaohs' sunshades were actually quite different and probably unrelated to the modern-day one about rain gear. Most historians think the warning against unfurling umbrellas inside originated much more recently, in Victorian England.\n\nIn \"Extraordinary Origins of Everyday Things\", the scientist and author Charles Panati wrote: \"In eighteenth-century London, when metal-spoked waterproof umbrellas began to become a common rainy-day sight, their stiff, clumsy spring mechanism made them veritable hazards to open indoors. A rigidly spoked umbrella, opening suddenly in a small room, could seriously injure an adult or a child, or shatter a frangible object. Even a minor accident could provoke unpleasant words or a minor quarrel, themselves strokes of bad luck in a family or among friends. Thus, the superstition arose as a deterrent to opening an umbrella indoors.\"\n\nIt's bad luck to walk under a leaning ladder\n\nThis superstition really does originate 5,000 years ago in ancient Egypt. A ladder leaning against a wall forms a triangle, and Egyptians regarded this shape as sacred (as exhibited, for example, by their pyramids). To them, triangles represented the trinity of the gods, and to pass through a triangle was to desecrate them.\n\nThis belief wended its way up through the ages. \"Centuries later, followers of Jesus Christ usurped the superstition, interpreting it in light of Christ's death,\" Panati explained. \"Because a ladder had rested against the crucifix, it became a symbol of wickedness, betrayal, and death. Walking under a ladder courted misfortune.\"\n\nIn England in the 1600s, criminals were forced to walk under a ladder on their way to the gallows.\n\nA broken mirror gives you seven years of bad luck\n\nIn ancient Greece, it was common for people to consult \"mirror seers,\" who told their fortunes by analyzing their reflections. As the historian Milton Goldsmith explained in his book \"Signs, Omens and Superstitions\" (1918), \"divination was performed by means of water and a looking glass. This was called catoptromancy. The mirror was dipped into the water and a sick person was asked to look into the glass. If their image appeared distorted, they were likely to die; if clear, they would live.\"\n\nIn the first century A.D., the Romans added a caveat to the superstition. At that time, it was believed that people's health changed in seven year cycles. A distorted image resulting from a broken mirror therefore meant seven years of ill-health and misfortune, rather than outright death.\n\nWhen you spill salt, toss some over your left shoulder to avoid bad luck\n\nSpilling salt has been considered unlucky for thousands of years. Around 3,500 B.C., the ancient Sumerians first took to nullifying the bad luck of spilled salt by throwing a pinch of it over their left shoulders. This ritual spread to the Egyptians, the Assyrians and later, the Greeks.\n\nThe superstition ultimately reflects how much people prized (and still prize) salt as a seasoning for food. The etymology of the word \"salary\" shows how highly we value it. According to Panati: \"The Roman writer Petronius, in the Satyricon, originated 'not worth his salt' as opprobrium for Roman soldiers, who were given special allowances for salt rations, called salarium 'salt money' the origin of our word 'salary.'\"\n\nKnock on wood to prevent disappointment\n\nThough historians say this may be one of the most prevalent superstitious customs in the United States, its origin is very much in doubt. \"Some attribute it to the ancient religious rite of touching a crucifix when taking an oath,\" Goldsmith wrote. Alternatively, \"among the ignorant peasants of Europe it may have had its beginning in the habit of knocking loudly to keep out evil spirits.\"\n\nAlways'God bless' a sneeze\n\nIn most English-speaking countries, it is polite to respond to another person's sneeze by saying \"God bless you.\" Though incantations of good luck have accompanied sneezes across disparate cultures for thousands of years (all largely tied to the belief that sneezes expelled evil spirits), our particular custom began in the sixth century A.D. by explicit order of Pope Gregory the Great.\n\nA terrible pestilence was spreading through Italy at the time. The first symptom was severe, chronic sneezing, and this was often quickly followed by death. [Is It Safe to Hold In a Sneeze?]\n\nPope Gregory urged the healthy to pray for the sick, and ordered that light-hearted responses to sneezes such as \"May you enjoy good health\" be replaced by the more urgent \"God bless you!\" If a person sneezed when alone, the Pope recommended that they say a prayer for themselves in the form of \"God help me!\"\n\nHang a horseshoe on your door open-end-up for good luck\n\nThe horseshoe is considered to be a good luck charm in a wide range of cultures. Belief in its magical powers traces back to the Greeks, who thought the element iron had the ability to ward off evil. Not only were horseshoes wrought of iron, they also took the shape of the crescent moon in fourth century Greece for the Greeks, a symbol of fertility and good fortune.\n\nThe belief in the talismanic powers of horseshoes passed from the Greeks to the Romans, and from them to the Christians. In the British Isles in the Middle Ages, when fear of witchcraft was rampant, people attached horseshoes open-end-up to the sides of their houses and doors. People thought witches feared horses, and would shy away from any reminders of them.\n\nA black cat crossing your path is lucky/unlucky\n\nMany cultures agree that black cats are powerful omens but do they signify good or evil?\n\nThe ancient Egyptians revered all cats, black and otherwise, and it was there that the belief began that a black cat crossing your path brings good luck. Their positive reputation is recorded again much later, in the early seventeenth century in England: King Charles I kept (and treasured) a black cat as a pet. Upon its death, he is said to have lamented that his luck was gone. The supposed truth of the superstition was reinforced when he was arrested the very next day and charged with high treason.\n\nDuring the Middle Ages, people in many other parts of Europe held quite the opposite belief. They thought black cats were the \"familiars,\" or companions, of witches, or even witches themselves in disguise, and that a black cat crossing your path was an indication of bad luck a sign that the devil was watching you. This seems to have been the dominant belief held by the Pilgrims when they came to America, perhaps explaining the strong association between black cats and witchcraft that exists in the country to this day.\n\nThe number 13 is unlucky\n\nFear of the number 13, known as \"triskaidekaphobia,\" has its origins in Norse mythology. In a well-known tale, 12 gods were invited to dine at Valhalla, a magnificent banquet hall in Asgard, the city of the gods. Loki, the god of strife and evil, crashed the party, raising the number of attendees to 13. The other gods tried to kick Loki out, and in the struggle that ensued, Balder, the favorite among them, was killed.\n\nScandinavian avoidance of 13-member dinner parties, and dislike of the number 13 itself, spread south to the rest of Europe. It was reinforced in the Christian era by the story of the Last Supper, at which Judas, the disciple who betrayed Jesus, was the thirteenth guest at the table.\n\nMany people still shy away from the number, but there is no statistical evidence that 13 is unlucky.\",\"ingrained, succumb to, a caveat, disparate, rampant, revered, ensued\"", "image": "https://assets.clevelandclinic.org/transform/LargeFeatureImage/29f05965-2c70-4f7b-be45-3812afbcce2a/black-cat-1369187854", "level": "B"}, {"id": "A3", "title": "Jordan: A Spectacular Country with Unfortunately too Few Tourists", "topics": "Social, Lifestyle", "body": "\"You are safe and sound here,\" the gift shop owner said, as he handed over some change. At breakfast, the waiter had been similarly reassuring. \"I always tell my guests they are in a very safe place. There might be issues around the corner,\" he said, pouring out tea. \"But here you are perfectly safe.\"\n\nAfter a while these repeated reassurances began to have the opposite than desired effect, and actually became rather disconcerting. I hadn't expected to find Jordan anything other than peaceful, but since the bottom has fallen out of the tourism industry because of the conflict in neighbouring Syria, most people you meet have an urge to emphasise how risk-free a trip here is.\n\nIt's easy to see why. Thanks to the widespread sense of unease about travelling to the region, Jordan, as well as being safe, is now extremely empty. Some of the country's most extraordinary sites are virtually deserted; tourism has fallen 66% since 2011. As a tourist, you can't help feeling worried for the people who depend for their livelihood on the travel industry (which has historically contributed about 20% of GDP), but at the same time there is an uneasy pleasure in visiting places like Petra, one of the new seven wonders of the world, in near silence.\n\nNothing had prepared me for how spectacular Jordan is, and perhaps part of the intense experience of visiting now is tied up with the unusually solitary feeling you have as you walk through its ancient sites.\n\nAfter a late-night arrival in Amman with Rose, my 12-year-old daughter, we set off early and drove through the desert to Petra, arriving late morning. When tourism here was at its peak, there were as many as 3,000 visitors every day. On the day we visited in late October, only 300 people went through the gates. This meant that walking in the Siq, the natural gorge that leads through red sandstone rocks to the vast classical Treasury building, carved into the rockface in the first century BC, felt very peaceful. There were no crowds with selfie-sticks, no umbrella-waving tour guides. It was the most unafrazling experience, which allowed us to look at the scenery and see it as it has been for centuries.\n\nConservations' concerns, referred to in my now out-of-date Lonely Planet Guide, about mass tourism in Petra - the pernicious effects of humidity and the damage wrought by thousands of feet trampling up the steps cut into the rock - are no longer so acute.\n\nWe had only one day in Petra, but there was so much we wanted to see that we walked 12 miles, racing around in the heat to pack everything in, overwhelmed and stupefied by the quantity of beautiful tombs and facades. Guidebook photographs do no justice at all to the splendour of the site, the monumental architectural talent of the Nabateans (the nomadic people who built Petra) and the mesmerising way sunlight changes the colour of the rock as the day progresses, from orange to pink and, with dusk, to shadowy grey. This vast settlement is truly extraordinary. The canyon alone and the sudden, amazing reveal of the Treasury is enough in itself to justify a visit, but this is only the beginning.\n\nWe hurriedly climbed 700 steps up to the Monastery, a temple or tomb carved into the mountain summit, drinking hot, sugary mint tea at the top in a cafe offering a view over the whole site. The cafe owner appeared bemused by the reluctance of tourists to come. \"It's perfectly safe here; there are no terrorists here. But people have stopped coming,\" he told us.\n\nThe Foreign Office travel advice notes that there is \"a high threat from terrorism\" in Jordan - but it makes the same warning about Egypt, and also Germany and France.\n\nJordan's defensiveness has built up over the past 15 years, as its location, sandwiched between Syria, Iraq, Palestine, Israel and Egypt, has conspired to discourage visitors. First there was the Intifada of 2000, then 9/11, then the war in Iraq. Then, just as things were beginning to pick up, in 2008 there was the global recession and, later, the violent aftermath of the Arab Spring, culminating in a civil war in Syria. The key thing to remember is that the Foreign Office website does not advise against travel to anywhere except a two-mile strip along the Syrian border (which is far from tourist sites); it also notes that 60,820 British nationals visited Jordan in 2015 and that most visits are trouble-free.\n\nWe had lunch at a restaurant under a canopy of trees at the centre of the site. Towards the end of the day, we walked around the back of the site, up another 670 steps, past tombs and Bedouin houses, to the High Place of Sacrifice - the exposed mountain plateau where the Nabateans performed religious rituals. A long twisting trail leads to the summit. We arrived at sunset having passed only four other tourists on the way up. The cafe near the top was closed - last year's price list faded and flapping in the breeze and only a goat inside. Dotted everywhere were groups of camels sitting on the ground, their legs tucked beneath them, with no customers.\n\nThere was some bitterness at the fickle nature of the global tourist market. \"A bomb goes off in Turkey and people think 'We shouldn't visit Jordan,' \" a jewellery seller said. A man selling bottles of sand with camel shapes formed from different coloured layers, said this was the worst year since 2002, mournfully displaying the blown sand vases that are no longer selling. His friend's hotel had just closed and his business was very slow.\n\nWe walked back down at dusk, hurrying to make sure we were on flat ground before the light disappeared completely. There was no one else in the courtyard in front of the Treasury, and we walked silently up the Siq in the half light, watching the shadows creep up the rock, until it was totally dark. We heard the sound of donkeys being led back to their stables, but barely saw them in the darkness. As we reached the end of the gorge, we saw the beginnings of preparations for Petra by Night, with candles being lit so tourists can walk along in the late evening.\n\nWe stayed at the lovely Petra Palace (doubles/twins from 57 B&B) in Wadi Musa, just a few hundred metres from the entrance to the site, and ate in a cafe a few doors down, enjoying small plates of hummus, kibbeh (fried lamb meatballs), baba ganoush (chargrilled aubergine), tabouleh and stuffed vine leaves.\n\nOn our second day we drove for two hours down to Wadi Rum, the spectacular desert that T E Lawrence described as \"vast, echoing and godlike\", with its rocks like melted wax emerging on the skyline, their colours shifting in the light and alien shapes forming from the cavities. We hired a guide, Abdullah, who drove us to sand dunes where we could climb the rocks for amazing views and later we set up camp at the foot of a sandstone cliff. Abdullah made a fire and cooked meatand-vegetable stew and potatoes, which we ate by torchlight, and then rolled out carpets on the sand so we could bed down in sleeping bags in the open. We woke up before dawn to watch the sunrise over the rocks, and walked up one of the cliffs before a breakfast of sesame paste halva and tea.\n\nLater in the week we travelled to the Dead Sea for a night, where there were just a handful of people floating in the salty water when we arrived at dusk, and then 30 miles north of Amman to see Jerash, a huge Graeco-Roman settlement, with theatres, colonnades, a hippodrome, triumphal arches, squares and mosaics depicting scenes of daily life - all well-preserved after an earthquake in 749 buried the ruins in sand for centuries. It felt such a privilege to see this remarkable place so empty - so unlike the jostling experience of walking through the Forum in Rome. In a time when Peru has set a limit on the number of people walking the Inca Trail, and residents in Venice are protesting against tourist numbers, visiting Jordan feels like being transported back to another era, before charter flights and package holidays. When we arrived at 9.30am, there was one tour bus in the car park. It got busier towards lunchtime, but most of the time we were alone among the amphitheatres and plazas. We drank cardamom coffee in the Temple of Artemis, watching lizards dart out from between the Corinthian columns, while a stray kitten tried to climb into my handbag.\n\nJordan clearly needs tourists to return. The big chain hotels are managing to weather the storm by shifting marketing to locals, but the smaller businesses are suffering. \"Before 2011, 70% of our business came from Russia, Scandinavia, Germany and the UK. Now that has shifted to 70% of our business coming from Jordan, Lebanon, Palestine and expat Iraqis,\" the manager of Dead Sea Kempinski told me. \"The bigger hotels can shift to weddings and the local market, but those who are most affected are the people selling trinkets.\"\n\nThe Jordanian Tourism Board is fighting back in imaginative ways. It recently brought a group of film producers and directors over from Los Angeles to show them the country's superb film locations. It has encouraged Instagram stars to come and post picturesque scenes from the desert. They like to remind visitors of the number of films made in Jordan, from Lawrence of Arabia to Theeb, which won the Bafta for best foreign film last year, to The Martian and Indiana Jones and the Last Crusade. The board is optimistic for 2017; UK visitors are already up 6% this year and the Russian market is up 1,200% .\n\nJordan is home to 635,000 refugees from Syria, 80,000 of them in the Zaatar refugee camp in the north of the country, and the World Bank has estimated that about a third of the country's nine million population is made up of refugees - Palestinians and Iraqis as well as Syrians.\n\nThe country's attitude towards the crisis is in marked contrast to that of some other nations. \"We welcome refugees: they are our relatives,\" said our guide in Jerash, Talal Omar. \"We have a long history together and we speak the same language. You having a good holiday in Jordan is helping Jordan tackle that issue. The money that tourists bring in to our country helps pay the overheads we have from the refugees.\"\n\nI'm not sure that going on holiday in Jordan can be presented as directly aiding the refugee crisis, but certainly the reverse is true - that the absence of tourism is hugely problematic for the country.\",\"disconcerting, livelihood, stupefied, mesmerising, bemused, culminating in, weather the storm\"", "image": "https://images.travelandleisureasia.com/wp-content/uploads/sites/3/2024/05/07182400/Temple-of-Hercules-1-1600x900.jpg", "level": "C"}, {"id": "A4", "title": "The Myth of Meritocracy in Education", "topics": "Social", "body": "This article argues that the belief that both success in education is largely based on merit (i.e. based on hard work and/or ability) and that it helps to make fairer society is wrong. Through examining a number of countries, it explains how the educational system in those countries reinforces the existing social order (benefiting those from more affluent backgrounds and men). It ends by suggesting some things that can be done to make education fairer to all members of society.\n\nThe idea of meritocracy has long pervaded conversations about how economic growth occurs in the United States. The concept is grounded in the belief that our economy rewards the most talented and innovative, regardless of gender, race, socioeconomic status, and the like. Individuals who rise to the top are supposed to be the most capable of driving organizational and economic performance.\n\nMore recently, however, concerns about the actual effects of meritocracies are rising. In the case of gender, research across disciplines shows that believing an organization or its policies are meritbased makes it easier to overlook the subconscious operation of bias. People in such organizations assume that everything is already meritocratic, and so there is no need for self-reflection or scrutiny of organizational processes. In fact, psychologists have found that emphasizing the value of merit can actually lead to more bias in favor men.\n\nIronically, despite growing recognition of the pitfalls of meritocracy for women and minorities, the concept has been exported to developing countries through economic policies, multilateral development programs, and the globalization of media and curricula. In countries with deep social divisions like India, where the number of women in the workforce dropped 11.4 percent between 1993 and 2012, the mantra of meritocracy has taken hold as a potential means to overcome these divides and drive economic growth - especially in education.\n\nEconomist Claudia Goldin wrote in the Journal of Interdisciplinary History that when it comes to education, historically, \"Americans equate a meritocracy with equality of opportunity and an open, forgiving, and publicly funded school system for all. To Americans, education has been the great equalizer, and generator, of a just meritocracy.\" This idea also pervades economic development and policy circles. India, a society once famous for its caste inequality and number of \"missing women,\" has embraced the value of meritocracy for the modern economy and now touts its success in advancing merit over historic prejudices in education. Since 2010, the Right to Education Act has guaranteed free schooling for all Indian children up to age 14, and by 2013, 92 percent of children, nearly half of them girls, were enrolled in primary school, up from 79 percent in 2002.\n\nAnd yet equal access to schools does not guarantee that the best and brightest will succeed. During fieldwork in the Indian Himalayas between 2014 and 2015, we observed the poor quality of education available to local children. Teachers were frequently absent from school, buildings lacked proper sanitation, and parents often had to pay additional fees despite government mandates. Rote memorization was a common teaching method, and many children had difficulty answering questions that were not in the same format they learned. Studies by academics and the United Nations Development Programme show similar problems in schools serving poor and rural communities across India. Students at these schools do not receive the same quality of education as their wealthy, urban peers, making it more difficult for them to succeed on merit.\n\nIndians also hold up their exam-based university admission system as an example of meritocracy - university acceptance is based only on exam scores. This belief in meritocracy may allow Indians to overlook continuing disparities in acceptance rates and the underrepresentation of women in STEM fields. To be accepted at elite Indian universities, students must score in the top percentiles of national exams. But achieving a good exam score is not solely based on merit because of differential access to resources. Liberalization in the education sector has created a boom in private schools across India, as well as a thriving educational services industry. Private tutors, after-school courses, test prep centers, and accelerated English programs abound, promising to give children the extra edge they need to pass university entrance tests. Students from privileged backgrounds with expensive private educations, highly educated parents, and the resources to access test prep services consistently score higher on national exams than others.\n\nGender exacerbates these class differences, particularly in terms of admission to elite STEM institutions - the Indian Institutes of Technology, or IITs. Only 8 percent of students at IITs are women, though a much higher percentage of women study STEM subjects in high school. Fewer women attend coaching classes in preparation for the IIT entrance exam, making them less likely to receive sufficient admission scores. This underrepresentation seems to be due partly to the belief, also common in the United States and elsewhere, that women are less suited to technical jobs, and partly to parents' greater willingness to invest in a son's education. In India, sons are expected to contribute to family income over the long-term. Daughters, on the other hand, are not seen as long-term contributors, because they will marry into another family and are less likely to enter the workforce. Because families do not invest as much in women's success in STEM fields, female students are less likely to achieve the high exam scores required for IITs admission.\n\nBelieving in meritocracy has also allowed successful Indians to dismiss the continued presence of bias. In 2006, the government announced plans to set aside additional places in federally-funded universities for students from marginal caste groups. In response, medical students and doctors demonstrated in cities across India, claiming that these quotas would \"compromise the quality\" of health care and put patients at risk, because there would be fewer seats available to students with the highest test scores. The demonstrators, mostly middle and upper-class people from urban areas, also asserted that higher scores were a mark of higher intelligence. The supposedly objective nature of admissions tests led these people to overlook how money, connections, and parental involvement had ensured that they could do well on the entrance exam.\n\nThis story should sound familiar to readers regardless of their country of origin. Whether in the United States or China, the mantra of meritocracy often helps divert attention from ongoing inequalities.\n\nIn the United States, wealthier parents can also be more involved in children's education and provide additional resources that ensure academic success. Studies by Harvard researchers have demonstrated that SAT test questions are unconsciously biased in favor of white, middle class students. Such", "image": "https://media-cldnry.s-nbcnews.com/image/upload/t_fit-760w,f_auto,q_auto:best/rockcms/2025-09/250908-harvard-mn-1443-431268.jpg", "level": "C"}];
const INIT_ARTICLE_VOCAB = [{"aid": "A1", "vid": "A1_V1", "word": "lure", "translation": "umpan / memikat", "pos": "verb", "context": "Many plants use complex trickery or provide snacks and colours to lure in pollinators."}, {"aid": "A1", "vid": "A1_V2", "word": "ward off", "translation": "mengusir / menangkal", "pos": "verb", "context": "Plants have evolved toxic compounds to ward off predators."}, {"aid": "A1", "vid": "A1_V3", "word": "roughly", "translation": "kira-kira / kurang lebih", "pos": "adverb", "context": "Plants have senses that roughly correspond to our five senses."}, {"aid": "A1", "vid": "A1_V4", "word": "endowed with", "translation": "dianugerahi / diberkahi dengan", "pos": "verb", "context": "Science has shown that plants are endowed with feeling and social relations."}, {"aid": "A1", "vid": "A1_V5", "word": "take for granted", "translation": "menganggap biasa / enteng", "pos": "verb", "context": "We take plants for granted, expecting that they will always be there."}, {"aid": "A1", "vid": "A1_V6", "word": "at stake", "translation": "dipertaruhkan / terancam", "pos": "phrase", "context": "Our very survival may be at stake if we ignore plant intelligence."}, {"aid": "A1", "vid": "A1_V7", "word": "fared", "translation": "mengalami (nasib)", "pos": "verb", "context": "Plants have fared better in previous mass extinctions."}, {"aid": "A2", "vid": "A2_V1", "word": "ingrained", "translation": "mendarah daging / membudaya", "pos": "adjective (kata sifat)", "context": "Some superstitions are so ingrained in modern societies."}, {"aid": "A2", "vid": "A2_V2", "word": "succumb to", "translation": "menyerah pada / tunduk pada", "pos": "verb phrase (frasa kerja)", "context": "Even scientists succumb to superstitions."}, {"aid": "A2", "vid": "A2_V3", "word": "caveat", "translation": "peringatan / syarat", "pos": "noun (kata benda)", "context": "The Romans added a caveat to the superstition."}, {"aid": "A2", "vid": "A2_V4", "word": "disparate", "translation": "berbeda-beda / beragam", "pos": "adjective (kata sifat)", "context": "Incantations across disparate cultures."}, {"aid": "A2", "vid": "A2_V5", "word": "rampant", "translation": "merajalela / meluas", "pos": "adjective (kata sifat)", "context": "Fear of witchcraft was rampant."}, {"aid": "A2", "vid": "A2_V6", "word": "revered", "translation": "memuja / menghormati", "pos": "verb (kata kerja, past tense)", "context": "The ancient Egyptians revered cats."}, {"aid": "A2", "vid": "A2_V7", "word": "ensued", "translation": "terjadi setelahnya / menyusul", "pos": "verb (kata kerja, past tense)", "context": "In the struggle that ensued, Balder was killed."}, {"aid": "A3", "vid": "A3_V1", "word": "disconcerting", "translation": "mengganggu / meresahkan", "pos": "adjective (kata sifat)", "context": "The reassurances became rather disconcerting."}, {"aid": "A3", "vid": "A3_V2", "word": "livelihood", "translation": "mata pencaharian", "pos": "noun (kata benda)", "context": "People depend for their livelihood on tourism."}, {"aid": "A3", "vid": "A3_V3", "word": "stupefied", "translation": "tercengang / terpukau", "pos": "adjective (kata sifat)", "context": "We were overwhelmed and stupefied by the tombs."}, {"aid": "A3", "vid": "A3_V4", "word": "mesmerising", "translation": "memukau / menakjubkan", "pos": "adjective (kata sifat)", "context": "The mesmerising way sunlight changes the rock's colour."}, {"aid": "A3", "vid": "A3_V5", "word": "bemused", "translation": "bingung / agak heran", "pos": "adjective (kata sifat)", "context": "The cafe owner appeared bemused."}, {"aid": "A3", "vid": "A3_V6", "word": "culminating in", "translation": "berpuncak pada / berakhir dengan", "pos": "verb phrase (frasa kerja)", "context": "The Arab Spring, culminating in a civil war."}, {"aid": "A3", "vid": "A3_V7", "word": "weather the storm", "translation": "bertahan di masa sulit", "pos": "verb phrase (frasa kerja)", "context": "Hotels are managing to weather the storm."}, {"aid": "A4", "vid": "A4_V1", "word": "is grounded in", "translation": "didasarkan pada", "pos": "verb phrase (frasa kerja)", "context": "The concept is grounded in the belief that economy rewards the talented."}, {"aid": "A4", "vid": "A4_V2", "word": "pitfalls", "translation": "kelemahan / jebakan", "pos": "noun (kata benda, jamak)", "context": "Recognition of the pitfalls of meritocracy."}, {"aid": "A4", "vid": "A4_V3", "word": "disparities", "translation": "kesenjangan", "pos": "noun (kata benda, jamak)", "context": "Overlooking continuing disparities in acceptance rates."}, {"aid": "A4", "vid": "A4_V4", "word": "abound", "translation": "berlimpah", "pos": "verb (kata kerja)", "context": "Private tutors and test prep centers abound."}, {"aid": "A4", "vid": "A4_V5", "word": "compounds", "translation": "memperparah", "pos": "verb (kata kerja)", "context": "Having fewer women compounds discrimination."}, {"aid": "A4", "vid": "A4_V6", "word": "entrench", "translation": "mengukuhkan", "pos": "verb (kata kerja)", "context": "Meritocracy serves to entrench the privileges of the elite."}];
const INIT_RD_QUIZ = [{"qid": "A1_Q1", "aid": "A1", "question": "The author mentions that animals like octopuses, bees, and crows have brains, while plants do not. What is the primary purpose of this comparison?", "options": ["To prove that animals are superior to plants.", "To highlight the puzzle of how plants can be intelligent without a brain.", "To argue that brainless creatures cannot solve problems.", "To show that plants are actually animals in disguise."], "answer": "To highlight the puzzle of how plants can be intelligent without a brain."}, {"qid": "A1_Q2", "aid": "A1", "question": "Which of the following best describes Rivili's view of intelligence?", "options": ["Intelligence is only possible with a centralized brain like humans.", "Intelligence is the product of a brain, just as urine is the product of kidneys.", "Intelligence is the ability to solve problems, regardless of having a brain.", "Intelligence is a myth that only applies to mammals."], "answer": "Intelligence is the ability to solve problems, regardless of having a brain."}, {"qid": "A1_Q3", "aid": "A1", "question": "How does the author use the Internet as a metaphor for plant intelligence?", "options": ["Plants are as fast as the Internet at processing information.", "Plants, like the Internet, are built on a network of many nodes rather than a single center.", "Plants can be hacked just like computers.", "Plants were inspired by the invention of the Internet."], "answer": "Plants, like the Internet, are built on a network of many nodes rather than a single center."}, {"qid": "A1_Q4", "aid": "A1", "question": "Rivili argues that providing rights to plants is necessary. What is the main reason he gives?", "options": ["Plants are more beautiful than animals and deserve protection.", "Plant rights are a way to prevent human extinction.", "Plants have sued humans in court for damages.", "The Romans already gave rights to plants centuries ago."], "answer": "Plant rights are a way to prevent human extinction."}, {"qid": "A2_Q1", "aid": "A2", "question": "The article explains that the superstition about opening umbrellas indoors arose in 18th-century London. What underlying human tendency does this example illustrate?", "options": ["Humans enjoy creating dangers where none exist.", "A rational safety warning can evolve into an irrational superstition over time.", "Only the British are prone to superstitious beliefs.", "Umbrellas were considered magical objects in Victorian times."], "answer": "A rational safety warning can evolve into an irrational superstition over time."}, {"qid": "A2_Q2", "aid": "A2", "question": "According to the article, how did the Christian interpretation of the ladder superstition differ from the ancient Egyptian one?", "options": ["Egyptians saw the ladder as a symbol of betrayal, while Christians saw it as sacred.", "Egyptians associated the ladder with the trinity of gods, while Christians linked it to Christ's crucifixion.", "Both cultures believed walking under a ladder brought good luck.", "Egyptians banned ladders entirely, while Christians used them in churches."], "answer": "Egyptians associated the ladder with the trinity of gods, while Christians linked it to Christ's crucifixion."}, {"qid": "A2_Q3", "aid": "A2", "question": "The article mentions that in 2006, some Oxford students tried to ban Robin Thicke's song 'Blurred Lines.' What does this reference (from the later part of the article) suggest about modern superstitions?", "options": ["Modern students are more rational than people in the past.", "New forms of irrational beliefs and censorship have replaced old superstitions.", "Pop music is now considered more dangerous than ladders.", "Superstitions no longer exist in the 21st century."], "answer": "New forms of irrational beliefs and censorship have replaced old superstitions."}, {"qid": "A2_Q4", "aid": "A2", "question": "The author includes the story of King Charles I and his black cat primarily to show that:", "options": ["Black cats were always considered bad luck in England.", "Beliefs about black cats have varied across time and cultures.", "The king was foolish to keep a cat as a pet.", "Black cats are the only animals that bring good luck."], "answer": "Beliefs about black cats have varied across time and cultures."}, {"qid": "A3_Q1", "aid": "A3", "question": "The author describes feeling an 'uneasy pleasure' while visiting Petra in near silence. What does this phrase reveal about her attitude?", "options": ["She is happy that tourists are gone but worried for the local economy.", "She prefers crowded tourist sites over empty ones.", "She believes Jordan is too dangerous to visit.", "She regrets coming to Jordan because it was boring."], "answer": "She is happy that tourists are gone but worried for the local economy."}, {"qid": "A3_Q2", "aid": "A3", "question": "Why does the author mention that the cafe at the High Place of Sacrifice was closed with 'only a goat inside'?", "options": ["To show that goats are common in Jordanian cafes.", "To illustrate the extent of the tourism collapse in Jordan.", "To complain about the lack of food options.", "To suggest that the site is haunted."], "answer": "To illustrate the extent of the tourism collapse in Jordan."}, {"qid": "A3_Q3", "aid": "A3", "question": "The jewellery seller says, 'A bomb goes off in Turkey and people think 'We shouldn't visit Jordan.' What point is he making?", "options": ["Tourists are irrational and cannot distinguish between different countries.", "Turkey and Jordan are the same country.", "Jordan is actually more dangerous than Turkey.", "Tourists should only visit Jordan if they have travel insurance."], "answer": "Tourists are irrational and cannot distinguish between different countries."}, {"qid": "A3_Q4", "aid": "A3", "question": "The author concludes that going on holiday in Jordan may not directly solve the refugee crisis, but the reverse is true. What does 'the reverse is true' mean?", "options": ["The refugee crisis is helping Jordan's tourism industry.", "The absence of tourism is hugely problematic for Jordan.", "Refugees are the main tourists in Jordan.", "Jordan does not actually want tourists to return."], "answer": "The absence of tourism is hugely problematic for Jordan."}, {"qid": "A4_Q1", "aid": "A4", "question": "The article states that emphasizing meritocracy can actually lead to more bias in favor of men. What is the implied reason for this?", "options": ["Men are naturally more talented than women.", "Believing a system is fair makes people stop checking for hidden biases.", "Meritocracy was invented by men to exclude women.", "Women refuse to participate in merit-based systems."], "answer": "Believing a system is fair makes people stop checking for hidden biases."}, {"qid": "A4_Q2", "aid": "A4", "question": "How does the author use the example of Indian IITs to challenge the idea of exam-based meritocracy?", "options": ["By showing that women score higher than men on all exams.", "By demonstrating that access to test prep resources, not just ability, determines scores.", "By proving that IIT exams are graded unfairly.", "By arguing that IITs should be closed down."], "answer": "By demonstrating that access to test prep resources, not just ability, determines scores."}, {"qid": "A4_Q3", "aid": "A4", "question": "The author mentions that in the United States, elite colleges accept a lower percentage of female applicants to maintain a 50-50 gender ratio. What problem does this illustrate?", "options": ["Women are less qualified than men for elite colleges.", "Even supposedly objective admission systems can hide gender bias.", "Men need more help than women to get into college.", "Gender ratios are not important in education."], "answer": "Even supposedly objective admission systems can hide gender bias."}, {"qid": "A4_Q4", "aid": "A4", "question": "The article suggests that holistic assessment (considering multiple criteria) is not a perfect solution. What is the main weakness of holistic assessment mentioned?", "options": ["It is too expensive for most universities.", "The basis of comparison is unclear and prone to bias.", "It ignores exam scores completely.", "It favors international students over local ones."], "answer": "The basis of comparison is unclear and prone to bias."}];

const RD_CATEGORIES = [
  { id:"all", label:"All Stories" },
  { id:"Science", label:"Science" },
  { id:"Social", label:"Social" },
  { id:"Lifestyle", label:"Lifestyle" },
];

// ═══════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════
const COLORS = {
  navy:"#1a2744", navyMid:"#243358", navyDark:"#141e36",
  sage:"#5d8a6e", sageLight:"#7aab8a", sagePale:"#e8f3ec",
  cream:"#f9f7f2", white:"#ffffff",
  textDark:"#1a2744", textMid:"#4a5568", textLight:"#718096",
  correct:"#2f855a", correctBg:"#c6f6d5",
  wrong:"#c53030", wrongBg:"#fed7d7",
  border:"#e2e8f0",
  gold:"#c9a84c", goldLight:"#e8c87a",
};

// ═══════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════
function shuffle(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// ═══════════════════════════════════════
// VOCAB MODULE
// ═══════════════════════════════════════
const VOCAB_CATS = ['All','Verb','Noun','Adjective'];

function VocabModule({ onBack }) {
  const [screen, setScreen] = useState("home"); // home | config | quiz | result
  const [mode, setMode] = useState("en"); // en | id
  const [selectedCats, setSelectedCats] = useState(new Set(["All"]));
  const [packN, setPackN] = useState(50);
  const [timeMin, setTimeMin] = useState(5);
  const [quizItems, setQuizItems] = useState([]);
  const [curIdx, setCurIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongs, setWrongs] = useState([]);
  const [answered, setAnswered] = useState(null); // null | {selected, correct}
  const [secLeft, setSecLeft] = useState(0);
  const [totalSec, setTotalSec] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);

  // Counts
  const catCounts = useMemo(() => ({
    All: DB_EN.length,
    Verb: DB_EN.filter(w=>w.category==='Verb').length,
    Noun: DB_EN.filter(w=>w.category==='Noun').length,
    Adjective: DB_EN.filter(w=>w.category==='Adjective').length,
  }), []);

  // Get pool
  const getPool = useCallback((m) => {
    const db = m==='en' ? DB_EN : DB_ID;
    if (selectedCats.has('All')) return [...db];
    if (m==='en') return db.filter(w => selectedCats.has(w.category));
    return db.filter(w => {
      const ref = DB_EN.find(e => e.word.toLowerCase()===w.meaning.toLowerCase());
      return ref && selectedCats.has(ref.category);
    });
  }, [selectedCats]);

  const poolSize = useMemo(() => getPool(mode).length, [getPool, mode]);

  // Distractors
  function getDistractors(item, pool, m) {
    if (m==='en') {
      const sameCat = pool.filter(w => w.category===item.category && w.word!==item.word && w.meaning!==item.meaning);
      const fallback = pool.filter(w => w.word!==item.word && w.meaning!==item.meaning);
      const src = sameCat.length>=3 ? sameCat : fallback;
      return shuffle(src).slice(0,3).map(w=>w.meaning);
    } else {
      const correct = item.meaning.toLowerCase();
      const ref = DB_EN.find(w=>w.word.toLowerCase()===correct);
      const cat = ref ? ref.category : null;
      const catWords = cat ? new Set(DB_EN.filter(w=>w.category===cat).map(w=>w.word)) : null;
      const sameCat = pool.filter(w=>w.word!==item.word && w.meaning.toLowerCase()!==correct && (!catWords||catWords.has(w.meaning)));
      const fallback = pool.filter(w=>w.word!==item.word && w.meaning.toLowerCase()!==correct);
      const src = sameCat.length>=3 ? sameCat : fallback;
      return shuffle(src).slice(0,3).map(w=>w.meaning);
    }
  }

  // Start quiz
  function startQuiz(retryItems) {
    clearInterval(timerRef.current);
    const pool = retryItems || getPool(mode);
    const n = retryItems ? pool.length : Math.min(packN, pool.length);
    const items = shuffle(pool).slice(0, n);
    setQuizItems(items);
    setCurIdx(0); setScore(0); setWrongs([]); setAnswered(null);
    const t = timeMin*60;
    setTotalSec(t); setSecLeft(t); setStartTime(Date.now()); setTimedOut(false);
    setScreen("quiz");
  }

  // Timer
  useEffect(() => {
    if (screen !== "quiz") return;
    timerRef.current = setInterval(() => {
      setSecLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setTimedOut(true); setScreen("result"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, curIdx === 0 ? startTime : null]);

  // Handle answer
  function handleAnswer(selectedText, isCorrect, item) {
    if (answered) return;
    setAnswered({ selected: selectedText, correct: isCorrect });
    if (isCorrect) {
      setScore(s => s+1);
      setTimeout(nextQ, 400);
    } else {
      setWrongs(w => [...w, { item, userAns: selectedText }]);
      setTimeout(nextQ, 1500);
    }
  }

  function nextQ() {
    setAnswered(null);
    if (curIdx + 1 >= quizItems.length) {
      clearInterval(timerRef.current);
      setScreen("result");
    } else {
      setCurIdx(i => i+1);
    }
  }

  // Current question data
  const curItem = quizItems[curIdx];
  const curPool = screen==="quiz" ? getPool(mode) : [];
  const curOptions = useMemo(() => {
    if (!curItem || screen!=="quiz") return [];
    const d = getDistractors(curItem, curPool, mode);
    return shuffle([
      { text:curItem.meaning, correct:true },
      { text:d[0]||'—', correct:false },
      { text:d[1]||'—', correct:false },
      { text:d[2]||'—', correct:false },
    ]);
  }, [curItem, screen]);

  const curCategory = useMemo(() => {
    if (!curItem) return '—';
    if (mode==='en') return curItem.category||'—';
    const ref = DB_EN.find(w=>w.word.toLowerCase()===curItem.meaning.toLowerCase());
    return ref ? ref.category : '—';
  }, [curItem, mode]);

  // Result stats
  const resultPct = quizItems.length > 0 ? Math.round((score/quizItems.length)*100) : 0;
  const elapsed = Math.round((Date.now() - startTime)/1000);
  const resultMsg = resultPct>=100?'🎉 Sempurna! Kamu menguasai semua kata!':resultPct>=80?'🔥 Hebat! Hampir sempurna.':resultPct>=60?'👍 Cukup baik! Ulangi kata yang salah ya.':'💪 Terus semangat, pasti bisa!';

  const toggleCat = (cat) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (cat==='All') { next.clear(); next.add('All'); }
      else {
        next.delete('All');
        next.has(cat) ? next.delete(cat) : next.add(cat);
        if (next.size===0) next.add('All');
      }
      return next;
    });
  };

  const S = {
    card: { background:'#fff', borderRadius:14, padding:'22px 24px', boxShadow:'0 4px 20px rgba(26,39,68,0.09)', marginBottom:14 },
    cardLabel: { fontWeight:700, fontSize:'0.74rem', textTransform:'uppercase', letterSpacing:'0.09em', color:COLORS.textLight, marginBottom:13 },
  };

  // ── VOCAB HOME ──
  if (screen === "home") {
    return (
      <div style={{ background:COLORS.cream, minHeight:'100vh' }}>
        <div style={{ background:COLORS.navy, padding:'52px 28px 80px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute',top:-70,right:-70,width:300,height:300,borderRadius:'50%',background:'rgba(93,138,110,0.13)' }} />
          <div style={{ display:'inline-block',background:'rgba(93,138,110,0.28)',color:COLORS.sageLight,fontSize:'0.67rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',padding:'5px 14px',borderRadius:20,marginBottom:18,position:'relative',zIndex:1 }}>
            Latihan Kosakata SNBT
          </div>
          <h1 style={{ fontFamily:"'DM Serif Display',serif",color:'#fff',fontSize:'2.1rem',lineHeight:1.25,maxWidth:500,margin:'0 auto 14px',position:'relative',zIndex:1 }}>
            Yakin kamu bisa skimming soal LBE kalau vocab dasar aja gak ngerti?
          </h1>
          <p style={{ color:'rgba(255,255,255,0.72)',fontSize:'0.94rem',fontStyle:'italic',lineHeight:1.65,maxWidth:470,margin:'0 auto 10px',position:'relative',zIndex:1 }}>
            Yuk latihan vocab dasar LBE — mulai sekarang, gratis.
          </p>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:700,margin:'-40px auto 40px',padding:'0 22px' }}>
          {[
            { icon:'🔤', title:'Vocab EN → ID', desc:'Lihat kata Inggris, tebak artinya dalam Bahasa Indonesia.', m:'en' },
            { icon:'🇮🇩', title:'Vocab ID → EN', desc:'Lihat kata Indonesia, tebak padanan kata Inggrisnya.', m:'id' },
          ].map(c => (
            <div key={c.m} onClick={() => { setMode(c.m); setScreen("config"); }}
              style={{ background:'#fff',borderRadius:16,padding:'24px 22px',boxShadow:'0 10px 40px rgba(26,39,68,0.15)',cursor:'pointer',transition:'all .2s',border:'2px solid transparent' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=COLORS.sage; e.currentTarget.style.transform='translateY(-3px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.transform='none'; }}
            >
              <div style={{ width:44,height:44,borderRadius:12,background:COLORS.sagePale,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:14 }}>{c.icon}</div>
              <div style={{ fontWeight:700,fontSize:'0.93rem',marginBottom:5 }}>{c.title}</div>
              <p style={{ color:COLORS.textLight,fontSize:'0.78rem',lineHeight:1.5 }}>{c.desc}</p>
              <div style={{ marginTop:14,fontSize:'0.77rem',fontWeight:700,color:COLORS.sage }}>Mulai latihan →</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex',justifyContent:'center',gap:36,padding:'0 22px 52px',flexWrap:'wrap' }}>
          {[['322','Kosakata'],['2','Mode Quiz'],['5','Paket Soal'],['4','Pilihan Waktu']].map(([n,l])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'DM Serif Display',serif",fontSize:'1.9rem',color:COLORS.navy }}>{n}</div>
              <div style={{ fontSize:'0.73rem',color:COLORS.textLight,marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── CONFIG SCREEN ──
  if (screen === "config") {
    return (
      <div style={{ background:COLORS.cream, minHeight:'100vh' }}>
        <div style={{ maxWidth:600,margin:'36px auto',padding:'0 22px' }}>
          <button onClick={() => setScreen("home")} style={{ display:'inline-flex',alignItems:'center',gap:6,color:COLORS.textLight,fontSize:'0.8rem',fontWeight:600,cursor:'pointer',marginBottom:20,border:'none',background:'none',fontFamily:"'DM Sans',sans-serif" }}>← Beranda</button>
          <div style={{ fontFamily:"'DM Serif Display',serif",fontSize:'1.5rem',marginBottom:4 }}>
            Vocab Quiz {mode==='en'?'EN → ID':'ID → EN'}
          </div>
          <div style={{ color:COLORS.textLight,fontSize:'0.84rem',marginBottom:22 }}>
            {mode==='en'?'Lihat kata Bahasa Inggris, pilih artinya yang tepat dalam Bahasa Indonesia.':'Lihat kata Bahasa Indonesia, pilih padanan Bahasa Inggrisnya yang tepat.'}
          </div>

          {/* Category filter */}
          <div style={S.card}>
            <div style={S.cardLabel}>Filter Kategori</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9 }}>
              {VOCAB_CATS.map(cat => (
                <div key={cat} onClick={() => toggleCat(cat)}
                  style={{
                    display:'flex',alignItems:'center',gap:9,padding:'11px 13px',
                    border:`2px solid ${selectedCats.has(cat)?COLORS.sage:COLORS.border}`,
                    borderRadius:10,cursor:'pointer',transition:'all .16s',userSelect:'none',
                    background:selectedCats.has(cat)?COLORS.sagePale:'transparent'
                  }}>
                  <div style={{
                    width:17,height:17,borderRadius:4,
                    border:`2px solid ${selectedCats.has(cat)?COLORS.sage:COLORS.border}`,
                    background:selectedCats.has(cat)?COLORS.sage:'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    color:'#fff',fontSize:10
                  }}>{selectedCats.has(cat)?'✓':''}</div>
                  <span style={{ fontWeight:500,fontSize:'0.85rem' }}>{cat==='All'?'All Words':cat}</span>
                  <span style={{ marginLeft:'auto',fontSize:'0.7rem',color:COLORS.textLight }}>{catCounts[cat]||0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pack count */}
          <div style={S.card}>
            <div style={S.cardLabel}>Jumlah Soal</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:9 }}>
              {[20,30,50,70,100].map(n => (
                <button key={n} onClick={() => setPackN(n)}
                  style={{
                    padding:'13px 6px',border:`2px solid ${packN===n?COLORS.navy:COLORS.border}`,
                    borderRadius:10,background:packN===n?COLORS.navy:'#fff',cursor:'pointer',
                    textAlign:'center',transition:'all .16s',fontFamily:"'DM Sans',sans-serif",
                    color:packN===n?'#fff':COLORS.textDark
                  }}>
                  <span style={{ fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',display:'block' }}>{n}</span>
                  <span style={{ fontSize:'0.61rem',textTransform:'uppercase',letterSpacing:'0.05em',opacity:0.6 }}>soal</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div style={S.card}>
            <div style={S.cardLabel}>Pilih Durasi</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:9 }}>
              {[3,5,7,9].map(t => (
                <button key={t} onClick={() => setTimeMin(t)}
                  style={{
                    padding:'13px 6px',border:`2px solid ${timeMin===t?COLORS.sage:COLORS.border}`,
                    borderRadius:10,background:timeMin===t?COLORS.sage:'#fff',cursor:'pointer',
                    textAlign:'center',transition:'all .16s',fontFamily:"'DM Sans',sans-serif",
                    color:timeMin===t?'#fff':COLORS.textDark
                  }}>
                  <span style={{ fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',display:'block' }}>{t}</span>
                  <span style={{ fontSize:'0.61rem',textTransform:'uppercase',letterSpacing:'0.05em',opacity:0.7 }}>menit</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => startQuiz()} disabled={poolSize < 4}
            style={{
              width:'100%',padding:15,background:poolSize<4?'#ccc':COLORS.sage,color:'#fff',border:'none',borderRadius:12,
              fontFamily:"'DM Sans',sans-serif",fontSize:'0.93rem',fontWeight:700,cursor:poolSize<4?'not-allowed':'pointer',
              transition:'all .18s',letterSpacing:'0.02em'
            }}>
            Mulai Kuis →
          </button>
          {poolSize<4 && <div style={{ color:COLORS.wrong,fontSize:'0.78rem',textAlign:'center',marginTop:9 }}>Pilih kategori yang memiliki minimal 4 kata.</div>}
        </div>
      </div>
    );
  }

  // ── QUIZ SCREEN ──
  if (screen === "quiz" && curItem) {
    const timerPct = totalSec > 0 ? (secLeft/totalSec)*100 : 0;
    const progPct = quizItems.length > 0 ? (curIdx/quizItems.length)*100 : 0;
    const m = Math.floor(secLeft/60);
    const ss = secLeft%60;

    return (
      <div style={{ background:COLORS.cream, minHeight:'100vh' }}>
        <div style={{ maxWidth:560,margin:'0 auto',padding:'24px 22px' }}>
          {/* Timer */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7 }}>
              <span style={{ fontSize:'0.72rem',fontWeight:700,color:COLORS.textLight,textTransform:'uppercase',letterSpacing:'0.07em' }}>Waktu</span>
              <span style={{ fontFamily:"'DM Serif Display',serif",fontSize:'1.05rem',color:secLeft<=30?COLORS.wrong:COLORS.navy }}>{m}:{String(ss).padStart(2,'0')}</span>
            </div>
            <div style={{ height:5,background:COLORS.border,borderRadius:99,overflow:'hidden' }}>
              <div style={{ height:'100%',width:timerPct+'%',background:secLeft<=30?'linear-gradient(90deg,#e53e3e,#fc8181)':`linear-gradient(90deg,${COLORS.sage},${COLORS.sageLight})`,borderRadius:99,transition:'width 1s linear' }} />
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
              <span style={{ fontSize:'0.7rem',fontWeight:700,color:COLORS.textLight,textTransform:'uppercase',letterSpacing:'0.07em' }}>Progress</span>
              <span style={{ fontFamily:"'DM Serif Display',serif",fontSize:'0.98rem',color:COLORS.navy }}>{curIdx+1}/{quizItems.length}</span>
            </div>
            <div style={{ height:4,background:COLORS.border,borderRadius:99,overflow:'hidden' }}>
              <div style={{ height:'100%',width:progPct+'%',background:COLORS.navyMid,borderRadius:99,transition:'width .3s ease' }} />
            </div>
          </div>

          {/* Question card */}
          <div style={{ background:COLORS.navy,borderRadius:18,padding:'30px 28px',marginBottom:13,boxShadow:'0 10px 40px rgba(26,39,68,0.15)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:-50,right:-50,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,0.04)' }} />
            <div style={{ display:'inline-block',background:'rgba(93,138,110,0.28)',color:COLORS.sageLight,fontSize:'0.65rem',fontWeight:700,padding:'4px 11px',borderRadius:20,textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:14,position:'relative',zIndex:1 }}>
              {curCategory}
            </div>
            <div style={{ color:'rgba(255,255,255,0.48)',fontSize:'0.77rem',marginBottom:7,position:'relative',zIndex:1 }}>
              {mode==='en'?'Apa arti kata berikut?':'Apa kata Bahasa Inggris dari kata berikut?'}
            </div>
            <div style={{ fontFamily:"'DM Serif Display',serif",fontSize:'2.4rem',color:'#fff',position:'relative',zIndex:1,lineHeight:1.15 }}>
              {curItem.word}
            </div>
          </div>

          {/* Options */}
          <div style={{ display:'grid',gap:9 }}>
            {curOptions.map((opt, i) => {
              let bg='#fff', border=`2px solid ${COLORS.border}`, color=COLORS.textDark, ltrBg=COLORS.border, ltrColor=COLORS.textLight;
              if (answered) {
                if (opt.correct) { bg=COLORS.correctBg; border=`2px solid ${COLORS.correct}`; color=COLORS.correct; ltrBg=COLORS.correct; ltrColor='#fff'; }
                else if (answered.selected===opt.text && !opt.correct) { bg=COLORS.wrongBg; border=`2px solid ${COLORS.wrong}`; color=COLORS.wrong; ltrBg=COLORS.wrong; ltrColor='#fff'; }
                else { bg='#fff'; border=`2px solid ${COLORS.border}`; color=COLORS.textDark; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(opt.text, opt.correct, curItem)}
                  disabled={!!answered}
                  style={{
                    padding:'14px 16px',background:bg,border,borderRadius:11,textAlign:'left',
                    cursor:answered?'default':'pointer',fontFamily:"'DM Sans',sans-serif",
                    fontSize:'0.88rem',fontWeight:500,color,transition:'all .14s',
                    display:'flex',alignItems:'center',gap:11,
                    opacity: answered && !opt.correct && answered.selected!==opt.text ? 0.38 : 1
                  }}>
                  <span style={{ width:26,height:26,borderRadius:7,background:ltrBg,color:ltrColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.69rem',fontWeight:700,flexShrink:0 }}>
                    {"ABCD"[i]}
                  </span>
                  <span>{opt.text}</span>
                  {answered && opt.correct && <span style={{ marginLeft:'auto' }}>✓</span>}
                  {answered && answered.selected===opt.text && !opt.correct && <span style={{ marginLeft:'auto' }}>✗</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN ──
  if (screen === "result") {
    return (
      <div style={{ background:COLORS.cream, minHeight:'100vh' }}>
        <div style={{ maxWidth:620,margin:'28px auto',padding:'0 22px' }}>
          {timedOut && (
            <div style={{ background:COLORS.wrongBg,border:'1px solid #feb2b2',borderRadius:10,padding:'12px 16px',marginBottom:14,color:COLORS.wrong,fontWeight:700,fontSize:'0.84rem',textAlign:'center' }}>
              ⏰ Waktu habis!
            </div>
          )}
          <div style={{ background:COLORS.navy,borderRadius:18,padding:'40px 28px 32px',marginBottom:16,boxShadow:'0 10px 40px rgba(26,39,68,0.15)',textAlign:'center',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:-60,right:-60,width:240,height:240,borderRadius:'50%',background:'rgba(93,138,110,0.15)' }} />
            <div style={{ color:'rgba(255,255,255,0.46)',fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.11em',marginBottom:10,position:'relative',zIndex:1 }}>
              Hasil Kuis {mode==='en'?'EN → ID':'ID → EN'}
            </div>
            <div style={{ fontFamily:"'DM Serif Display',serif",fontSize:'4rem',color:'#fff',lineHeight:1,position:'relative',zIndex:1 }}>
              {score}<span style={{ fontSize:'1.8rem',opacity:0.45 }}>/{quizItems.length}</span>
            </div>
            <div style={{ marginTop:8,fontSize:'1rem',fontWeight:700,position:'relative',zIndex:1,color:resultPct>=70?'#6ee7b7':resultPct>=50?'#fcd34d':'#fca5a5' }}>{resultPct}%</div>
            <div style={{ marginTop:9,color:'rgba(255,255,255,0.55)',fontSize:'0.84rem',position:'relative',zIndex:1 }}>{resultMsg}</div>
            <div style={{ marginTop:6,color:'rgba(255,255,255,0.35)',fontSize:'0.76rem',position:'relative',zIndex:1 }}>
              Waktu: {Math.floor(elapsed/60)}m {elapsed%60}s
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:11,marginBottom:16 }}>
            {[[score,COLORS.correct,'Benar'],[quizItems.length-score,COLORS.wrong,'Salah'],[resultPct+'%',COLORS.navy,'Akurasi']].map(([v,c,l])=>(
              <div key={l} style={{ background:'#fff',borderRadius:11,padding:15,textAlign:'center',boxShadow:'0 4px 20px rgba(26,39,68,0.09)' }}>
                <div style={{ fontFamily:"'DM Serif Display',serif",fontSize:'1.65rem',color:c }}>{v}</div>
                <div style={{ fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'0.07em',color:COLORS.textLight,marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Review wrong answers */}
          <div style={{ background:'#fff',borderRadius:14,padding:20,boxShadow:'0 4px 20px rgba(26,39,68,0.09)',marginBottom:14 }}>
            <div style={{ fontWeight:700,fontSize:'0.76rem',textTransform:'uppercase',letterSpacing:'0.08em',color:COLORS.wrong,marginBottom:12 }}>⚠ Perlu Dipelajari Ulang</div>
            {wrongs.length === 0 ? (
              <div style={{ textAlign:'center',padding:18,color:COLORS.correct,fontWeight:700,fontSize:'0.84rem' }}>🎉 Tidak ada yang salah! Luar biasa!</div>
            ) : (
              wrongs.map((w, i) => (
                <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<wrongs.length-1?`1px solid ${COLORS.border}`:'none',fontSize:'0.83rem' }}>
                  <div>
                    <span style={{ fontWeight:700,color:COLORS.navy }}>{w.item.word}</span>
                    {' → '}
                    <span style={{ color:COLORS.wrong,textDecoration:'line-through',fontSize:'0.75rem' }}>{w.userAns}</span>
                    <span style={{ color:COLORS.correct,fontWeight:700,marginLeft:5 }}>{w.item.meaning}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:11 }}>
            <button onClick={() => setScreen("config")} style={{ padding:13,border:`2px solid ${COLORS.border}`,borderRadius:11,background:'#fff',fontFamily:"'DM Sans',sans-serif",fontSize:'0.85rem',fontWeight:700,color:COLORS.textDark,cursor:'pointer' }}>
              ← Kuis Baru
            </button>
            {wrongs.length > 0 && (
              <button onClick={() => startQuiz(wrongs.map(w=>w.item))} style={{ padding:13,border:`2px solid ${COLORS.sage}`,borderRadius:11,background:COLORS.sage,fontFamily:"'DM Sans',sans-serif",fontSize:'0.85rem',fontWeight:700,color:'#fff',cursor:'pointer' }}>
                Ulangi yang Salah
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}


// ═══════════════════════════════════════
// READING MODULE — TOOLTIP
// ═══════════════════════════════════════
const VocabTooltip = ({ word, data, position, onClose }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState(position);
  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let x = position.x;
    if (r.right > window.innerWidth-12) x = window.innerWidth - r.width - 16;
    if (x < 12) x = 12;
    setPos({ x, y: position.y });
  }, [position]);

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:998 }} />
      <div ref={ref} style={{
        position:"fixed",left:pos.x,top:pos.y+8,zIndex:999,
        background:"#1a1a1a",color:"#f5f0eb",borderRadius:10,
        padding:"18px 22px",maxWidth:360,minWidth:240,
        boxShadow:"0 16px 48px rgba(0,0,0,0.4)",
        fontFamily:"'Source Sans 3',sans-serif",
        animation:"ttIn .2s ease-out"
      }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8 }}>
          <span style={{ fontSize:20,fontWeight:700,fontFamily:"'Playfair Display',serif",color:COLORS.goldLight }}>{word}</span>
          <span style={{ fontSize:10,fontWeight:700,background:"rgba(232,200,122,0.15)",color:COLORS.goldLight,padding:"2px 8px",borderRadius:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>{data.pos}</span>
        </div>
        <div style={{ fontSize:16,fontWeight:600,color:"#fff",paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.1)",marginBottom:10 }}>{data.translation}</div>
        {data.context && <div style={{ fontSize:13,fontStyle:"italic",color:"rgba(245,240,235,0.65)",lineHeight:1.5 }}>"{data.context}"</div>}
        <div style={{ position:"absolute",top:-6,left:20,width:12,height:12,background:"#1a1a1a",transform:"rotate(45deg)" }} />
      </div>
    </>
  );
};

// ═══════════════════════════════════════
// HIGHLIGHTED TEXT
// ═══════════════════════════════════════
const HighlightedText = ({ content, vocabList, dark: dk = false }) => {
  const [tooltip, setTooltip] = useState(null);
  const handleClick = useCallback((e, word, data) => {
    e.stopPropagation();
    const r = e.target.getBoundingClientRect();
    setTooltip({ word, data, position: { x: r.left, y: r.bottom } });
  }, []);

  const renderP = useCallback((text, pIdx) => {
    if (!vocabList.length) return text;
    const sorted = [...vocabList].sort((a,b) => b.word.length - a.word.length);
    const escaped = sorted.map(v => v.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp("\\b(" + escaped.join("|") + ")\\b", "gi");
    const parts = text.split(pattern);
    return parts.map((part, i) => {
      const match = sorted.find(v => v.word.toLowerCase() === part.toLowerCase());
      if (match) {
        return (
          <span key={pIdx+"-"+i}
            onClick={(e) => handleClick(e, match.word, match)}
            style={{ background:"linear-gradient(to bottom, transparent 62%, rgba(232,200,122,0.3) 62%)",cursor:"pointer",borderBottom:"1.5px dashed #c9a84c",paddingBottom:1,borderRadius:2,transition:"all .15s" }}
            onMouseEnter={e => { e.target.style.background="rgba(232,200,122,0.25)"; e.target.style.borderBottomStyle="solid"; }}
            onMouseLeave={e => { e.target.style.background="linear-gradient(to bottom, transparent 62%, rgba(232,200,122,0.3) 62%)"; e.target.style.borderBottomStyle="dashed"; }}
          >{part}</span>
        );
      }
      return part;
    });
  }, [vocabList, handleClick]);

  return (
    <div onClick={() => setTooltip(null)}>
      {content.split("\n\n").map((p, i) => (
        <p key={i} style={{ fontSize:18,lineHeight:1.85,marginBottom:24,color:dk?"#d4cfc8":"#2a2a2a",fontFamily:"'Source Serif 4','Georgia',serif",letterSpacing:"0.01em",transition:"color .3s" }}>
          {i===0 && <span style={{ float:"left",fontSize:58,lineHeight:"48px",paddingRight:8,paddingTop:6,fontFamily:"'Playfair Display',serif",fontWeight:900,color:dk?"#f0ece4":"#1a1a1a",transition:"color .3s" }}>{p.charAt(0)}</span>}
          {renderP(i===0?p.slice(1):p, i)}
        </p>
      ))}
      {tooltip && <VocabTooltip word={tooltip.word} data={tooltip.data} position={tooltip.position} onClose={() => setTooltip(null)} />}
    </div>
  );
};

// ═══════════════════════════════════════
// READING QUIZ
// ═══════════════════════════════════════
const ReadingQuiz = ({ questions, dark: dk = false }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const sc = useMemo(() => submitted ? questions.reduce((a,q) => a+(answers[q.qid]===q.answer?1:0),0) : 0, [submitted, answers, questions]);
  const qBg = dk ? "#1a1a1a" : "#f5f1ea";
  const qBorder = dk ? "#2a2a2a" : "#e0d9cd";
  const qTitle = dk ? "#f0ece4" : "#1a1a1a";
  const qSub = dk ? "rgba(240,236,228,0.4)" : "#888";
  const optBg = dk ? "#242424" : "#fff";
  const optBorder = dk ? "#333" : "#d8d3c8";
  const optColor = dk ? "#d4cfc8" : "#333";

  return (
    <div style={{ background:qBg,borderRadius:12,padding:"32px 28px",marginTop:48,border:`1px solid ${qBorder}`,transition:"background .3s" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
        <div>
          <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:22,color:qTitle,margin:0 }}>Reading Comprehension Quiz</h3>
          <p style={{ fontSize:13,color:qSub,margin:"4px 0 0",fontFamily:"'Source Sans 3',sans-serif" }}>Test your understanding of the article</p>
        </div>
        {submitted && <div style={{ background:sc===questions.length?"#2d6a4f":sc>=questions.length/2?COLORS.gold:"#c1554d",color:"#fff",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:14 }}>Score: {sc}/{questions.length}</div>}
      </div>
      {questions.map((q, qi) => (
        <div key={q.qid} style={{ marginBottom:28,paddingBottom:24,borderBottom:qi<questions.length-1?`1px solid ${qBorder}`:"none" }}>
          <p style={{ fontSize:15,fontWeight:600,color:qTitle,marginBottom:14,lineHeight:1.5,fontFamily:"'Source Sans 3',sans-serif" }}>
            <span style={{ color:COLORS.gold,marginRight:8 }}>Q{qi+1}.</span>{q.question}
          </p>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {q.options.map((opt, oi) => {
              const isThis = answers[q.qid]===opt;
              const isAns = q.answer===opt;
              let bg=optBg, border=`1px solid ${optBorder}`, color=optColor;
              if (submitted && isAns) { bg="#e6f4ea"; border="2px solid #2d6a4f"; color="#1b4332"; }
              else if (submitted && isThis && !isAns) { bg="#fce8e6"; border="2px solid #c1554d"; color="#7c2d12"; }
              else if (isThis) { bg=dk?"#2a2000":"#fef9ef"; border="2px solid "+COLORS.gold; color=qTitle; }
              return (
                <button key={oi} onClick={() => !submitted && setAnswers(p=>({...p,[q.qid]:opt}))}
                  style={{ background:bg,border,color,borderRadius:8,padding:"12px 16px",textAlign:"left",cursor:submitted?"default":"pointer",fontSize:14,lineHeight:1.45,fontFamily:"'Source Sans 3',sans-serif",transition:"all .15s" }}>
                  <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",border:isThis?"2px solid "+COLORS.gold:"1.5px solid #bbb",marginRight:10,fontSize:11,fontWeight:700,background:isThis?COLORS.gold:"transparent",color:isThis?"#fff":"#999",verticalAlign:"middle",flexShrink:0 }}>{"ABCD"[oi]}</span>
                  {opt}
                  {submitted && isAns && <span style={{ float:"right" }}>✓</span>}
                  {submitted && isThis && !isAns && <span style={{ float:"right" }}>✗</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ display:"flex",gap:12,justifyContent:"flex-end" }}>
        {submitted && <button onClick={() => { setAnswers({}); setSubmitted(false); }} style={{ background:"transparent",border:"1.5px solid "+COLORS.gold,color:"#8b7355",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontWeight:600,fontSize:14 }}>Try Again</button>}
        {!submitted && <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length<questions.length} style={{ background:Object.keys(answers).length<questions.length?"#d0c9bc":"#1a1a1a",color:"#fff",border:"none",borderRadius:8,padding:"12px 32px",cursor:Object.keys(answers).length<questions.length?"not-allowed":"pointer",fontWeight:700,fontSize:14 }}>Submit Answers</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
// ADMIN — ADD ARTICLE WIZARD (Multi-step)
// ═══════════════════════════════════════
function AddArticleWizard({ onCancel, onSave, existingIds }) {
  const [step, setStep] = useState(1); // 1=article, 2=vocab, 3=quiz-count, 4=quiz-questions
  const [form, setForm] = useState({ title:"", topics:"Science", level:"B", body:"", image:"" });
  const [vocabList, setVocabList] = useState([{ word:"", translation:"", pos:"Noun", context:"" }]);
  const [quizCount, setQuizCount] = useState(4);
  const [quizList, setQuizList] = useState([]);

  const newId = useMemo(() => {
    const nums = existingIds.map(id => parseInt(id.replace(/\D/g,''))||0);
    return "A" + (Math.max(0,...nums)+1);
  }, [existingIds]);

  const S = {
    label: { display:"block", fontSize:12, fontWeight:700, color:"#555", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" },
    input: { width:"100%", padding:"10px 14px", border:"1.5px solid #d8d3c8", borderRadius:8, fontSize:14, fontFamily:"'Source Sans 3',sans-serif", background:"#fff", outline:"none", transition:"border .15s" },
    textarea: { width:"100%", padding:"12px 14px", border:"1.5px solid #d8d3c8", borderRadius:8, fontSize:14, fontFamily:"'Source Serif 4',serif", background:"#fff", outline:"none", minHeight:180, resize:"vertical", lineHeight:1.7 },
    select: { padding:"10px 14px", border:"1.5px solid #d8d3c8", borderRadius:8, fontSize:14, fontFamily:"'Source Sans 3',sans-serif", background:"#fff", outline:"none", cursor:"pointer" },
    btnPrimary: { padding:"11px 28px", background:"#1a1a1a", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Source Sans 3',sans-serif" },
    btnSecondary: { padding:"11px 28px", background:"transparent", color:"#888", border:"1.5px solid #d8d3c8", borderRadius:8, fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"'Source Sans 3',sans-serif" },
    btnDanger: { padding:"6px 12px", background:"transparent", color:"#c1554d", border:"1px solid #e8c0bc", borderRadius:6, fontSize:12, cursor:"pointer", fontFamily:"'Source Sans 3',sans-serif" },
  };

  const stepLabels = ["Article Details","Vocabulary","Quiz Setup","Quiz Questions"];
  const stepBar = (
    <div style={{ display:"flex", gap:4, marginBottom:28 }}>
      {stepLabels.map((l,i) => (
        <div key={i} style={{ flex:1, textAlign:"center" }}>
          <div style={{ height:4, borderRadius:2, background: i+1<=step ? "#1a1a1a" : "#e0dcd5", transition:"background .2s", marginBottom:6 }} />
          <span style={{ fontSize:10, fontWeight:i+1===step?700:500, color:i+1<=step?"#1a1a1a":"#aaa", textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</span>
        </div>
      ))}
    </div>
  );

  // Validate step
  const canNext1 = form.title.trim() && form.body.trim();
  const canNext2 = vocabList.every(v => v.word.trim() && v.translation.trim());

  // Init quiz when moving to step 4
  const initQuizzes = () => {
    const arr = Array.from({length:quizCount},(_,i)=>({ question:"", options:["","","",""], answer:"" }));
    setQuizList(arr);
    setStep(4);
  };

  const updateQuiz = (idx, field, value) => {
    setQuizList(prev => prev.map((q,i) => i===idx ? {...q, [field]:value} : q));
  };
  const updateQuizOpt = (qi, oi, val) => {
    setQuizList(prev => prev.map((q,i) => i===qi ? {...q, options:q.options.map((o,j)=>j===oi?val:o)} : q));
  };

  const handleSave = () => {
    const art = { id:newId, title:form.title.trim(), topics:form.topics, level:form.level, body:form.body.trim(), image:form.image.trim()||"https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800" };
    const vocs = vocabList.filter(v=>v.word.trim()).map((v,i) => ({
      aid:newId, vid:newId+"_V"+(i+1), word:v.word.trim(), translation:v.translation.trim(), pos:v.pos, context:v.context.trim()
    }));
    const quizzes = quizList.filter(q=>q.question.trim()&&q.answer.trim()).map((q,i) => ({
      qid:newId+"_Q"+(i+1), aid:newId, question:q.question.trim(), options:q.options.map(o=>o.trim()), answer:q.answer.trim()
    }));
    onSave(art, vocs, quizzes);
  };

  const canSave = quizList.length > 0 && quizList.every(q => q.question.trim() && q.options.every(o=>o.trim()) && q.answer.trim());

  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"32px 24px 80px", animation:"fadeUp .3s ease-out" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:"#1a1a1a", margin:0 }}>Add New Article</h2>
        <button onClick={onCancel} style={S.btnSecondary}>Cancel</button>
      </div>
      {stepBar}

      {/* STEP 1: Article Details */}
      {step===1 && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <div>
            <label style={S.label}>Title *</label>
            <input style={S.input} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Enter article title..." />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={S.label}>Category *</label>
              <select style={{...S.select,width:"100%"}} value={form.topics} onChange={e=>setForm(p=>({...p,topics:e.target.value}))}>
                {["Science","Social","Lifestyle","Economics","Politics"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Level *</label>
              <select style={{...S.select,width:"100%"}} value={form.level} onChange={e=>setForm(p=>({...p,level:e.target.value}))}>
                {[["A","Beginner"],["B","Intermediate"],["C","Advanced"],["D","Expert"]].map(([v,l])=><option key={v} value={v}>{v} — {l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Image URL (optional)</label>
            <input style={S.input} value={form.image} onChange={e=>setForm(p=>({...p,image:e.target.value}))} placeholder="https://images.unsplash.com/..." />
          </div>
          <div>
            <label style={S.label}>Body Text *</label>
            <textarea style={S.textarea} value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))} placeholder="Paste or write the full article text here. Separate paragraphs with blank lines." />
            <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>{form.body.split(/\s+/).filter(Boolean).length} words · {form.body.split("\n\n").filter(Boolean).length} paragraphs</div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
            <button onClick={onCancel} style={S.btnSecondary}>Cancel</button>
            <button onClick={()=>setStep(2)} disabled={!canNext1} style={{...S.btnPrimary, opacity:canNext1?1:0.4, cursor:canNext1?"pointer":"not-allowed"}}>Next: Vocabulary →</button>
          </div>
        </div>
      )}

      {/* STEP 2: Vocabulary */}
      {step===2 && (
        <div>
          <p style={{ fontSize:14, color:"#666", marginBottom:18 }}>Add vocabulary words that should be highlighted in the article. These will appear as interactive tooltips for students.</p>
          {vocabList.map((v,i) => (
            <div key={i} style={{ background:i%2===0?"#fff":"#f9f6f0", border:"1px solid #e8e2d8", borderRadius:10, padding:"16px 18px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#8b7355" }}>Word {i+1}</span>
                {vocabList.length>1 && <button onClick={()=>setVocabList(p=>p.filter((_,j)=>j!==i))} style={S.btnDanger}>Remove</button>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px", gap:10, marginBottom:8 }}>
                <input style={S.input} value={v.word} onChange={e=>{const nl=[...vocabList];nl[i].word=e.target.value;setVocabList(nl);}} placeholder="English word" />
                <input style={S.input} value={v.translation} onChange={e=>{const nl=[...vocabList];nl[i].translation=e.target.value;setVocabList(nl);}} placeholder="Indonesian translation" />
                <select style={S.select} value={v.pos} onChange={e=>{const nl=[...vocabList];nl[i].pos=e.target.value;setVocabList(nl);}}>
                  {["Noun","Verb","Adjective","Adverb","Preposition"].map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <input style={S.input} value={v.context} onChange={e=>{const nl=[...vocabList];nl[i].context=e.target.value;setVocabList(nl);}} placeholder="Context sentence (optional) — how the word is used in this article" />
            </div>
          ))}
          <button onClick={()=>setVocabList(p=>[...p,{word:"",translation:"",pos:"Noun",context:""}])} style={{ width:"100%", padding:12, border:"2px dashed #d8d3c8", borderRadius:10, background:"transparent", color:"#8b7355", fontWeight:700, fontSize:13, cursor:"pointer", marginBottom:18 }}>+ Add Another Word</button>
          <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
            <button onClick={()=>setStep(1)} style={S.btnSecondary}>← Back</button>
            <button onClick={()=>setStep(3)} disabled={!canNext2} style={{...S.btnPrimary, opacity:canNext2?1:0.4, cursor:canNext2?"pointer":"not-allowed"}}>Next: Quiz Setup →</button>
          </div>
        </div>
      )}

      {/* STEP 3: Quiz Count */}
      {step===3 && (
        <div style={{ textAlign:"center", padding:"40px 0" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🧠</div>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, marginBottom:8 }}>Reading Comprehension Quiz</h3>
          <p style={{ fontSize:14, color:"#666", marginBottom:28, maxWidth:400, margin:"0 auto 28px" }}>How many quiz questions do you want to add for this article?</p>
          <div style={{ display:"flex", justifyContent:"center", gap:12, marginBottom:32 }}>
            {[2,3,4,5,6].map(n => (
              <button key={n} onClick={()=>setQuizCount(n)} style={{
                width:56, height:56, borderRadius:12, border:`2px solid ${quizCount===n?"#1a1a1a":"#d8d3c8"}`,
                background:quizCount===n?"#1a1a1a":"#fff", color:quizCount===n?"#fff":"#333",
                fontFamily:"'DM Serif Display',serif", fontSize:22, cursor:"pointer", transition:"all .15s"
              }}>{n}</button>
            ))}
          </div>
          <p style={{ fontSize:12, color:"#aaa", marginBottom:28 }}>You will create {quizCount} multiple-choice questions (4 options each)</p>
          <div style={{ display:"flex", justifyContent:"center", gap:10 }}>
            <button onClick={()=>setStep(2)} style={S.btnSecondary}>← Back</button>
            <button onClick={initQuizzes} style={S.btnPrimary}>Next: Write Questions →</button>
          </div>
        </div>
      )}

      {/* STEP 4: Quiz Questions */}
      {step===4 && (
        <div>
          <p style={{ fontSize:14, color:"#666", marginBottom:18 }}>Write {quizCount} comprehension questions. Mark the correct answer for each.</p>
          {quizList.map((q,qi) => (
            <div key={qi} style={{ background:"#fff", border:"1px solid #e8e2d8", borderRadius:12, padding:"20px 22px", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:COLORS.gold, marginBottom:10 }}>Question {qi+1} of {quizCount}</div>
              <textarea style={{...S.textarea, minHeight:70, marginBottom:12}} value={q.question} onChange={e=>updateQuiz(qi,"question",e.target.value)} placeholder="Write the question here..." />
              <div style={{ fontSize:12, fontWeight:700, color:"#555", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>Options (click radio to set correct answer)</div>
              {q.options.map((opt,oi) => (
                <div key={oi} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <input type="radio" name={"ans"+qi} checked={q.answer===opt && opt.trim()!==""} onChange={()=>updateQuiz(qi,"answer",opt)} style={{ accentColor:COLORS.gold, width:18, height:18, cursor:"pointer" }} />
                  <span style={{ width:22, height:22, borderRadius:6, background:"#f0ece4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#8b7355", flexShrink:0 }}>{"ABCD"[oi]}</span>
                  <input style={{...S.input, flex:1}} value={opt} onChange={e=>{updateQuizOpt(qi,oi,e.target.value); if(q.answer===q.options[oi]) updateQuiz(qi,"answer",e.target.value);}} placeholder={`Option ${"ABCD"[oi]}`} />
                </div>
              ))}
              {q.answer && <div style={{ fontSize:12, color:"#2d6a4f", marginTop:6, fontWeight:600 }}>✓ Correct: {q.answer}</div>}
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginTop:8 }}>
            <button onClick={()=>setStep(3)} style={S.btnSecondary}>← Back</button>
            <button onClick={handleSave} disabled={!canSave} style={{...S.btnPrimary, background:canSave?"#2d6a4f":"#ccc", cursor:canSave?"pointer":"not-allowed"}}>✓ Save Article</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// READING MODULE (with Admin)
// ═══════════════════════════════════════
function ReadingModule({ onBack }) {
  const [articles, setArticles] = useState(INIT_ARTICLES);
  const [articleVocab, setArticleVocab] = useState(INIT_ARTICLE_VOCAB);
  const [rdQuiz, setRdQuiz] = useState(INIT_RD_QUIZ);
  const [category, setCategory] = useState("all");
  const [article, setArticle] = useState(null);
  const [articleTab, setArticleTab] = useState("read");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null); // {id, field}
  const [editValue, setEditValue] = useState("");
  const [dark, setDark] = useState(false);

  const levelColors = { A:"#2d6a4f", B:"#c9a84c", C:"#c1554d", D:"#6b21a8" };
  const levelLabels = { A:"Beginner", B:"Intermediate", C:"Advanced", D:"Expert" };
  const getVocab = (aid) => articleVocab.filter(v=>v.aid===aid);
  const getQuiz = (aid) => rdQuiz.filter(q=>q.aid===aid);
  const filtered = category==="all" ? articles : articles.filter(a=>a.topics.toLowerCase().includes(category.toLowerCase()));

  // Admin actions
  const deleteSelected = () => {
    if (selected.size===0) return;
    if (!confirm(`Delete ${selected.size} article(s)? This cannot be undone.`)) return;
    setArticles(prev=>prev.filter(a=>!selected.has(a.id)));
    setArticleVocab(prev=>prev.filter(v=>!selected.has(v.aid)));
    setRdQuiz(prev=>prev.filter(q=>!selected.has(q.aid)));
    setSelected(new Set());
  };
  const toggleSelect = (id) => setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size===articles.length ? new Set() : new Set(articles.map(a=>a.id)));

  const startEdit = (id, field, currentVal) => { setEditingCell({id,field}); setEditValue(currentVal); };
  const saveEdit = () => {
    if (!editingCell) return;
    setArticles(prev=>prev.map(a=>a.id===editingCell.id?{...a,[editingCell.field]:editValue}:a));
    setEditingCell(null); setEditValue("");
  };

  const handleAddSave = (art, vocs, quizzes) => {
    setArticles(prev=>[...prev, art]);
    setArticleVocab(prev=>[...prev, ...vocs]);
    setRdQuiz(prev=>[...prev, ...quizzes]);
    setShowAddWizard(false);
  };

  const adminS = {
    th: { padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#8b7355", borderBottom:"2px solid #1a1a1a", whiteSpace:"nowrap" },
    td: { padding:"10px 14px", fontSize:13, borderBottom:"1px solid #e8e2d8", verticalAlign:"middle" },
  };

  // ── ADD WIZARD ──
  if (showAddWizard) {
    return (
      <div style={{ minHeight:"100vh", background:"#faf7f2", fontFamily:"'Source Sans 3',sans-serif" }}>
        <div style={{ position:"sticky",top:48,zIndex:100,background:"rgba(250,247,242,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #e0dcd5",padding:"12px 0" }}>
          <div style={{ maxWidth:780,margin:"0 auto",padding:"0 24px" }}>
            <button onClick={()=>setShowAddWizard(false)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:"#8b7355",fontFamily:"'Source Sans 3',sans-serif" }}>← Back to Admin</button>
          </div>
        </div>
        <AddArticleWizard onCancel={()=>setShowAddWizard(false)} onSave={handleAddSave} existingIds={articles.map(a=>a.id)} />
      </div>
    );
  }

  // ── ADMIN PANEL ──
  if (showAdmin) {
    return (
      <div style={{ minHeight:"100vh", background:"#faf7f2", fontFamily:"'Source Sans 3',sans-serif" }}>
        <div style={{ position:"sticky",top:48,zIndex:100,background:"rgba(250,247,242,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #e0dcd5",padding:"12px 0" }}>
          <div style={{ maxWidth:1100,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <button onClick={()=>setShowAdmin(false)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:"#8b7355",fontFamily:"'Source Sans 3',sans-serif" }}>← Back to Reading</button>
            <div style={{ display:"flex",gap:10 }}>
              {selected.size > 0 && (
                <button onClick={deleteSelected} style={{ padding:"8px 18px",background:"#c1554d",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer" }}>
                  Delete ({selected.size})
                </button>
              )}
              <button onClick={()=>setShowAddWizard(true)} style={{ padding:"8px 18px",background:"#1a1a1a",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer" }}>
                + Add Article
              </button>
            </div>
          </div>
        </div>
        <div style={{ maxWidth:1100,margin:"0 auto",padding:"32px 24px 80px",animation:"fadeUp .3s ease-out" }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, color:"#1a1a1a", marginBottom:6 }}>Article Manager</h2>
          <p style={{ fontSize:14, color:"#888", marginBottom:24 }}>Manage your reading articles. Click on Title or Category to edit inline.</p>
          <div style={{ background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 4px 24px rgba(26,39,68,0.08)", border:"1px solid #e8e2d8" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f9f6f0" }}>
                  <th style={{...adminS.th, width:40, textAlign:"center" }}>
                    <input type="checkbox" checked={selected.size===articles.length && articles.length>0} onChange={toggleAll} style={{ accentColor:COLORS.gold, width:16, height:16, cursor:"pointer" }} />
                  </th>
                  <th style={{...adminS.th, width:70}}>Code</th>
                  <th style={adminS.th}>Title</th>
                  <th style={{...adminS.th, width:110}}>Category</th>
                  <th style={{...adminS.th, width:70}}>Level</th>
                  <th style={{...adminS.th, width:60, textAlign:"center"}}>Vocab</th>
                  <th style={{...adminS.th, width:50, textAlign:"center"}}>Quiz</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a, i) => {
                  const isSelected = selected.has(a.id);
                  const vc = getVocab(a.id).length;
                  const qc = getQuiz(a.id).length;
                  return (
                    <tr key={a.id} style={{ background:isSelected?"#fef9ef":i%2===0?"#fff":"#fdfcf9", transition:"background .1s" }}>
                      <td style={{...adminS.td, textAlign:"center"}}>
                        <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(a.id)} style={{ accentColor:COLORS.gold, width:16, height:16, cursor:"pointer" }} />
                      </td>
                      <td style={{...adminS.td, fontFamily:"'DM Serif Display',serif", fontWeight:700, color:COLORS.gold, fontSize:14 }}>{a.id}</td>
                      <td style={adminS.td}>
                        {editingCell?.id===a.id && editingCell?.field==="title" ? (
                          <div style={{ display:"flex", gap:6 }}>
                            <input value={editValue} onChange={e=>setEditValue(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&saveEdit()} style={{ flex:1, padding:"6px 10px", border:"1.5px solid "+COLORS.gold, borderRadius:6, fontSize:13, fontFamily:"'Source Sans 3',sans-serif", outline:"none" }} />
                            <button onClick={saveEdit} style={{ padding:"4px 10px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:6, fontSize:11, cursor:"pointer" }}>Save</button>
                            <button onClick={()=>setEditingCell(null)} style={{ padding:"4px 8px", background:"#eee", border:"none", borderRadius:6, fontSize:11, cursor:"pointer" }}>✕</button>
                          </div>
                        ) : (
                          <span onClick={()=>startEdit(a.id,"title",a.title)} style={{ cursor:"pointer", fontWeight:600, fontSize:13, borderBottom:"1px dashed #ccc", paddingBottom:1 }} title="Click to edit">{a.title}</span>
                        )}
                      </td>
                      <td style={adminS.td}>
                        {editingCell?.id===a.id && editingCell?.field==="topics" ? (
                          <div style={{ display:"flex", gap:6 }}>
                            <select value={editValue} onChange={e=>setEditValue(e.target.value)} autoFocus style={{ padding:"6px 10px", border:"1.5px solid "+COLORS.gold, borderRadius:6, fontSize:13, outline:"none", cursor:"pointer" }}>
                              {["Science","Social","Lifestyle","Economics","Politics"].map(c=><option key={c}>{c}</option>)}
                            </select>
                            <button onClick={saveEdit} style={{ padding:"4px 10px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:6, fontSize:11, cursor:"pointer" }}>Save</button>
                            <button onClick={()=>setEditingCell(null)} style={{ padding:"4px 8px", background:"#eee", border:"none", borderRadius:6, fontSize:11, cursor:"pointer" }}>✕</button>
                          </div>
                        ) : (
                          <span onClick={()=>startEdit(a.id,"topics",a.topics)} style={{ cursor:"pointer", fontSize:12, fontWeight:600, color:"#8b7355", background:"#f0ece4", padding:"3px 10px", borderRadius:4, display:"inline-block" }} title="Click to edit">{a.topics}</span>
                        )}
                      </td>
                      <td style={adminS.td}>
                        <span style={{ fontSize:11, fontWeight:700, color:levelColors[a.level]||"#888", background:(levelColors[a.level]||"#888")+"18", padding:"3px 10px", borderRadius:4 }}>Level {a.level}</span>
                      </td>
                      <td style={{...adminS.td, textAlign:"center", fontWeight:600, fontSize:13 }}>{vc}</td>
                      <td style={{...adminS.td, textAlign:"center", fontWeight:600, fontSize:13 }}>{qc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {articles.length===0 && (
              <div style={{ textAlign:"center", padding:"40px 20px", color:"#aaa" }}>
                <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
                No articles yet. Click "Add Article" to get started.
              </div>
            )}
          </div>
          <div style={{ marginTop:16, fontSize:12, color:"#aaa", display:"flex", justifyContent:"space-between" }}>
            <span>{articles.length} article(s) total</span>
            <span>{selected.size} selected</span>
          </div>
        </div>
      </div>
    );
  }

  // ── ARTICLE VIEW ──
  if (article) {
    const vl = getVocab(article.id);
    const ql = getQuiz(article.id);
    const artBg = dk ? "#111" : "#faf7f2";
    const artNavBg = dk ? "rgba(17,17,17,0.97)" : "rgba(250,247,242,0.95)";
    const artNavBorder = dk ? "#2a2a2a" : "#e0dcd5";
    const artTextPrimary = dk ? "#f0ece4" : "#1a1a1a";
    const artTextSecondary = dk ? "rgba(240,236,228,0.5)" : "#555";
    const artBorderColor = dk ? "#333" : "#ddd";
    const artBodyColor = dk ? "#d4cfc8" : "#2a2a2a";
    const artHintBg = dk ? "rgba(201,168,76,0.1)" : "#f0ece4";
    const artHintBorder = dk ? "#c9a84c" : "#c9a84c";
    const artHintText = dk ? "#c9a84c" : "#6b5634";
    const artVocabBg = dk ? "#1a1a1a" : "#fff";
    const artVocabAltBg = dk ? "#222" : "#f9f6f0";
    const artVocabBorder = dk ? "#2a2a2a" : "#e8e2d8";
    const artVocabContextColor = dk ? "rgba(240,236,228,0.45)" : "#888";
    return (
      <div style={{ minHeight:"100vh", background:artBg, fontFamily:"'Source Sans 3',sans-serif", transition:"background .3s" }}>
        <div style={{ position:"sticky",top:48,zIndex:100,background:artNavBg,backdropFilter:"blur(10px)",borderBottom:`1px solid ${artNavBorder}`,padding:"12px 0" }}>
          <div style={{ maxWidth:780,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <button onClick={() => { setArticle(null); setArticleTab("read"); }} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:"#8b7355",fontFamily:"'Source Sans 3',sans-serif" }}>← Back</button>
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              <button onClick={()=>setDark(d=>!d)} style={{ padding:"5px 12px",background:dk?"#2a2a2a":"#f0ece4",border:`1px solid ${dk?"#444":"#d8d3c8"}`,borderRadius:6,fontSize:12,cursor:"pointer",color:dk?"#e8c87a":"#8b7355",fontWeight:600,fontFamily:"'Source Sans 3',sans-serif" }}>{dk?"☀":"🌙"}</button>
              <div style={{ display:"flex",gap:0,background:dk?"#2a2a2a":"#e8e2d8",borderRadius:8,padding:3 }}>
                {[{id:"read",label:"Read",icon:"📖"},{id:"vocab",label:`Vocabulary (${vl.length})`,icon:"📝"},{id:"quiz",label:`Quiz (${ql.length})`,icon:"🧠"}].map(t=>(
                  <button key={t.id} onClick={()=>setArticleTab(t.id)} style={{ background:articleTab===t.id?artVocabBg:"transparent",border:"none",borderRadius:6,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:articleTab===t.id?700:500,color:articleTab===t.id?artTextPrimary:"#888",fontFamily:"'Source Sans 3',sans-serif",boxShadow:articleTab===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none",transition:"all .15s" }}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <article style={{ maxWidth:780,margin:"0 auto",padding:"40px 24px 80px",animation:"fadeUp .4s ease-out" }}>
          <span style={{ fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.14em",color:"#8b7355" }}>{article.topics}</span>
          <h1 style={{ fontSize:42,fontWeight:700,lineHeight:1.1,margin:"16px 0 20px",fontFamily:"'Playfair Display',serif",color:artTextPrimary,transition:"color .3s" }}>{article.title}</h1>
          <div style={{ display:"flex",alignItems:"center",gap:8,paddingBottom:24,borderBottom:`1px solid ${artBorderColor}`,marginBottom:32 }}>
            <span style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:levelColors[article.level]||"#888",background:(levelColors[article.level]||"#888")+"22",padding:"4px 12px",borderRadius:4 }}>Level {article.level} · {levelLabels[article.level]||''}</span>
            <span style={{ fontSize:13,color:"#aaa" }}>·</span>
            <span style={{ fontSize:13,color:artTextSecondary }}>{vl.length} vocabulary</span>
            <span style={{ fontSize:13,color:"#aaa" }}>·</span>
            <span style={{ fontSize:13,color:artTextSecondary }}>{ql.length} quiz</span>
          </div>
          <div style={{ marginBottom:36,borderRadius:6,overflow:"hidden" }}>
            <img src={article.image} alt="" style={{ width:"100%",height:380,objectFit:"cover",filter:dk?"grayscale(30%) brightness(0.75)":"grayscale(8%)",transition:"filter .3s" }} />
          </div>

          {articleTab==="read" && (
            <div>
              <div style={{ background:artHintBg,borderRadius:8,padding:"14px 18px",marginBottom:36,display:"flex",alignItems:"center",gap:10,fontSize:14,color:artHintText,borderLeft:`4px solid ${artHintBorder}` }}>
                <span style={{ fontSize:18 }}>📖</span>
                <span><strong>{vl.length} kata penting</strong> ter-highlight di artikel ini. Klik kata bergaris bawah untuk melihat artinya.</span>
              </div>
              <div style={{ color:artBodyColor, transition:"color .3s" }}>
                <HighlightedText content={article.body} vocabList={vl} dark={dk} />
              </div>
            </div>
          )}

          {articleTab==="vocab" && (
            <div style={{ animation:"fadeUp .3s ease-out" }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:24,marginBottom:20,color:artTextPrimary }}>Vocabulary List</h3>
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {vl.map((v,i) => (
                  <div key={v.vid} style={{ background:i%2===0?artVocabBg:artVocabAltBg,border:`1px solid ${artVocabBorder}`,borderRadius:10,padding:"18px 22px",transition:"background .3s" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6 }}>
                      <span style={{ fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:artTextPrimary }}>{v.word}</span>
                      <span style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#8b7355",background:dk?"rgba(139,115,85,0.2)":"#f0ece4",padding:"3px 10px",borderRadius:4 }}>{v.pos}</span>
                    </div>
                    <div style={{ fontSize:16,fontWeight:600,color:COLORS.gold,marginBottom:8 }}>{v.translation}</div>
                    {v.context && <div style={{ fontSize:14,fontStyle:"italic",color:artVocabContextColor,lineHeight:1.5,paddingTop:8,borderTop:`1px solid ${artVocabBorder}` }}>"{v.context}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {articleTab==="quiz" && <div style={{ animation:"fadeUp .3s ease-out" }}><ReadingQuiz questions={ql} dark={dk} /></div>}
        </article>
      </div>
    );
  }

  // ── READING HOME ──
  const dk = dark;
  const bg = dk ? "#0f0f0f" : "#faf7f2";
  const bgCard = dk ? "#1a1a1a" : "#fff";
  const bgCardAlt = dk ? "#222" : "#fdfcf9";
  const bgNav = dk ? "rgba(15,15,15,0.97)" : "rgba(250,247,242,0.97)";
  const bgNavBtn = dk ? "#fff" : "#1a1a1a";
  const bgNavBtnTxt = dk ? "#0f0f0f" : "#faf7f2";
  const navInactive = dk ? "rgba(255,255,255,0.45)" : "#666";
  const textPrimary = dk ? "#f0ece4" : "#1a1a1a";
  const textSecondary = dk ? "rgba(240,236,228,0.55)" : "#666";
  const textMuted = dk ? "rgba(240,236,228,0.35)" : "#aaa";
  const borderColor = dk ? "#333" : "#ddd";
  const borderStrong = dk ? "#444" : "#1a1a1a";
  const mastBorder = dk ? "3px double #444" : "3px double #1a1a1a";
  const catNavBg = dk ? "rgba(15,15,15,0.97)" : "rgba(250,247,242,0.97)";
  const catNavBorder = dk ? "#2a2a2a" : "#e0dcd5";
  const badgeBg = dk ? "#2a2a2a" : "#f0ece4";
  const badgeColor = dk ? "#c9a84c" : "#8b7355";
  const vocabBg = dk ? "rgba(201,168,76,0.12)" : "#f0ece4";
  const footerBg = dk ? "#070707" : "#1a1a1a";

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"'Source Sans 3',sans-serif", transition:"background .3s, color .3s" }}>
      {/* Masthead */}
      <div style={{ textAlign:"center", padding:"36px 24px 8px", borderBottom:mastBorder, maxWidth:1100, margin:"0 auto" }}>
        <div style={{ fontSize:11, color:textMuted, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"'Source Sans 3',sans-serif" }}>English Reading Practice</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:48, fontWeight:900, color:textPrimary, letterSpacing:"-0.02em", marginBottom:6, lineHeight:1, transition:"color .3s" }}>The Reading Room</h1>
        <div style={{ fontSize:13, color:textMuted, fontFamily:"'Source Serif 4',serif", fontStyle:"italic", marginBottom:10 }}>Baca, pelajari, dan perkaya kosakata Inggrismu</div>
      </div>

      {/* Category nav */}
      <div style={{ position:"sticky", top:48, zIndex:150, background:catNavBg, backdropFilter:"blur(8px)", borderBottom:`1px solid ${catNavBorder}`, transition:"background .3s" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px", display:"flex", gap:2, overflowX:"auto", alignItems:"center" }}>
          {RD_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              background: category===c.id ? bgNavBtn : "none",
              color: category===c.id ? bgNavBtnTxt : navInactive,
              border:"none", cursor:"pointer", padding:"12px 20px", fontSize:13, fontWeight:600,
              fontFamily:"'Source Sans 3',sans-serif", letterSpacing:"0.05em", textTransform:"uppercase",
              borderRadius: category===c.id ? "6px 6px 0 0" : 0, transition:"all .2s", whiteSpace:"nowrap"
            }}>{c.label}</button>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            {/* Dark mode toggle */}
            <button onClick={() => setDark(d => !d)} title={dk ? "Switch to Light Mode" : "Switch to Dark Mode"} style={{
              padding:"7px 14px", background: dk ? "#2a2a2a" : "#f0ece4",
              border: `1.5px solid ${dk ? "#444" : "#d8d3c8"}`,
              borderRadius:7, fontSize:13, cursor:"pointer",
              display:"flex", alignItems:"center", gap:5, transition:"all .2s", whiteSpace:"nowrap",
              color: dk ? "#e8c87a" : "#8b7355", fontWeight:600, fontFamily:"'Source Sans 3',sans-serif"
            }}>
              {dk ? "☀ Light" : "🌙 Dark"}
            </button>
            <button onClick={() => setShowAdmin(true)} style={{
              padding:"7px 16px", background:"transparent",
              border: `1.5px solid ${dk ? "#444" : "#d8d3c8"}`,
              borderRadius:7, fontSize:12, fontWeight:600,
              color: dk ? "rgba(255,255,255,0.4)" : "#8b7355",
              cursor:"pointer", fontFamily:"'Source Sans 3',sans-serif",
              display:"flex", alignItems:"center", gap:5, transition:"all .15s", whiteSpace:"nowrap"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = dk ? "#888" : "#8b7355"; e.currentTarget.style.background = dk ? "#2a2a2a" : "#f0ece4"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = dk ? "#444" : "#d8d3c8"; e.currentTarget.style.background = "transparent"; }}
            >⚙ Admin</button>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"36px 24px 60px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:textMuted }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:4, color:textSecondary }}>No articles in this category</div>
            <div style={{ fontSize:14 }}>Add articles through the Admin panel</div>
          </div>
        )}
        {filtered.map((a, i) => {
          const vc = getVocab(a.id).length, qc = getQuiz(a.id).length;
          if (i === 0) {
            return (
              <div key={a.id} onClick={() => setArticle(a)} style={{
                display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:36,
                marginBottom:40, paddingBottom:40, borderBottom:`2px solid ${borderStrong}`, cursor:"pointer"
              }}>
                <div style={{ overflow:"hidden", borderRadius:4, aspectRatio:"4/3" }}>
                  <img src={a.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:dk?"grayscale(30%) brightness(0.8)":"grayscale(10%)", transition:"filter .3s" }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:badgeColor, marginBottom:8, fontFamily:"'Source Sans 3',sans-serif" }}>{a.topics}</span>
                  <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", color:levelColors[a.level]||"#888", background:(levelColors[a.level]||"#888")+"22", padding:"3px 10px", borderRadius:4 }}>Level {a.level}</span>
                    <span style={{ fontSize:10, fontWeight:600, color:badgeColor, background:vocabBg, padding:"3px 10px", borderRadius:4 }}>{vc} vocab · {qc} quiz</span>
                  </div>
                  <h2 style={{ fontSize:32, fontWeight:700, lineHeight:1.15, margin:"0 0 14px", fontFamily:"'Playfair Display',serif", color:textPrimary, transition:"color .3s" }}>{a.title}</h2>
                  <p style={{ fontSize:15, lineHeight:1.5, color:textSecondary, margin:0, fontFamily:"'Source Serif 4',serif", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{a.body.split("\n\n")[0]}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={a.id} onClick={() => setArticle(a)} style={{
              cursor:"pointer", borderBottom:`1px solid ${borderColor}`,
              paddingBottom:20, marginBottom:20, display:"flex", gap:18
            }}>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:badgeColor, fontFamily:"'Source Sans 3',sans-serif" }}>{a.topics}</span>
                <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:levelColors[a.level]||"#888", background:(levelColors[a.level]||"#888")+"22", padding:"3px 10px", borderRadius:4 }}>Level {a.level}</span>
                  <span style={{ fontSize:10, fontWeight:600, color:badgeColor, background:vocabBg, padding:"3px 10px", borderRadius:4 }}>{vc} vocab · {qc} quiz</span>
                </div>
                <h3 style={{ fontSize:20, fontWeight:700, lineHeight:1.25, margin:"6px 0 6px", fontFamily:"'Playfair Display',serif", color:textPrimary, transition:"color .3s" }}>{a.title}</h3>
                <p style={{ fontSize:14, lineHeight:1.45, color:textSecondary, margin:0, fontFamily:"'Source Serif 4',serif", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{a.body.split("\n\n")[0]}</p>
              </div>
              <div style={{ width:140, minWidth:140, height:100, overflow:"hidden", borderRadius:4, flexShrink:0 }}>
                <img src={a.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:dk?"grayscale(30%) brightness(0.8)":"grayscale(10%)", transition:"filter .3s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ borderTop:`2px solid ${borderStrong}`, background:footerBg, padding:"36px 24px", textAlign:"center", transition:"background .3s" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, color:COLORS.goldLight, marginBottom:6 }}>EduEnglish · The Reading Room</div>
        <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Platform latihan bahasa Inggris untuk SNBT</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN APP — LANDING + ROUTING
// ═══════════════════════════════════════
export default function App() {
  const [activeModule, setActiveModule] = useState("landing"); // landing | vocab | reading

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap');
      @keyframes ttIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      *{box-sizing:border-box;margin:0;padding:0}
      ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}
    `;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  // ── HEADER ──
  const Header = () => (
    <div style={{ background:COLORS.navyDark,padding:0,position:"sticky",top:0,zIndex:500 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",maxWidth:1200,margin:"0 auto" }}>
        <div onClick={() => setActiveModule("landing")} style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 0",cursor:"pointer" }}>
          <div style={{ width:32,height:32,background:COLORS.sage,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>📖</div>
          <div>
            <div style={{ fontFamily:"'DM Serif Display',serif",color:"#fff",fontSize:"1.15rem",lineHeight:1 }}>Edu<span style={{ color:COLORS.sageLight }}>English</span></div>
          </div>
        </div>
        <div style={{ display:"flex",gap:0 }}>
          {[
            { id:"landing", label:"Beranda" },
            { id:"vocab", label:"✦ Latihan Vocab" },
            { id:"reading", label:"◈ Ayo Reading!" },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveModule(t.id)} style={{
              background:"none",border:"none",padding:"16px 20px",
              color:activeModule===t.id?"#fff":"rgba(255,255,255,0.4)",
              fontFamily:"'DM Sans',sans-serif",fontSize:"0.82rem",fontWeight:activeModule===t.id?700:500,
              cursor:"pointer",borderBottom:activeModule===t.id?`3px solid ${COLORS.sageLight}`:"3px solid transparent",
              transition:"all .15s",whiteSpace:"nowrap"
            }}>{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── LANDING PAGE ──
  const Landing = () => (
    <div style={{ background:COLORS.cream,minHeight:"100vh",animation:"fadeIn .4s ease-out" }}>
      <div style={{ background:`linear-gradient(135deg, ${COLORS.navyDark} 0%, ${COLORS.navy} 50%, #1e3a5f 100%)`,padding:"80px 28px 110px",textAlign:"center",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-100,right:-100,width:400,height:400,borderRadius:"50%",background:"rgba(93,138,110,0.1)" }} />
        <div style={{ position:"absolute",bottom:-120,left:-80,width:350,height:350,borderRadius:"50%",background:"rgba(255,255,255,0.03)" }} />
        <div style={{ display:"inline-block",background:"rgba(93,138,110,0.25)",color:COLORS.sageLight,fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",padding:"6px 18px",borderRadius:20,marginBottom:24,position:"relative",zIndex:1 }}>
          Platform Latihan LBE SNBT
        </div>
        <h1 style={{ fontFamily:"'DM Serif Display',serif",color:"#fff",fontSize:"2.6rem",lineHeight:1.2,maxWidth:650,margin:"0 auto 18px",position:"relative",zIndex:1 }}>
          Kuasai Bahasa Inggris untuk <span style={{ color:COLORS.sageLight }}>SNBT</span>
        </h1>
        <p style={{ color:"rgba(255,255,255,0.55)",fontSize:"0.92rem",lineHeight:1.7,maxWidth:520,margin:"0 auto",position:"relative",zIndex:1 }}>
          Latih kosakata dan kemampuan membaca teks Bahasa Inggris. Dirancang khusus untuk persiapan Literasi Bahasa Inggris (LBE) di SNBT.
        </p>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:800,margin:"-50px auto 50px",padding:"0 24px",position:"relative",zIndex:2 }}>
        {/* Vocab Card */}
        <div onClick={() => setActiveModule("vocab")}
          style={{ background:"#fff",borderRadius:18,padding:"36px 30px",boxShadow:"0 12px 48px rgba(26,39,68,0.15)",cursor:"pointer",transition:"all .22s",border:"2px solid transparent",position:"relative",overflow:"hidden" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=COLORS.sage; e.currentTarget.style.transform="translateY(-4px)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.transform="none"; }}
        >
          <span style={{ position:"absolute",top:18,right:18,fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",padding:"4px 12px",borderRadius:20,background:COLORS.sagePale,color:COLORS.sage }}>Interactive Quiz</span>
          <div style={{ width:56,height:56,borderRadius:14,background:COLORS.sagePale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:18 }}>🔤</div>
          <div style={{ fontFamily:"'DM Serif Display',serif",fontSize:"1.35rem",marginBottom:8,color:COLORS.navy }}>Latihan Vocab</div>
          <p style={{ color:COLORS.textLight,fontSize:"0.84rem",lineHeight:1.6,marginBottom:16 }}>Quiz interaktif kosakata Bahasa Inggris ↔ Indonesia. Pilih kategori, jumlah soal, dan durasi waktu.</p>
          <div style={{ fontSize:"0.82rem",fontWeight:700,color:COLORS.sage }}>Mulai latihan →</div>
          <div style={{ display:"flex",gap:16,marginTop:16,paddingTop:16,borderTop:"1px solid #eee" }}>
            {[["322","Kata"],["2","Mode"],["5","Paket"]].map(([n,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <span style={{ fontFamily:"'DM Serif Display',serif",fontSize:"1.3rem",color:COLORS.navy,display:"block" }}>{n}</span>
                <span style={{ fontSize:"0.62rem",color:COLORS.textLight,textTransform:"uppercase",letterSpacing:"0.06em" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reading Card */}
        <div onClick={() => setActiveModule("reading")}
          style={{ background:"#fff",borderRadius:18,padding:"36px 30px",boxShadow:"0 12px 48px rgba(26,39,68,0.15)",cursor:"pointer",transition:"all .22s",border:"2px solid transparent",position:"relative",overflow:"hidden" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#3b82f6"; e.currentTarget.style.transform="translateY(-4px)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.transform="none"; }}
        >
          <span style={{ position:"absolute",top:18,right:18,fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",padding:"4px 12px",borderRadius:20,background:"#eff6ff",color:"#3b82f6" }}>Deep Reading</span>
          <div style={{ width:56,height:56,borderRadius:14,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:18 }}>📰</div>
          <div style={{ fontFamily:"'DM Serif Display',serif",fontSize:"1.35rem",marginBottom:8,color:COLORS.navy }}>Ayo Reading!</div>
          <p style={{ color:COLORS.textLight,fontSize:"0.84rem",lineHeight:1.6,marginBottom:16 }}>Baca artikel Bahasa Inggris dengan fitur highlight kosakata. Lengkap dengan quiz pemahaman bacaan.</p>
          <div style={{ fontSize:"0.82rem",fontWeight:700,color:"#3b82f6" }}>Baca sekarang →</div>
          <div style={{ display:"flex",gap:16,marginTop:16,paddingTop:16,borderTop:"1px solid #eee" }}>
            {[["4","Artikel"],["28","Vocab"],["16","Quiz"]].map(([n,l]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <span style={{ fontFamily:"'DM Serif Display',serif",fontSize:"1.3rem",color:COLORS.navy,display:"block" }}>{n}</span>
                <span style={{ fontSize:"0.62rem",color:COLORS.textLight,textTransform:"uppercase",letterSpacing:"0.06em" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign:"center",padding:"16px 24px 52px" }}>
        <p style={{ color:COLORS.textLight,fontSize:"0.78rem" }}>© 2026 EduEnglish · Platform persiapan SNBT</p>
      </div>
    </div>
  );

  return (
    <div>
      <Header />
      {activeModule === "landing" && <Landing />}
      {activeModule === "vocab" && <VocabModule onBack={() => setActiveModule("landing")} />}
      {activeModule === "reading" && <ReadingModule onBack={() => setActiveModule("landing")} />}
    </div>
  );
}