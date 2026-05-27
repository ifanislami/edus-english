// UserProfile.jsx - User profile dengan history vocab quiz dan reading
// Copy file ini ke src/UserProfile.jsx

import { useState, useEffect } from "react";

const C = {
  navyDark: "#1a2744",
  sage: "#5d8a6e",
};

export function UserProfile({ user, onLogout, supabase }) {
  const [vocabHistory, setVocabHistory] = useState([]);
  const [readingHistory, setReadingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("vocab");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      // Fetch vocab scores
      const { data: vocabData, error: vocabErr } = await supabase
        .from("vocab_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (vocabErr) throw vocabErr;
      setVocabHistory(vocabData || []);

      // Fetch reading progress
      const { data: readingData, error: readingErr } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (readingErr) throw readingErr;
      setReadingHistory(readingData || []);
    } catch (err) {
      alert("Error loading history: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const avgScore = vocabHistory.length > 0 ? (vocabHistory.reduce((sum, h) => sum + (h.score / h.total) * 100, 0) / vocabHistory.length).toFixed(1) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Profile Header */}
      <div style={{ background: C.navyDark, color: "#fff", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, margin: "0 0 4px" }}>Profile Saya</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0 }}>{user.email}</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: "4px 0 0", textTransform: "uppercase" }}>
              Plan: {user.plan}
            </p>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: "8px 16px",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "30px 20px" }}>
        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 30 }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.sage, marginBottom: 6 }}>{vocabHistory.length}</div>
            <div style={{ fontSize: 13, color: "#888" }}>Total Quiz Vocab</div>
          </div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.sage, marginBottom: 6 }}>{avgScore}%</div>
            <div style={{ fontSize: 13, color: "#888" }}>Rata-rata Score</div>
          </div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.sage, marginBottom: 6 }}>{readingHistory.length}</div>
            <div style={{ fontSize: 13, color: "#888" }}>Artikel Dibaca</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #ddd" }}>
          {["vocab", "reading"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "12px 20px",
                background: "none",
                border: "none",
                fontSize: 14,
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? C.navyDark : "#999",
                borderBottom: activeTab === tab ? `3px solid ${C.sage}` : "none",
                cursor: "pointer",
                marginBottom: "-2px",
              }}
            >
              {tab === "vocab" ? "Vocab Quiz History" : "Reading Progress"}
            </button>
          ))}
        </div>

        {/* History Content */}
        {loading ? (
          <p>Loading...</p>
        ) : activeTab === "vocab" ? (
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
            {vocabHistory.length === 0 ? (
              <p style={{ padding: 20, color: "#888" }}>Belum ada riwayat vocab quiz.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f9", borderBottom: "1px solid #eee" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Tanggal</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Mode</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Kategori</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Score</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Persentase</th>
                  </tr>
                </thead>
                <tbody>
                  {vocabHistory.map((h, i) => {
                    const percentage = ((h.score / h.total) * 100).toFixed(0);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{new Date(h.completed_at).toLocaleDateString("id-ID", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{h.mode || "EN→ID"}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{h.category || "All"}</td>
                        <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, color: C.sage }}>
                          {h.score}/{h.total}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: percentage >= 70 ? "#2d6a4f" : percentage >= 50 ? "#c9a84c" : "#c1554d" }}>
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, padding: 20 }}>
            {readingHistory.length === 0 ? (
              <p style={{ color: "#888" }}>Belum ada riwayat reading progress.</p>
            ) : (
              <div>
                <p style={{ marginBottom: 20, color: "#666", fontWeight: 600 }}>Total artikel dibaca: {readingHistory.length}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
                  {readingHistory.map((h, i) => (
                    <div key={i} style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#f9f9f9" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.navyDark, marginBottom: 8 }}>Artikel {h.article_id}</div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Vocab diisi: {h.vocab_completed}</div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Quiz dijawab: {h.quiz_answered}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{new Date(h.completed_at).toLocaleDateString("id-ID")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
