"use client";
// app/(app)/configuracion/page.tsx

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays, MapPin, Phone, Mail, Save, Upload,
  CheckCircle, AlertCircle, Globe, Instagram, Facebook,
  ExternalLink, Link2, Building2, Scissors, Car, Sparkles,
  Stethoscope, HelpCircle, Palette, Moon, Sun,
} from "lucide-react";
import Image from "next/image";

// ── Tipos ─────────────────────────────────────────────────────

type Negocio = {
  id:          string;
  slug:        string;
  nombre:      string;
  logoUrl:     string | null;
  telefono:    string | null;
  email:       string | null;
  descripcion: string | null;
  direccion:   string | null;
  ciudad:      string | null;
  provincia:   string | null;
  sitioWeb:    string | null;
  instagram:   string | null;
  facebook:     string | null;
  rubro:        string | null;
  colorReserva: string | null;
  temaReserva:  string | null;
  plan:         string;
};

type Toast = { tipo: "ok" | "error"; mensaje: string } | null;

const RUBRO_LABELS: Record<string, string> = {
  BARBERIA:  "Barbería / Peluquería",
  DETAILING: "Detailing",
  ESTETICA:  "Estética",
  MEDICO:    "Médico / Salud",
  OTRO:      "Otro",
};

// Mismo mapeo que app/reservar/[slug]/ReservarClient.tsx — mantener en sync
const RUBRO_ICON: Record<string, React.ElementType> = {
  BARBERIA:  Scissors,
  DETAILING: Car,
  ESTETICA:  Sparkles,
  MEDICO:    Stethoscope,
  OTRO:      HelpCircle,
};

const RUBRO_COLOR_DEFAULT: Record<string, string> = {
  BARBERIA:  "#3b82f6",
  DETAILING: "#8b5cf6",
  ESTETICA:  "#ec4899",
  MEDICO:    "#10b981",
  OTRO:      "#71717a",
};

const COLOR_PRESETS = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#71717a"];

// ── Toast ─────────────────────────────────────────────────────

