// AdminDashboard.jsx - Admin panel untuk approve premium requests
// Copy file ini ke src/AdminDashboard.jsx

import { useState, useEffect } from "react";

const C = {
  navyDark: "#1a2744",
  sage: "#5d8a6e",
};

export function AdminDashboard({ user, onLogout, supabase }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [approveLoading, setApproveLoading] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("premium_requests")
        .select("*")
        .eq("status", activeTab)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      alert("Error fetching requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCredentials = () => {
    const username = `edu_${Date.now()}`;
    const password = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    return { username, password };
  };

  const approveRequest = async (req) => {
    if (!supabase) return;
    if (!window.confirm(`Approve request dari ${req.email}?`)) return;

    setApproveLoading(req.id);
    try {
      const { username, password } = generateCredentials();

      // 1. Insert ke users_manual
      const { error: insertErr } = await supabase.from("users_manual").insert({
        email: req.email,
        username,
        password_hash: password, // NOTE: Gunakan bcrypt di production!
        full_name: req.full_name,
        plan: "premium",
        subscription_end: new Date(
          Date.now() + (req.plan_type === "yearly" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)
        ).toISOString(),
      });

      if (insertErr) throw insertErr;

      // 2. Update premium_requests status
      const { error: updateErr } = await supabase
        .from("premium_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", req.id);

      if (updateErr) throw updateErr;

      // 3. TODO: Kirim email dengan credentials

      alert(
        `✅ APPROVED!\n\nUsername: ${username}\nPassword: ${password}\n\nSalin username & password ini dan kirim via email ke ${req.email}`
      );

      fetchRequests();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setApproveLoading(null);
    }
  };

  const rejectRequest = async (req) => {
    if (!supabase) return;
    if (!window.confirm(`Reject request dari ${req.email}?`)) return;

    try {
      const { error } = await supabase
        .from("premium_requests")
        .update({ status: "rejected" })
        .eq("id", req.id);

      if (error) throw error;
      fetchRequests();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Admin Header */}
      <div
        style={{
          background: C.navyDark,
          color: "#fff",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, margin: 0 }}>Admin Dashboard</h1>
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

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "30px 20px" }}>
        <h2 style={{ fontSize: 18, marginBottom: 20 }}>Premium Requests</h2>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #ddd" }}>
          {["pending", "approved", "rejected"].map((tab) => (
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
              {tab.toUpperCase()} ({requests.length})
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading...</p>
        ) : requests.length === 0 ? (
          <p style={{ color: "#999", padding: "20px", background: "#fff", borderRadius: 8 }}>
            Tidak ada {activeTab} requests.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 }}>
            <thead>
              <tr style={{ background: "#f9f9f9", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Email</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Nama</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Paket</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600 }}>Tanggal</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 13, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px 16px", fontSize: 14 }}>{req.email}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14 }}>{req.full_name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14 }}>{req.plan_type}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#888" }}>
                    {new Date(req.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    {activeTab === "pending" && (
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          onClick={() => approveRequest(req)}
                          disabled={approveLoading === req.id}
                          style={{
                            padding: "6px 12px",
                            background: "#2d6a4f",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            opacity: approveLoading === req.id ? 0.7 : 1,
                          }}
                        >
                          {approveLoading === req.id ? "..." : "✓ Approve"}
                        </button>
                        <button
                          onClick={() => rejectRequest(req)}
                          style={{
                            padding: "6px 12px",
                            background: "#c1554d",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                    {activeTab === "approved" && <span style={{ color: "#2d6a4f", fontWeight: 600 }}>✓ Approved</span>}
                    {activeTab === "rejected" && <span style={{ color: "#c1554d", fontWeight: 600 }}>✕ Rejected</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Info Box */}
        <div
          style={{
            marginTop: 30,
            padding: "16px 18px",
            background: "#e8f5e9",
            borderRadius: 10,
            border: "1px solid #a5d6a7",
            fontSize: 13,
            color: "#2d6a4f",
            lineHeight: 1.6,
          }}
        >
          <strong>ℹ️ Info:</strong> Setelah klik Approve, copy username + password yang ditampilkan, lalu kirim via email ke user.
          <br />
          <strong>TODO:</strong> Implementasi auto-email (gunakan Resend atau SendGrid).
        </div>
      </div>
    </div>
  );
}
