import { useEffect, useMemo, useState } from "react";

const C = { navy: "#1a2744", sage: "#5d8a6e", gold: "#c99a36", red: "#c1554d", ink: "#2b3445" };
const pct = (value) => `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
const scorePct = (row) => row.total > 0 ? row.score / row.total * 100 : 0;
const quizPct = (row) => row.quiz_total > 0 ? row.quiz_score / row.quiz_total * 100 : 0;

function Card({ label, value, note }) {
  return <div style={{ background: "#fff", padding: 20, borderRadius: 13, border: "1px solid #e8e9ed", boxShadow: "0 3px 12px rgba(25,39,68,.04)" }}>
    <div style={{ fontSize: 30, fontWeight: 800, color: C.sage, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 7 }}>{label}</div>
    {note && <div style={{ fontSize: 11, color: "#9298a3", marginTop: 4 }}>{note}</div>}
  </div>;
}

function VocabChart({ common, awl }) {
  const width = 720, height = 250, left = 45, right = 18, top = 20, bottom = 35;
  const plotW = width - left - right, plotH = height - top - bottom;
  const points = (rows) => rows.map((row, index) => ({
    x: left + (rows.length === 1 ? plotW / 2 : index * plotW / (rows.length - 1)),
    y: top + (100 - scorePct(row)) / 100 * plotH,
    value: scorePct(row),
  }));
  const series = [{ key: "common", label: "Common", color: C.sage, rows: common }, { key: "awl", label: "AWL", color: C.gold, rows: awl }];
  const hasData = common.length || awl.length;

  return <section style={{ background: "#fff", borderRadius: 14, padding: "22px 22px 15px", border: "1px solid #e8e9ed" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div><h3 style={{ color: C.navy, fontSize: 18, margin: 0 }}>Perkembangan Latihan Vocab</h3><p style={{ color: "#89909c", fontSize: 12, margin: "5px 0 0" }}>Maksimal 10 latihan terakhir per kategori</p></div>
      <div style={{ display: "flex", gap: 15 }}>{series.map(s => <span key={s.key} style={{ color: "#697180", fontSize: 12 }}><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: s.color, marginRight: 6 }} />{s.label}</span>)}</div>
    </div>
    {!hasData ? <div style={{ minHeight: 210, display: "grid", placeItems: "center", color: "#9aa0aa", fontSize: 13 }}>Selesaikan latihan vocab untuk mulai melihat grafik.</div> :
      <div style={{ overflowX: "auto", marginTop: 12 }}><svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 570, width: "100%", display: "block" }} role="img" aria-label="Grafik 10 latihan vocab terakhir">
        {[0,25,50,75,100].map(v => { const y = top + (100-v)/100*plotH; return <g key={v}><line x1={left} y1={y} x2={width-right} y2={y} stroke="#eceef1" /><text x={left-9} y={y+4} textAnchor="end" fontSize="10" fill="#9298a3">{v}%</text></g>; })}
        {series.map(s => { const ps = points(s.rows); return <g key={s.key}>{ps.length > 1 && <polyline fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={ps.map(p => `${p.x},${p.y}`).join(" ")} />}{ps.map((p,i) => <g key={i}><circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke={s.color} strokeWidth="3"><title>{`${s.label} latihan ${i+1}: ${p.value.toFixed(0)}%`}</title></circle><text x={p.x} y={height-10} textAnchor="middle" fontSize="9" fill="#a0a5ae">{i+1}</text></g>)}</g>; })}
      </svg></div>}
  </section>;
}

function LevelDistribution({ rows, scoreMode = false }) {
  const validRows = scoreMode ? rows.filter(r => r.quiz_total > 0) : rows;
  return <div style={{ display: "grid", gap: 13 }}>
    {["1","2","3"].map((level, index) => {
      const items = validRows.filter(r => String(r.article_level) === level);
      const share = validRows.length ? items.length / validRows.length * 100 : 0;
      const average = items.length ? items.reduce((sum, r) => sum + quizPct(r), 0) / items.length : 0;
      const color = [C.sage, C.gold, C.red][index];
      return <div key={level}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 700, color: C.ink }}>Level {level}</span><span style={{ color: "#747b88" }}>{scoreMode ? `${pct(average)} rata-rata · ${pct(share)} quiz` : `${pct(share)} · ${items.length} artikel`}</span></div>
        <div style={{ height: 8, background: "#edf0f2", borderRadius: 8, overflow: "hidden" }}><div style={{ width: `${scoreMode ? average : share}%`, height: "100%", background: color, borderRadius: 8 }} /></div>
      </div>;
    })}
  </div>;
}

export function UserProfile({ user, onLogout, supabase }) {
  const [vocab, setVocab] = useState([]);
  const [reading, setReading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!supabase || !user) return;
      setLoading(true); setError("");
      const [vocabResult, readingResult] = await Promise.all([
        supabase.from("vocab_scores").select("score,total,quiz_type,category,mode,completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }),
        supabase.from("reading_progress").select("article_id,article_level,vocab_completed,quiz_answered,quiz_score,quiz_total,completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }),
      ]);
      if (!active) return;
      const loadError = vocabResult.error || readingResult.error;
      if (loadError) setError(loadError.message);
      else { setVocab(vocabResult.data || []); setReading(readingResult.data || []); }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [supabase, user]);

  const chartData = useMemo(() => ({
    common: vocab.filter(v => v.quiz_type === "common").slice(0,10).reverse(),
    awl: vocab.filter(v => v.quiz_type === "awl").slice(0,10).reverse(),
  }), [vocab]);
  const vocabAverage = vocab.length ? vocab.reduce((sum,row) => sum + scorePct(row), 0) / vocab.length : 0;
  const validQuiz = reading.filter(row => row.quiz_total > 0);
  const quizAverage = validQuiz.length ? validQuiz.reduce((sum,row) => sum + quizPct(row), 0) / validQuiz.length : 0;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Pelajar";

  return <div style={{ minHeight: "100vh", background: "#f5f6f8", color: C.ink }}>
    <header style={{ background: C.navy, color: "#fff", padding: "25px 24px" }}><div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}><div style={{ width: 45, height: 45, borderRadius: "50%", background: C.sage, display: "grid", placeItems: "center", fontSize: 20, fontWeight: 800 }}>{displayName.slice(0,1).toUpperCase()}</div><div><h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 21, margin: 0 }}>{displayName}</h2><p style={{ color: "rgba(255,255,255,.6)", fontSize: 12, margin: "3px 0 0" }}>{user.email || "Akun sosial"}</p></div></div>
      <button onClick={onLogout} style={{ padding: "8px 15px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.24)", color: "#fff", borderRadius: 7, cursor: "pointer" }}>Logout</button>
    </div></header>

    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "27px 20px 45px" }}>
      {error && <div style={{ background: "#fce8e6", color: "#a83c35", padding: 13, borderRadius: 9, marginBottom: 18 }}>Gagal memuat statistik: {error}</div>}
      {loading ? <div style={{ minHeight: 350, display: "grid", placeItems: "center", color: "#858c98" }}>Memuat statistik...</div> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 20 }}>
          <Card value={vocab.length} label="Latihan Vocab" note={`${chartData.common.length} Common · ${chartData.awl.length} AWL terbaru`} />
          <Card value={pct(vocabAverage)} label="Rata-rata Vocab" note="Seluruh latihan tersimpan" />
          <Card value={reading.length} label="Artikel Dibaca" note="Quiz artikel telah diselesaikan" />
          <Card value={pct(quizAverage)} label="Rata-rata Quiz" note={`${validQuiz.length} quiz artikel`} />
        </div>

        <VocabChart common={chartData.common} awl={chartData.awl} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18, marginTop: 20 }}>
          <section style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #e8e9ed" }}><h3 style={{ fontSize: 17, color: C.navy, margin: "0 0 5px" }}>Sebaran Artikel Dibaca</h3><p style={{ color: "#9197a2", fontSize: 12, margin: "0 0 20px" }}>Persentase bacaan di tiap level</p><LevelDistribution rows={reading} /></section>
          <section style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #e8e9ed" }}><h3 style={{ fontSize: 17, color: C.navy, margin: "0 0 5px" }}>Skor Quiz per Level</h3><p style={{ color: "#9197a2", fontSize: 12, margin: "0 0 20px" }}>Rata-rata skor dan sebaran jumlah quiz</p><LevelDistribution rows={reading} scoreMode /></section>
        </div>
      </>}
    </main>
  </div>;
}