function ToastMsg({ toast }: { toast: Toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 50,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 20px", borderRadius: 14,
      background: toast.tipo === "ok" ? "#16a34a" : "#dc2626",
      color: "#fff", fontSize: 14, fontWeight: 600,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>
      {toast.tipo === "ok"
        ? <CheckCircle size={16} />
        : <AlertCircle size={16} />}
      {toast.mensaje}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function ConfiguracionPage() {
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [form,         setForm]         = useState<Partial<Negocio>>({});
  const [loading,      setLoading]      = useState(true);
  const [guardando,    setGuardando]    = useState(false);
  const [toast,        setToast]        = useState<Toast>(null);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [copiado,      setCopiado]      = useState(false);

  useEffect(() => { fetchNegocio(); }, []);

  async function fetchNegocio() {
    try {
      const res  = await fetch("/api/configuracion");
      const data = await res.json();
      const n    = data.data ?? data;
      setForm(n);
      if (n.logoUrl) setLogoPreview(n.logoUrl);
    } catch {
      mostrarToast("error", "Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  function mostrarToast(tipo: "ok" | "error", mensaje: string) {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleGuardar() {
    if (!form.nombre?.trim()) { mostrarToast("error", "El nombre del negocio es obligatorio"); return; }
    setGuardando(true);
    try {
      const res  = await fetch("/api/configuracion", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      mostrarToast("ok", "Configuración guardada");
      router.refresh();
      window.dispatchEvent(new CustomEvent("tenant-config-updated", {
        detail: { nombre: form.nombre, logoUrl: form.logoUrl },
      }));
    } catch (err: any) {
      mostrarToast("error", err.message ?? "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      mostrarToast("error", "Formato no permitido. Usá JPG, PNG o WebP"); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      mostrarToast("error", "El logo no puede superar los 2 MB"); return;
    }
    setSubiendoLogo(true);
    try {
      const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);
      fd.append("folder", "devhub-turnos/logos");
      const cloudRes  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData.error?.message ?? "Error al subir");
      const url = cloudData.secure_url as string;
      await fetch("/api/configuracion/logo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url }),
      });
      setLogoPreview(url);
      setForm(prev => ({ ...prev, logoUrl: url }));
      mostrarToast("ok", "Logo actualizado");
      router.refresh();
      window.dispatchEvent(new CustomEvent("tenant-logo-updated", { detail: { url } }));
    } catch (err: any) {
      mostrarToast("error", err.message ?? "Error al subir logo");
    } finally {
      setSubiendoLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function copiarLink() {
    const url = `${window.location.origin}/reservar/${form.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const set = (key: keyof Negocio) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Mi negocio
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {form.rubro ? RUBRO_LABELS[form.rubro] : ""} · Plan {form.plan}
          </p>
        </div>
        <button onClick={handleGuardar} disabled={guardando}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: guardando ? "not-allowed" : "pointer", background: "#1e40af", border: "none", color: "#fff", opacity: guardando ? 0.7 : 1 }}>
          <Save size={15} /> {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* Link de reservas */}
      {form.slug && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ExternalLink size={14} color="#3b82f6" />
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Link de reservas</p>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
            Compartí este link con tus clientes para que reserven turnos online.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-md)", borderRadius: 10 }}>
            <span style={{ fontSize: 12, flex: 1, color: "var(--text-secondary)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {typeof window !== "undefined" ? window.location.origin : ""}/reservar/{form.slug}
            </span>
            <button onClick={copiarLink}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, background: copiado ? "rgba(34,197,94,0.12)" : "rgba(30,64,175,0.1)", border: `1px solid ${copiado ? "rgba(34,197,94,0.3)" : "rgba(30,64,175,0.25)"}`, color: copiado ? "#22c55e" : "#60a5fa" }}>
              {copiado ? <><CheckCircle size={12} /> Copiado</> : <><Link2 size={12} /> Copiar</>}
            </button>
          </div>
        </div>
      )}

      {/* Personalización de la página de reservas */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Palette size={14} color="var(--text-faint)" />
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Estilo de la página de reservas</p>
        </div>

        {/* Color de acento */}
        <div>
          <label style={labelStyle}>Color</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, colorReserva: c }))}
                title={c}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: c,
                  border: (form.colorReserva ?? RUBRO_COLOR_DEFAULT[form.rubro ?? "OTRO"]) === c
                    ? "2px solid var(--text-primary)" : "2px solid transparent",
                  boxShadow: "0 0 0 1px var(--border-base)",
                  cursor: "pointer", padding: 0,
                }}
              />
            ))}

            {/* Custom color picker */}
            <label style={{
              width: 28, height: 28, borderRadius: "50%", cursor: "pointer",
              overflow: "hidden", position: "relative",
              border: "2px solid var(--border-md)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--bg-input)",
            }} title="Color personalizado">
              <input
                type="color"
                value={form.colorReserva ?? RUBRO_COLOR_DEFAULT[form.rubro ?? "OTRO"] ?? "#3b82f6"}
                onChange={(e) => setForm(prev => ({ ...prev, colorReserva: e.target.value }))}
                style={{ position: "absolute", inset: -4, border: "none", padding: 0, cursor: "pointer" }}
              />
            </label>

            {form.colorReserva && (
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, colorReserva: null }))}
                style={{ fontSize: 11.5, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Usar color del rubro
              </button>
            )}
          </div>
        </div>

        {/* Fondo claro / oscuro */}
        <div>
          <label style={labelStyle}>Fondo</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, temaReserva: "OSCURO" }))}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                background: (form.temaReserva ?? "OSCURO") === "OSCURO" ? "rgba(30,64,175,0.14)" : "var(--bg-input)",
                border: `1px solid ${(form.temaReserva ?? "OSCURO") === "OSCURO" ? "rgba(30,64,175,0.45)" : "var(--border-md)"}`,
                color: (form.temaReserva ?? "OSCURO") === "OSCURO" ? "#60a5fa" : "var(--text-secondary)",
              }}
            >
              <Moon size={14} /> Oscuro
            </button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, temaReserva: "CLARO" }))}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                background: form.temaReserva === "CLARO" ? "rgba(30,64,175,0.14)" : "var(--bg-input)",
                border: `1px solid ${form.temaReserva === "CLARO" ? "rgba(30,64,175,0.45)" : "var(--border-md)"}`,
                color: form.temaReserva === "CLARO" ? "#60a5fa" : "var(--text-secondary)",
              }}
            >
              <Sun size={14} /> Blanco
            </button>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Building2 size={14} color="var(--text-faint)" />
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Logo del negocio</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", width: 88, height: 88, borderRadius: 16, border: "2px dashed var(--border-base)", background: "var(--bg-input)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {logoPreview
              ? <Image src={logoPreview} alt="Logo" fill style={{ objectFit: "contain", padding: 4 }} />
              : <CalendarDays size={32} color="var(--text-faint)" />
            }
            {subiendoLogo && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="spinner" style={{ width: 24, height: 24 }} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>PNG, JPG o WebP · Máx. 2 MB · Recomendado 400×400px</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} disabled={subiendoLogo}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "var(--bg-hover-md)", border: "1px solid var(--border-md)", color: "var(--text-secondary)" }}>
              <Upload size={13} /> {subiendoLogo ? "Subiendo..." : "Cambiar logo"}
            </button>
            {logoPreview && (
              <button onClick={async () => {
                setLogoPreview(null);
                setForm(p => ({ ...p, logoUrl: null }));
                await fetch("/api/configuracion", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, logoUrl: null }) });
                router.refresh();
              }} style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                Quitar logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Datos del negocio */}
      <Section titulo="Datos del negocio" icon={
        (() => {
          const IconoRubro = RUBRO_ICON[form.rubro ?? "OTRO"] ?? HelpCircle;
          return <IconoRubro size={14} color="var(--text-faint)" />;
        })()
      }>
        <div>
          <label style={labelStyle}>Nombre del negocio *</label>
          <input type="text" value={form.nombre ?? ""} onChange={set("nombre")} placeholder="Ej: Barbería Sol" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Rubro</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(RUBRO_LABELS) as Array<keyof typeof RUBRO_LABELS>).map((r) => {
              const Icono = RUBRO_ICON[r];
              const activo = form.rubro === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, rubro: r }))}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                    background: activo ? "rgba(30,64,175,0.14)" : "var(--bg-input)",
                    border: `1px solid ${activo ? "rgba(30,64,175,0.45)" : "var(--border-md)"}`,
                    color: activo ? "#60a5fa" : "var(--text-secondary)",
                  }}
                >
                  <Icono size={14} />
                  {RUBRO_LABELS[r]}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Descripción</label>
          <textarea value={form.descripcion ?? ""} onChange={set("descripcion")}
            placeholder="Breve descripción de tu negocio..." rows={2}
            style={{ ...inputStyle, resize: "vertical" as const }} />
        </div>
      </Section>

      {/* Contacto */}
      <Section titulo="Contacto" icon={<Phone size={14} color="var(--text-faint)" />}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}><Phone size={11} style={{ display: "inline", marginRight: 4 }} />Teléfono / WhatsApp</label>
            <input type="tel" value={form.telefono ?? ""} onChange={set("telefono")} placeholder="+54 9 383 123-4567" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}><Mail size={11} style={{ display: "inline", marginRight: 4 }} />Email de contacto</label>
            <input type="email" value={form.email ?? ""} onChange={set("email")} placeholder="negocio@email.com" style={inputStyle} />
          </div>
        </div>
      </Section>

      {/* Ubicación */}
      <Section titulo="Ubicación" icon={<MapPin size={14} color="var(--text-faint)" />}>
        <div>
          <label style={labelStyle}>Dirección</label>
          <input type="text" value={form.direccion ?? ""} onChange={set("direccion")} placeholder="Av. San Martín 1234" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Ciudad</label>
            <input type="text" value={form.ciudad ?? ""} onChange={set("ciudad")} placeholder="San Fernando del Valle" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Provincia</label>
            <input type="text" value={form.provincia ?? ""} onChange={set("provincia")} placeholder="Catamarca" style={inputStyle} />
          </div>
        </div>
      </Section>

      {/* Redes y web */}
      <Section titulo="Web y redes sociales" icon={<Globe size={14} color="var(--text-faint)" />}>
        <div>
          <label style={labelStyle}><Globe size={11} style={{ display: "inline", marginRight: 4 }} />Sitio web</label>
          <input type="url" value={form.sitioWeb ?? ""} onChange={set("sitioWeb")} placeholder="https://minegocio.com" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}><Instagram size={11} style={{ display: "inline", marginRight: 4 }} />Instagram</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontSize: 13 }}>@</span>
              <input type="text" value={form.instagram ?? ""} onChange={set("instagram")} placeholder="minegocio" style={{ ...inputStyle, paddingLeft: 28 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}><Facebook size={11} style={{ display: "inline", marginRight: 4 }} />Facebook</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontSize: 13 }}>@</span>
              <input type="text" value={form.facebook ?? ""} onChange={set("facebook")} placeholder="minegocio" style={{ ...inputStyle, paddingLeft: 28 }} />
            </div>
          </div>
        </div>
      </Section>

      {/* Botón guardar bottom */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 16 }}>
        <button onClick={handleGuardar} disabled={guardando}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: guardando ? "not-allowed" : "pointer", background: "#1e40af", border: "none", color: "#fff", opacity: guardando ? 0.7 : 1 }}>
          <Save size={15} /> {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <ToastMsg toast={toast} />
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────

function Section({ titulo, icon, children }: { titulo: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4, borderBottom: "1px solid var(--border-subtle)" }}>
        {icon}
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{titulo}</p>
      </div>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "var(--text-muted)", textTransform: "uppercase",
  letterSpacing: "0.05em", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  background: "var(--bg-input)", border: "1px solid var(--border-md)",
  borderRadius: 8, color: "var(--text-primary)", fontSize: 13,
};