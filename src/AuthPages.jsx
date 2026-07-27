// AuthPages.jsx - Login page (Google OAuth via Supabase Auth)

import { useState } from "react";

const C = {
  navyDark: "#1a2744",
  sage: "#5d8a6e",
  sageLight: "#7ea88a",
  cream: "#f9f7f2",
};

export function LoginPage({ onLoginSuccess, supabase }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Loading..." : "🔐 Login dengan Google"}
        </button>
      </div>
    </div>
  );
}
