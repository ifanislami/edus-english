import { useState } from "react";

const C = { navy: "#1a2744", sage: "#5d8a6e", cream: "#f9f7f2" };

export function LoginPage({ supabase }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  const begin = (name) => { setError(""); setMessage(""); setLoading(name); };

  const oauth = async () => {
    if (!supabase) {
      setError("Login Google belum siap. Konfigurasi Supabase aplikasi belum tersedia.");
      return;
    }

    begin("google");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (authError) {
        setError(authError.message.includes("provider")
          ? "Login Google belum diaktifkan. Hubungi admin aplikasi."
          : authError.message);
        setLoading("");
      }
    } catch {
      setError("Tidak dapat memulai login Google. Periksa koneksi internet lalu coba lagi.");
      setLoading("");
    }
  };

  const submitEmail = async (event) => {
    event.preventDefault();
    if (!supabase) return setError("Supabase belum dikonfigurasi.");
    begin("email");
    const credentials = { email: email.trim(), password };
    const result = mode === "register"
      ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword(credentials);
    if (result.error) setError(result.error.message);
    else if (mode === "register" && !result.data.session) setMessage("Akun dibuat. Cek email untuk mengaktifkan akun, lalu login.");
    setLoading("");
  };

  const field = { width: "100%", padding: "12px 14px", border: "1px solid #d8dbe2", borderRadius: 9, fontSize: 14, outline: "none" };
  const social = { width: "100%", padding: 12, background: "#fff", color: "#263043", border: "1px solid #d8dbe2", borderRadius: 9, fontWeight: 650, cursor: "pointer" };

  return (
    <div style={{ minHeight: "calc(100vh - 50px)", display: "grid", placeItems: "center", background: `linear-gradient(145deg,${C.navy},#0e1627)`, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 430, background: C.cream, borderRadius: 18, padding: "36px 32px", boxShadow: "0 22px 60px rgba(0,0,0,.3)" }}>
        <h1 style={{ textAlign: "center", color: C.navy, fontFamily: "'DM Serif Display',serif", fontSize: 30, marginBottom: 5 }}>TumbuhAcademy</h1>
        <p style={{ textAlign: "center", color: "#77808f", fontSize: 13, marginBottom: 25 }}>Masuk agar perkembangan belajarmu tersimpan</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#ebe9e3", borderRadius: 9, padding: 3, marginBottom: 22 }}>
          {[["login","Masuk"],["register","Daftar"]].map(([key,label]) => <button key={key} onClick={() => { setMode(key); setError(""); setMessage(""); }} style={{ padding: 9, border: 0, borderRadius: 7, background: mode === key ? "#fff" : "transparent", color: C.navy, fontWeight: 700, cursor: "pointer", boxShadow: mode === key ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>{label}</button>)}
        </div>

        {(error || message) && <div role="status" style={{ padding: "11px 13px", borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.45, background: error ? "#fce8e6" : "#e8f5ec", color: error ? "#a83c35" : "#27633c" }}>{error || message}</div>}

        <form onSubmit={submitEmail} style={{ display: "grid", gap: 12 }}>
          <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={field} />
          <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (minimal 6 karakter)" style={field} />
          <button disabled={!!loading} style={{ width: "100%", padding: 12, border: 0, borderRadius: 9, background: C.sage, color: "#fff", fontWeight: 750, cursor: "pointer", opacity: loading ? .65 : 1 }}>{loading === "email" ? "Memproses..." : mode === "login" ? "Masuk dengan Email" : "Buat Akun"}</button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#a1a5ad", fontSize: 12, margin: "21px 0" }}><span style={{ height: 1, background: "#ddd", flex: 1 }} /><span>atau lanjutkan dengan</span><span style={{ height: 1, background: "#ddd", flex: 1 }} /></div>
        <button type="button" disabled={!!loading} onClick={oauth} style={social}>
          {loading === "google" ? "Mengarahkan ke Google..." : "Lanjutkan dengan Google"}
        </button>
        <p style={{ color: "#9499a3", fontSize: 11, lineHeight: 1.5, textAlign: "center", marginTop: 20 }}>Dengan masuk, progres vocab, artikel, dan quiz tersimpan di profilmu.</p>
      </div>
    </div>
  );
}
