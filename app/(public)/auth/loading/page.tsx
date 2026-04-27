"use client";
// app/(public)/auth/loading/page.tsx

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoadingHandler() {
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirect") ?? "/dashboard";

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = `/api/auth/refresh-session?redirect=${encodeURIComponent(redirectTo)}`;
    }, 300);
    return () => clearTimeout(timer);
  }, [redirectTo]);

  return null;
}

export default function AuthLoadingPage() {
  return (
    <Suspense fallback={null}>
      <LoadingHandler />
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0a0a0a", gap: "1.5rem", fontFamily: "sans-serif",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: "rgba(30,64,175,0.15)",
            border: "1px solid rgba(30,64,175,0.35)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
            DevHub Turnos
          </span>
        </div>

        {/* Spinner */}
        <div style={{
          width: 36, height: 36,
          border: "3px solid rgba(30,64,175,0.2)",
          borderTopColor: "#1e40af",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />

        <p style={{ fontSize: "0.8125rem", color: "#52525b", margin: 0 }}>
          Cargando tu cuenta...
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Suspense>
  );
}