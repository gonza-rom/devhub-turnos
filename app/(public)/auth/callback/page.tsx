"use client";
// app/(public)/auth/callback/page.tsx

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<"cargando" | "ya_confirmado">("cargando");

  useEffect(() => {
    async function handleCallback() {
      const error = searchParams.get("error");

      if (error) {
        setEstado("ya_confirmado");
        return;
      }

      const supabase = createClient();
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setEstado("ya_confirmado");
          return;
        }
        window.location.href = "/api/auth/refresh-session?redirect=/dashboard";
        return;
      }

      setEstado("ya_confirmado");
    }

    handleCallback();
  }, [router, searchParams]);

  if (estado === "cargando") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0a0a0a",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, margin: "0 auto 1rem",
            border: "3px solid rgba(30,64,175,0.25)",
            borderTopColor: "#3b82f6", borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }} />
          <p style={{ color: "#71717a", fontSize: "0.875rem", fontFamily: "sans-serif" }}>
            Confirmando tu cuenta...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0a0a0a",
      padding: "1.5rem", fontFamily: "sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, background: "#111111",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
        padding: "2.5rem 2rem", textAlign: "center",
        boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: "1.5rem" }}>
          <div style={{
            width: 36, height: 36, background: "rgba(30,64,175,0.15)",
            border: "1px solid rgba(30,64,175,0.35)", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>DevHub Turnos</span>
        </div>

        {/* Ícono check */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1.25rem",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>

        <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem" }}>
          ¡Cuenta activada!
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#71717a", margin: "0 0 1.75rem", lineHeight: 1.6 }}>
          Tu cuenta ya está lista. Ingresá con tu email y contraseña para empezar a usar DevHub Turnos.
        </p>

        <a href="/auth/login" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#1e40af", color: "#fff", textDecoration: "none",
          padding: "11px 24px", borderRadius: 10, fontSize: "0.9375rem",
          fontWeight: 600,
        }}>
          Iniciar sesión →
        </a>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  );
}