"use client";
// components/configuracion/WhatsAppConfig.tsx
// Tarjeta de configuración de notificaciones WhatsApp en el dashboard.
// Va dentro de la página de Configuración del comercio.

import { useState, useEffect } from "react";
import {
  MessageCircle, Phone, Bell, BellOff,
  CheckCircle2, AlertCircle, Loader2, Send, Info,
} from "lucide-react";

type Config = {
  telefono:        string | null;
  notificacionesWA: boolean;
};

export default function WhatsAppConfig() {
  const [config,    setConfig]    = useState<Config | null>(null);
  const [telefono,  setTelefono]  = useState("");
  const [waOn,      setWaOn]      = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [probando,  setProbando]  = useState(false);
  const [msg,       setMsg]       = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [msgTest,   setMsgTest]   = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    fetch("/api/configuracion/whatsapp")
      .then(r => r.json())
      .then(json => {
        if (json.ok) {
          setConfig(json.data);
          setTelefono(json.data.telefono ?? "");
          setWaOn(json.data.notificacionesWA);
        }
      })
      .catch(console.error);
  }, []);

  async function guardar() {
    setGuardando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/configuracion/whatsapp", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono:         telefono.trim() || null,
          notificacionesWA: waOn,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setConfig(json.data);
      setMsg({ tipo: "ok", texto: "Configuración guardada correctamente." });
    } catch (e: any) {
      setMsg({ tipo: "error", texto: e.message ?? "Error al guardar." });
    } finally {
      setGuardando(false);
    }
  }

  async function enviarPrueba() {
    setProbando(true);
    setMsgTest(null);
    try {
      const res = await fetch("/api/configuracion/whatsapp", {
        method: "POST",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setMsgTest({ tipo: "ok", texto: "¡Mensaje de prueba enviado! Revisá tu WhatsApp." });
    } catch (e: any) {
      setMsgTest({ tipo: "error", texto: e.message ?? "No se pudo enviar la prueba." });
    } finally {
      setProbando(false);
    }
  }

  const teléfonoGuardado = config?.telefono;
  const configurado = !!teléfonoGuardado && config?.notificacionesWA;

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.iconWrap}>
          <MessageCircle size={20} color="#25d366" />
        </div>
        <div>
          <h3 style={s.title}>Notificaciones por WhatsApp</h3>
          <p style={s.subtitle}>
            Recibí un mensaje cada vez que alguien reserve un turno desde tu página web.
          </p>
        </div>
        <div style={{
          ...s.badge,
          background: configurado ? "rgba(37,211,102,0.1)" : "rgba(113,113,122,0.1)",
          color:      configurado ? "#25d366" : "#71717a",
          border:     `1px solid ${configurado ? "rgba(37,211,102,0.2)" : "rgba(255,255,255,0.08)"}`,
        }}>
          {configurado ? "Activo" : "Inactivo"}
        </div>
      </div>

      {/* Info box */}
      <div style={s.infoBox}>
        <Info size={14} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={s.infoText}>
          Esta función usa la{" "}
          <strong style={{ color: "#93c5fd" }}>WhatsApp Business API de Meta</strong>.
          Necesitás configurar las variables{" "}
          <code style={s.code}>WHATSAPP_TOKEN</code> y{" "}
          <code style={s.code}>WHATSAPP_PHONE_NUMBER_ID</code> en tu entorno.{" "}
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#3b82f6" }}
          >
            Ver guía →
          </a>
        </p>
      </div>

      {/* Teléfono */}
      <div style={s.field}>
        <label style={s.label}>
          <Phone size={13} /> Teléfono del comercio (WhatsApp)
        </label>
        <div style={s.inputWrap}>
          <span style={s.prefix}>+54</span>
          <input
            style={s.input}
            placeholder="381 612 3456"
            value={telefono.replace(/^\+54/, "")}
            onChange={e => setTelefono(e.target.value)}
            type="tel"
          />
        </div>
        <p style={s.hint}>
          Ingresá el número sin el 0 ni el 15. Ejemplo: <code style={s.code}>3816123456</code>
        </p>
      </div>

      {/* Toggle notificaciones */}
      <div style={s.toggleRow}>
        <div>
          <p style={s.toggleLabel}>
            {waOn ? <Bell size={14} color="#25d366" /> : <BellOff size={14} color="#71717a" />}
            {" "} Notificaciones activas
          </p>
          <p style={s.toggleDesc}>
            {waOn
              ? "Te avisamos por WhatsApp con cada nueva reserva."
              : "Las notificaciones están pausadas."}
          </p>
        </div>
        <button
          onClick={() => setWaOn(v => !v)}
          style={{
            ...s.toggleBtn,
            background: waOn ? "#25d366" : "rgba(255,255,255,0.08)",
          }}
        >
          <div style={{
            ...s.toggleThumb,
            transform: waOn ? "translateX(20px)" : "translateX(2px)",
          }} />
        </button>
      </div>

      {/* Feedback guardar */}
      {msg && (
        <div style={{
          ...s.feedback,
          background: msg.tipo === "ok" ? "rgba(37,211,102,0.08)" : "rgba(239,68,68,0.08)",
          border:     `1px solid ${msg.tipo === "ok" ? "rgba(37,211,102,0.2)" : "rgba(239,68,68,0.2)"}`,
          color:      msg.tipo === "ok" ? "#4ade80" : "#f87171",
        }}>
          {msg.tipo === "ok"
            ? <CheckCircle2 size={14} />
            : <AlertCircle size={14} />}
          {msg.texto}
        </div>
      )}

      {/* Acciones */}
      <div style={s.actions}>
        <button onClick={guardar} disabled={guardando} style={s.btnPrimary}>
          {guardando
            ? <><Loader2 size={14} style={s.spin} /> Guardando...</>
            : <><CheckCircle2 size={14} /> Guardar</>}
        </button>

        {teléfonoGuardado && (
          <button onClick={enviarPrueba} disabled={probando} style={s.btnSecondary}>
            {probando
              ? <><Loader2 size={14} style={s.spin} /> Enviando...</>
              : <><Send size={14} /> Enviar prueba</>}
          </button>
        )}
      </div>

      {/* Feedback test */}
      {msgTest && (
        <div style={{
          ...s.feedback,
          background: msgTest.tipo === "ok" ? "rgba(37,211,102,0.08)" : "rgba(239,68,68,0.08)",
          border:     `1px solid ${msgTest.tipo === "ok" ? "rgba(37,211,102,0.2)" : "rgba(239,68,68,0.2)"}`,
          color:      msgTest.tipo === "ok" ? "#4ade80" : "#f87171",
        }}>
          {msgTest.tipo === "ok"
            ? <CheckCircle2 size={14} />
            : <AlertCircle size={14} />}
          {msgTest.texto}
        </div>
      )}

      {/* Preview del mensaje */}
      {teléfonoGuardado && (
        <details style={s.preview}>
          <summary style={s.previewSummary}>Ver ejemplo del mensaje que recibirás</summary>
          <pre style={s.previewMsg}>{`🗓 *Nueva reserva en Tu Comercio*

👤 *Cliente:* Juan García
📱 *Teléfono:* 3816-555444

✂️ *Servicio:* Corte de cabello
📅 *Fecha:* Lunes 15 de Mayo
⏰ *Hora:* 10:30 hs
⏱ *Duración:* 30 min
💰 *Precio:* $5.000

_Reservado desde DevHub Turnos_`}</pre>
        </details>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: "#111", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16, padding: "1.5rem",
    display: "flex", flexDirection: "column", gap: 16,
  },
  header: {
    display: "flex", alignItems: "flex-start", gap: 12,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  title:    { margin: 0, fontSize: 15, fontWeight: 700, color: "#f4f4f5" },
  subtitle: { margin: "2px 0 0", fontSize: 12, color: "#71717a" },
  badge: {
    marginLeft: "auto", flexShrink: 0, fontSize: 11, fontWeight: 700,
    padding: "4px 10px", borderRadius: 20,
  },
  infoBox: {
    display: "flex", gap: 8, padding: "10px 12px",
    background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
    borderRadius: 10,
  },
  infoText: { margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 },
  code: {
    fontFamily: "monospace", fontSize: 11,
    background: "rgba(255,255,255,0.07)", padding: "1px 5px",
    borderRadius: 4, color: "#e2e8f0",
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 12, color: "#71717a", fontWeight: 500,
    display: "flex", alignItems: "center", gap: 5,
  },
  inputWrap: { display: "flex", alignItems: "center" },
  prefix: {
    padding: "10px 10px", background: "#1a1a1a",
    border: "1px solid rgba(255,255,255,0.1)", borderRight: "none",
    borderRadius: "8px 0 0 8px", color: "#71717a", fontSize: 13,
  },
  input: {
    flex: 1, padding: "10px 12px",
    background: "#141414", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0 8px 8px 0", color: "#f4f4f5", fontSize: 14,
    fontFamily: "inherit",
  },
  hint: { margin: 0, fontSize: 11, color: "#52525b" },
  toggleRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    padding: "12px 14px", background: "#141414",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
  },
  toggleLabel: {
    margin: 0, fontSize: 13, fontWeight: 600, color: "#e4e4e7",
    display: "flex", alignItems: "center", gap: 5,
  },
  toggleDesc: { margin: "2px 0 0", fontSize: 11, color: "#71717a" },
  toggleBtn: {
    width: 44, height: 24, borderRadius: 12, border: "none",
    cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
  },
  toggleThumb: {
    position: "absolute", top: 2, width: 20, height: 20,
    background: "#fff", borderRadius: "50%", transition: "transform 0.2s",
  },
  feedback: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "9px 12px", borderRadius: 10, fontSize: 13,
  },
  actions: { display: "flex", gap: 10 },
  btnPrimary: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 18px", background: "#1e40af", border: "none",
    borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  btnSecondary: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 16px", background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    color: "#a1a1aa", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  preview: {
    background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10, padding: "10px 14px",
  },
  previewSummary: { fontSize: 12, color: "#52525b", cursor: "pointer" },
  previewMsg: {
    margin: "12px 0 0", fontSize: 12, color: "#a1a1aa",
    fontFamily: "monospace", lineHeight: 1.7, whiteSpace: "pre-wrap",
  },
  spin: { animation: "spin 1s linear infinite" },
};