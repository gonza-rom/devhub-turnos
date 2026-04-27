"use client";
// app/(app)/onboarding/OnboardingClient.tsx

import { useState } from "react";
import {
  Scissors, Car, Sparkles, Stethoscope, HelpCircle,
  Plus, Trash2, Clock, DollarSign, ArrowRight, ArrowLeft,
  CalendarDays, CheckCircle2, ChevronRight,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────

type RubroTipo = "BARBERIA" | "DETAILING" | "ESTETICA" | "MEDICO" | "OTRO";

type Servicio = {
  nombre: string;
  descripcion: string;
  precio: string;
  duracionMin: string;
};

type Horario = {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const RUBROS = [
  { id: "BARBERIA",  label: "Barbería / Peluquería", icon: Scissors,    color: "#3b82f6" },
  { id: "DETAILING", label: "Detailing",             icon: Car,         color: "#8b5cf6" },
  { id: "ESTETICA",  label: "Estética",              icon: Sparkles,    color: "#ec4899" },
  { id: "MEDICO",    label: "Médico / Salud",        icon: Stethoscope, color: "#10b981" },
  { id: "OTRO",      label: "Otro rubro",            icon: HelpCircle,  color: "#71717a" },
] as const;

const SERVICIOS_SUGERIDOS: Record<RubroTipo, Servicio[]> = {
  BARBERIA: [
    { nombre: "Corte de cabello", descripcion: "", precio: "3000", duracionMin: "30" },
    { nombre: "Corte + Barba",    descripcion: "", precio: "5000", duracionMin: "45" },
    { nombre: "Afeitado clásico", descripcion: "", precio: "2500", duracionMin: "20" },
  ],
  DETAILING: [
    { nombre: "Limpieza básica",    descripcion: "Lavado exterior e interior", precio: "25000", duracionMin: "60"  },
    { nombre: "Detailing Pro",      descripcion: "Pulido + limpieza completa", precio: "55000", duracionMin: "120" },
    { nombre: "Detailing Premium",  descripcion: "Pulido, cerámica y ozono",   precio: "85000", duracionMin: "180" },
  ],
  ESTETICA: [
    { nombre: "Limpieza facial", descripcion: "", precio: "8000",  duracionMin: "60" },
    { nombre: "Masajes",         descripcion: "", precio: "10000", duracionMin: "60" },
    { nombre: "Manicura",        descripcion: "", precio: "4000",  duracionMin: "45" },
  ],
  MEDICO: [
    { nombre: "Consulta general",   descripcion: "", precio: "15000", duracionMin: "30" },
    { nombre: "Control de rutina",  descripcion: "", precio: "10000", duracionMin: "20" },
  ],
  OTRO: [
    { nombre: "Servicio 1", descripcion: "", precio: "", duracionMin: "60" },
  ],
};

const HORARIOS_DEFAULT: Horario[] = [
  { diaSemana: 0, horaInicio: "09:00", horaFin: "18:00", activo: false }, // Dom
  { diaSemana: 1, horaInicio: "09:00", horaFin: "18:00", activo: true  }, // Lun
  { diaSemana: 2, horaInicio: "09:00", horaFin: "18:00", activo: true  }, // Mar
  { diaSemana: 3, horaInicio: "09:00", horaFin: "18:00", activo: true  }, // Mié
  { diaSemana: 4, horaInicio: "09:00", horaFin: "18:00", activo: true  }, // Jue
  { diaSemana: 5, horaInicio: "09:00", horaFin: "18:00", activo: true  }, // Vie
  { diaSemana: 6, horaInicio: "09:00", horaFin: "14:00", activo: true  }, // Sáb
];

// ── Props ─────────────────────────────────────────────────────

type Props = {
  tenantId:    string;
  tenantNombre: string;
  rubroActual: RubroTipo | null;
};

// ── Componente principal ───────────────────────────────────────

export default function OnboardingClient({ tenantId, tenantNombre, rubroActual }: Props) {
  const [paso,      setPaso]      = useState(rubroActual ? 1 : 0); // 0=rubro 1=servicios 2=horarios 3=listo
  const [rubro,     setRubro]     = useState<RubroTipo | null>(rubroActual);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [horarios,  setHorarios]  = useState<Horario[]>(HORARIOS_DEFAULT);
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState("");

  // ── Paso 0: elegir rubro ──────────────────────────────────

  async function elegirRubro(r: RubroTipo) {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/rubro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubro: r }),
      });
      if (!res.ok) throw new Error();
      setRubro(r);
      setServicios(SERVICIOS_SUGERIDOS[r]);
      setPaso(1);
    } catch {
      setError("Error al guardar el rubro. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  // ── Paso 1: servicios ─────────────────────────────────────

  function agregarServicio() {
    setServicios(s => [...s, { nombre: "", descripcion: "", precio: "", duracionMin: "30" }]);
  }

  function actualizarServicio(i: number, campo: keyof Servicio, valor: string) {
    setServicios(s => s.map((sv, idx) => idx === i ? { ...sv, [campo]: valor } : sv));
  }

  function eliminarServicio(i: number) {
    setServicios(s => s.filter((_, idx) => idx !== i));
  }

  async function guardarServicios() {
    const validos = servicios.filter(s => s.nombre.trim() && s.duracionMin);
    if (validos.length === 0) { setError("Agregá al menos un servicio."); return; }
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicios: validos }),
      });
      if (!res.ok) throw new Error();
      setPaso(2);
    } catch {
      setError("Error al guardar los servicios. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  // ── Paso 2: horarios ──────────────────────────────────────

  function toggleDia(i: number) {
    setHorarios(h => h.map((d, idx) => idx === i ? { ...d, activo: !d.activo } : d));
  }

  function actualizarHorario(i: number, campo: "horaInicio" | "horaFin", valor: string) {
    setHorarios(h => h.map((d, idx) => idx === i ? { ...d, [campo]: valor } : d));
  }

  async function guardarHorarios() {
    const activos = horarios.filter(h => h.activo);
    if (activos.length === 0) { setError("Seleccioná al menos un día de atención."); return; }
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/horarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horarios }),
      });
      if (!res.ok) throw new Error();
      setPaso(3);
    } catch {
      setError("Error al guardar los horarios. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div style={styles.shell}>
      <div style={styles.glow} />

      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}>
              <CalendarDays size={20} color="#3b82f6" />
            </div>
            <span style={styles.logoText}>DevHub Turnos</span>
          </div>
          <p style={styles.bienvenida}>Configurá <strong style={{ color: "#f4f4f5" }}>{tenantNombre}</strong></p>
        </div>

        {/* Steps indicator */}
        {paso < 3 && (
          <div style={styles.steps}>
            {["Rubro", "Servicios", "Horarios"].map((label, i) => (
              <div key={i} style={styles.stepWrap}>
                <div style={{
                  ...styles.stepCircle,
                  background: i < paso ? "#1e40af" : i === paso ? "#1e40af" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${i <= paso ? "#1e40af" : "rgba(255,255,255,0.1)"}`,
                  opacity: i > paso ? 0.4 : 1,
                }}>
                  {i < paso
                    ? <CheckCircle2 size={14} color="#fff" />
                    : <span style={{ fontSize: 12, color: i === paso ? "#fff" : "#71717a", fontWeight: 600 }}>{i + 1}</span>
                  }
                </div>
                <span style={{ fontSize: 12, color: i === paso ? "#f4f4f5" : "#52525b", fontWeight: i === paso ? 600 : 400 }}>
                  {label}
                </span>
                {i < 2 && <ChevronRight size={14} color="#3f3f46" style={{ margin: "0 4px" }} />}
              </div>
            ))}
          </div>
        )}

        {/* Error global */}
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* ── PASO 0: Rubro ── */}
        {paso === 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>¿A qué se dedica tu negocio?</h2>
            <p style={styles.cardDesc}>Elegí el rubro para precargar los servicios más comunes</p>
            <div style={styles.rubrosGrid}>
              {RUBROS.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => elegirRubro(id as RubroTipo)}
                  disabled={cargando}
                  style={{
                    ...styles.rubroBtn,
                    opacity: cargando ? 0.5 : 1,
                    cursor: cargando ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = color;
                    (e.currentTarget as HTMLButtonElement).style.background = `${color}10`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.background = "#1a1a1a";
                  }}
                >
                  <div style={{ ...styles.rubroIconWrap, background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon size={22} color={color} />
                  </div>
                  <span style={styles.rubroLabel}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PASO 1: Servicios ── */}
        {paso === 1 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Tus servicios</h2>
            <p style={styles.cardDesc}>
              Precargamos los más comunes para tu rubro. Editá, eliminá o agregá los que necesites.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {servicios.map((sv, i) => (
                <div key={i} style={styles.servicioRow}>
                  <div style={styles.servicioFields}>
                    <input
                      style={styles.input}
                      placeholder="Nombre del servicio *"
                      value={sv.nombre}
                      onChange={e => actualizarServicio(i, "nombre", e.target.value)}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={styles.inputWrap}>
                        <DollarSign size={14} color="#52525b" style={styles.inputIcon} />
                        <input
                          style={{ ...styles.input, paddingLeft: 32 }}
                          placeholder="Precio"
                          type="number"
                          value={sv.precio}
                          onChange={e => actualizarServicio(i, "precio", e.target.value)}
                        />
                      </div>
                      <div style={styles.inputWrap}>
                        <Clock size={14} color="#52525b" style={styles.inputIcon} />
                        <input
                          style={{ ...styles.input, paddingLeft: 32 }}
                          placeholder="Duración (min) *"
                          type="number"
                          value={sv.duracionMin}
                          onChange={e => actualizarServicio(i, "duracionMin", e.target.value)}
                        />
                      </div>
                    </div>
                    <input
                      style={styles.input}
                      placeholder="Descripción (opcional)"
                      value={sv.descripcion}
                      onChange={e => actualizarServicio(i, "descripcion", e.target.value)}
                    />
                  </div>
                  <button onClick={() => eliminarServicio(i)} style={styles.deleteBtn} title="Eliminar">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={agregarServicio} style={styles.addBtn}>
              <Plus size={15} /> Agregar servicio
            </button>

            <div style={styles.navRow}>
              <button onClick={() => setPaso(0)} style={styles.btnBack}>
                <ArrowLeft size={15} /> Volver
              </button>
              <button onClick={guardarServicios} disabled={cargando} style={styles.btnNext}>
                {cargando ? "Guardando..." : <>Continuar <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Horarios ── */}
        {paso === 2 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Días y horarios de atención</h2>
            <p style={styles.cardDesc}>Configurá cuándo atiende tu negocio. Podés cambiarlo después.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {horarios.map((h, i) => (
                <div key={i} style={{
                  ...styles.horarioRow,
                  opacity: h.activo ? 1 : 0.45,
                }}>
                  <button
                    onClick={() => toggleDia(i)}
                    style={{
                      ...styles.diaToggle,
                      background: h.activo ? "#1e40af" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${h.activo ? "#1e40af" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {DIAS[h.diaSemana]}
                  </button>

                  <div style={styles.horasWrap}>
                    <input
                      type="time"
                      value={h.horaInicio}
                      disabled={!h.activo}
                      onChange={e => actualizarHorario(i, "horaInicio", e.target.value)}
                      style={styles.timeInput}
                    />
                    <span style={{ color: "#52525b", fontSize: 13 }}>→</span>
                    <input
                      type="time"
                      value={h.horaFin}
                      disabled={!h.activo}
                      onChange={e => actualizarHorario(i, "horaFin", e.target.value)}
                      style={styles.timeInput}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.navRow}>
              <button onClick={() => setPaso(1)} style={styles.btnBack}>
                <ArrowLeft size={15} /> Volver
              </button>
              <button onClick={guardarHorarios} disabled={cargando} style={styles.btnNext}>
                {cargando ? "Guardando..." : <>Finalizar <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Listo ── */}
        {paso === 3 && (
          <div style={{ ...styles.card, textAlign: "center", padding: "3rem 2rem" }}>
            <div style={styles.successIcon}>
              <CheckCircle2 size={36} color="#22c55e" />
            </div>
            <h2 style={{ ...styles.cardTitle, marginBottom: 8 }}>¡Todo listo!</h2>
            <p style={{ ...styles.cardDesc, marginBottom: 32 }}>
              Tu negocio está configurado y listo para recibir turnos.
            </p>
            <button
              onClick={() => window.location.href = "/dashboard"}
              style={{ ...styles.btnNext, margin: "0 auto", padding: "12px 32px" }}
            >
              Ir al panel <ArrowRight size={15} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    padding: "2rem 1rem", background: "#0a0a0a", position: "relative", overflowY: "auto",
  },
  glow: {
    position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)",
    width: 600, height: 400,
    background: "radial-gradient(ellipse at center, rgba(30,64,175,0.13) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  container: {
    position: "relative", zIndex: 1, width: "100%", maxWidth: 520,
    display: "flex", flexDirection: "column", gap: 20,
  },
  header: { display: "flex", flexDirection: "column", gap: 6 },
  logoWrap: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: {
    width: 36, height: 36, background: "rgba(30,64,175,0.15)",
    border: "1px solid rgba(30,64,175,0.35)", borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoText: {
    fontFamily: "'Syne', sans-serif", fontSize: "1rem",
    fontWeight: 700, color: "#fff",
  },
  bienvenida: { fontSize: 13, color: "#71717a", margin: 0 },
  steps: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "12px 16px", background: "#111",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12,
  },
  stepWrap: { display: "flex", alignItems: "center", gap: 6 },
  stepCircle: {
    width: 26, height: 26, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s",
  },
  card: {
    background: "#111", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, padding: "1.75rem",
    boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column", gap: 16,
  },
  cardTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: "1.25rem",
    fontWeight: 700, color: "#fff", margin: 0,
  },
  cardDesc: { fontSize: 13, color: "#71717a", margin: 0 },
  errorBox: {
    padding: "10px 14px", background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10,
    color: "#f87171", fontSize: 13,
  },
  rubrosGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
  },
  rubroBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    padding: "1.25rem 1rem", background: "#1a1a1a",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
    transition: "all 0.15s", width: "100%",
  },
  rubroIconWrap: {
    width: 48, height: 48, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  rubroLabel: { fontSize: 13, fontWeight: 600, color: "#f4f4f5", textAlign: "center" as const },
  servicioRow: {
    display: "flex", gap: 8, alignItems: "flex-start",
    padding: 12, background: "#1a1a1a",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12,
  },
  servicioFields: { flex: 1, display: "flex", flexDirection: "column", gap: 8 },
  input: {
    width: "100%", padding: "9px 12px", background: "#141414",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
    color: "#f4f4f5", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    outline: "none",
  },
  inputWrap: { position: "relative" as const },
  inputIcon: { position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)" },
  deleteBtn: {
    padding: 8, background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8,
    color: "#f87171", cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 14px", background: "rgba(30,64,175,0.1)",
    border: "1px solid rgba(30,64,175,0.25)", borderRadius: 10,
    color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer",
    width: "fit-content",
  },
  horarioRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 12px", background: "#1a1a1a",
    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
    transition: "opacity 0.2s",
  },
  diaToggle: {
    minWidth: 44, padding: "6px 10px", borderRadius: 8,
    color: "#fff", fontSize: 12, fontWeight: 700,
    cursor: "pointer", transition: "all 0.15s",
  },
  horasWrap: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  timeInput: {
    padding: "7px 10px", background: "#141414",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
    color: "#f4f4f5", fontSize: 13,
    colorScheme: "dark" as const, flex: 1,
  },
  navRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  btnBack: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 16px", background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    color: "#71717a", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  btnNext: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "9px 20px", background: "#1e40af",
    border: "none", borderRadius: 10,
    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  successIcon: {
    width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px",
    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
};