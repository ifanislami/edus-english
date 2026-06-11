// AuthPages.jsx - Login and Premium Register Forms
// Copy file ini ke src/AuthPages.jsx

import { useState } from "react";

const C = {
  navyDark: "#1a2744",
  sage: "#5d8a6e",
  sageLight: "#7ea88a",
  cream: "#f9f7f2",
};

export function LoginPage({ onLoginSuccess, onGoToRegister, supabase }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState("email");

  const handleEmailLogin = async () => {
  console.log("1. Login clicked");
  
  if (!supabase) {
    console.log("2. Supabase null");
    setError("Supabase belum dikonfigurasi");
    return;
  }
  console.log("3. Supabase OK");
  
  if (!email || !password) {
    console.log("4. Email/password empty");
    setError("Email dan password harus diisi");
    return;
  }

  setLoading(true);
  setError("");
  try {
    console.log("5. Fetching user from DB");
    const { data: users, error: fetchErr } = await supabase
      .from("users_manual")
      .select("*")
      .eq("email", email);

    console.log("6. Fetch done - users:", users, "error:", fetchErr);

      if (fetchErr) throw fetchErr;
      if (!users || users.length === 0) {
        setError("Email atau password salah");
        setLoading(false);
        return;
      }

      const user = users[0];

      // Simple password check (gunakan bcrypt di production!)
      // Untuk MVP, kita bandingkan plain text
      if (user.password_hash !== password) {
        setError("Email atau password salah");
        setLoading(false);
        return;
        console.log("DB password:", user.password_hash);
console.log("Input password:", password);
console.log("Match?", user.password_hash === password);

if (user.password_hash !== password) {
  setError("Email atau password salah");
  setLoading(false);
  return;
}
      }

      // Check subscription
      if (user.plan === "premium" && user.subscription_end) {
        const expiry = new Date(user.subscription_end);
        if (expiry < new Date()) {
          setError("Subscription Anda sudah expired");
          setLoading(false);
          return;
        }
      }
// Insert ke user_profiles juga
try {
  await supabase.from("user_profiles").insert({
    user_id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: "user",
    plan: user.plan
  });
  console.log("✅ User profile created");
} catch (err) {
  console.log("User profile might already exist", err);
}
      // Login berhasil
      onLoginSuccess({
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        plan: user.plan,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError("Supabase belum dikonfigurasi");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${C.navyDark} 0%, #0f1723 100%)`,
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: "#fff",
          borderRadius: 16,
          padding: "40px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontFamily: "'DM Serif Display',serif",
            color: C.navyDark,
            marginBottom: 6,
            fontSize: 28,
          }}
        >
          EduEnglish
        </h2>
        <p style={{ textAlign: "center", color: "#888", fontSize: 13, marginBottom: 28 }}>
          Platform Persiapan LBE SNBT
        </p>

        {error && (
          <div
            style={{
              background: "#fce8e6",
              color: "#c1554d",
              padding: "12px 14px",
              borderRadius: 8,
              marginBottom: 18,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {method === "email" ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#333" }}>
                Email
              </label>
              <input
                type="email"
                placeholder="nama@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleEmailLogin()}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "DM Sans, sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#333" }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleEmailLogin()}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "DM Sans, sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              onClick={handleEmailLogin}
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                background: C.navyDark,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 12,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </>
        ) : (
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              background: "#fff",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 12,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Loading..." : "🔐 Login dengan Google"}
          </button>
        )}

        <button
          onClick={() => setMethod(method === "email" ? "google" : "email")}
          style={{
            width: "100%",
            padding: 12,
            background: "#f5f5f5",
            color: "#333",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          {method === "email" ? "🔑 Login dengan Google" : "📧 Login dengan Email"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "#666" }}>
          Belum punya akun?{" "}
          <button
            onClick={onGoToRegister}
            style={{
              border: "none",
              background: "none",
              color: C.sage,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Daftar Premium
          </button>
        </p>
      </div>
    </div>
  );
}

export function PremiumRequestPage({ onBackToLogin, supabase }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [planType, setPlanType] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const prices = { monthly: 29000, yearly: 290000 };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase belum dikonfigurasi");
      return;
    }
    if (!email || !fullName) {
      setError("Semua field harus diisi");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.from("premium_requests").insert({
        email,
        full_name: fullName,
        plan_type: planType,
        status: "pending",
      });

      if (err) throw err;

      // Buka WhatsApp pribadi dengan pesan otomatis
      const waMessage = encodeURIComponent(
        `Halo, saya ingin mendaftar Premium Tumbuh Academy.\n\nNama: ${fullName}\nEmail: ${email}\nPaket: ${planType === "monthly" ? "Bulanan - Rp 29.000" : "Tahunan - Rp 290.000"}\n\nMohon info rekening pembayarannya. Terima kasih!`
      );
      window.open(`https://wa.me/6285719064208?text=${waMessage}`, "_blank");

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${C.navyDark} 0%, #0f1723 100%)`,
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: 500,
            width: "100%",
            background: "#e6f4ea",
            borderRadius: 16,
            padding: "40px 32px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ color: "#2d6a4f", marginBottom: 12 }}>Pendaftaran Diterima!</h2>
          <p style={{ color: "#666", lineHeight: 1.6, marginBottom: 24 }}>
            Instruksi pembayaran akan dikirim ke email <strong>{email}</strong>.
          </p>
          <p style={{ color: "#888", fontSize: 13 }}>
            Setelah Anda transfer, admin akan segera approve dan kirim username + password.
          </p>
          <button
            onClick={onBackToLogin}
            style={{
              marginTop: 28,
              padding: "10px 20px",
              background: "#2d6a4f",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${C.navyDark} 0%, #0f1723 100%)`,
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: 450,
          width: "100%",
          background: "#fff",
          borderRadius: 16,
          padding: "40px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h2 style={{ fontFamily: "'DM Serif Display',serif", color: C.navyDark, marginBottom: 6 }}>
          Daftar Premium
        </h2>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
          Akses unlimited + riwayat skor + leaderboard
        </p>

        {error && (
          <div
            style={{
              background: "#fce8e6",
              color: "#c1554d",
              padding: "12px 14px",
              borderRadius: 8,
              marginBottom: 18,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#333" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#333" }}>
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#333" }}>
              Paket
            </label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            >
              <option value="monthly">Bulanan - Rp 29.000</option>
              <option value="yearly">Tahunan - Rp 290.000</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              background: C.sage,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 12,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Loading..." : "Lanjut ke Pembayaran"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: "#666" }}>
          <button
            onClick={onBackToLogin}
            style={{
              border: "none",
              background: "none",
              color: C.sage,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Kembali ke Login
          </button>
        </p>
      </div>
    </div>
  );
}