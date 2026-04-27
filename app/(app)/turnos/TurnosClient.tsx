"use client";
// app/(app)/turnos/TurnosClient.tsx

import { useState, useMemo } from "react";
import {
  CalendarDays, List, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, Clock, Phone,
  User, Pencil, Check, X, MessageSquare, Calendar, Plus,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────

export type Turno = {
  id:                string;
  clienteNombre:     string;
  clienteTelefono:   string;
  clienteEmail:      string | null;
  fechaHora:         string;
  duracionMin:       number;
  estado:            string;
  servicioId:        string;
  servicio:          string;
  precio:            number | null;
  notasCliente:      string | null;
  notasAdmin:        string | null;
  canceladoAt:       string | null;
  motivoCancelacion: string | null;
};

type Servicio = {
  id:          string;
  nombre:      string;
  duracionMin: number;
  precio:      number | null;
};

type Props = {
  turnosIniciales: Turno[];
  servicios:       Servicio[];
};

// ── Helpers ───────────────────────────────────────────────────

const ESTADOS = ["PENDIENTE", "CONFIRMADO", "COMPLETADO", "CANCELADO", "AUSENTE"] as const;

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDIENTE:  { label: "Pendiente",  color: "#fbbf24", bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.3)"   },
  CONFIRMADO: { label: "Confirmado", color: "#22c55e", bg: "rgba(34,197,94,0.1)",    border: "rgba(34,197,94,0.3)"    },
  COMPLETADO: { label: "Completado", color: "#60a5fa", bg: "rgba(30,64,175,0.1)",    border: "rgba(30,64,175,0.3)"    },
  CANCELADO:  { label: "Cancelado",  color: "#f87171", bg: "rgba(220,38,38,0.08)",   border: "rgba(220,38,38,0.25)"   },
  AUSENTE:    { label: "Ausente",    color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.25)" },
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ── Componente principal ───────────────────────────────────────

export default function TurnosClient({ turnosIniciales, servicios }: Props) {
  const [turnos,        setTurnos]        = useState<Turno[]>(turnosIniciales);
  const [vista,         setVista]         = useState<"lista" | "calendario">("lista");
  const [filtroEstado,  setFiltroEstado]  = useState("TODOS");
  const [filtroFecha,   setFiltroFecha]   = useState("");
  const [mesCalendario, setMesCalendario] = useState(() => {
    const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1);
  });
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);
  const [modal,    setModal]    = useState<"detalle" | "editar" | "cancelar" | "nuevo" | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState("");

  // Estado edición
  const [editFecha,    setEditFecha]    = useState("");
  const [editHora,     setEditHora]     = useState("");
  const [editServicio, setEditServicio] = useState("");
  const [editNotas,    setEditNotas]    = useState("");
  const [motivoCancel, setMotivoCancel] = useState("");

  // Estado nuevo turno
  const [nuevoNombre,   setNuevoNombre]   = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoEmail,    setNuevoEmail]    = useState("");
  const [nuevoServicio, setNuevoServicio] = useState(servicios[0]?.id ?? "");
  const [nuevoFecha,    setNuevoFecha]    = useState(() => new Date().toISOString().split("T")[0]);
  const [nuevoHora,     setNuevoHora]     = useState("10:00");
  const [nuevoNotas,    setNuevoNotas]    = useState("");

  // ── Filtros ──────────────────────────────────────────────────

  const turnosFiltrados = useMemo(() => {
    return turnos.filter(t => {
      if (filtroEstado !== "TODOS" && t.estado !== filtroEstado) return false;
      if (filtroFecha) {
        const fecha = new Date(t.fechaHora);
        const [y, m, d] = filtroFecha.split("-").map(Number);
        if (fecha.getFullYear() !== y || fecha.getMonth() + 1 !== m || fecha.getDate() !== d) return false;
      }
      return true;
    });
  }, [turnos, filtroEstado, filtroFecha]);

  // ── Acciones ─────────────────────────────────────────────────

  async function cambiarEstado(id: string, estado: string, motivo?: string) {
    setCargando(true); setError("");
    try {
      const res = await fetch(`/api/turnos/${id}/estado`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ estado, motivoCancelacion: motivo }),
      });
      if (!res.ok) throw new Error();
      setTurnos(ts => ts.map(t => t.id === id
        ? { ...t, estado, canceladoAt: estado === "CANCELADO" ? new Date().toISOString() : t.canceladoAt, motivoCancelacion: motivo ?? t.motivoCancelacion }
        : t
      ));
      setModal(null);
      setTurnoSeleccionado(null);
    } catch {
      setError("Error al actualizar el turno.");
    } finally {
      setCargando(false);
    }
  }

  async function editarTurno() {
    if (!turnoSeleccionado) return;
    setCargando(true); setError("");
    try {
      const fechaHora = new Date(`${editFecha}T${editHora}`).toISOString();
      const servicio  = servicios.find(s => s.id === editServicio);
      const res = await fetch(`/api/turnos/${turnoSeleccionado.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fechaHora, servicioId: editServicio, duracionMin: servicio?.duracionMin, notasAdmin: editNotas }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTurnos(ts => ts.map(t => t.id === turnoSeleccionado.id ? { ...t, ...data.turno } : t));
      setModal(null);
    } catch {
      setError("Error al editar el turno.");
    } finally {
      setCargando(false);
    }
  }

  async function crearTurno() {
    if (!nuevoNombre.trim() || !nuevoTelefono.trim() || !nuevoServicio || !nuevoFecha || !nuevoHora) {
      setError("Completá los campos obligatorios."); return;
    }
    setCargando(true); setError("");
    try {
      const fechaHora = new Date(`${nuevoFecha}T${nuevoHora}`).toISOString();
      const res = await fetch("/api/turnos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          clienteNombre:   nuevoNombre.trim(),
          clienteTelefono: nuevoTelefono.trim(),
          clienteEmail:    nuevoEmail.trim() || null,
          servicioId:      nuevoServicio,
          fechaHora,
          notasAdmin:      nuevoNotas.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTurnos(ts => [...ts, data.turno].sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()));
      // Reset form
      setNuevoNombre(""); setNuevoTelefono(""); setNuevoEmail("");
      setNuevoNotas(""); setNuevoServicio(servicios[0]?.id ?? "");
      setNuevoFecha(new Date().toISOString().split("T")[0]); setNuevoHora("10:00");
      setModal(null);
    } catch {
      setError("Error al crear el turno.");
    } finally {
      setCargando(false);
    }
  }

  function abrirEditar(t: Turno) {
    const d = new Date(t.fechaHora);
    setEditFecha(d.toISOString().split("T")[0]);
    setEditHora(d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    setEditServicio(t.servicioId);
    setEditNotas(t.notasAdmin ?? "");
    setTurnoSeleccionado(t);
    setModal("editar");
  }

  function abrirDetalle(t: Turno) {
    setTurnoSeleccionado(t);
    setModal("detalle");
  }

  // ── Calendario ───────────────────────────────────────────────

  const diasDelMes = useMemo(() => {
    const dias: Date[] = [];
    const inicio = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), 1);
    const fin    = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 0);
    for (let i = 0; i < inicio.getDay(); i++) dias.push(new Date(inicio.getFullYear(), inicio.getMonth(), -i));
    dias.reverse();
    for (let d = 1; d <= fin.getDate(); d++) dias.push(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), d));
    return dias;
  }, [mesCalendario]);

  const turnosPorDia = useMemo(() => {
    const map = new Map<string, Turno[]>();
    turnos.forEach(t => {
      const key = new Date(t.fechaHora).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [turnos]);

  const hoy = new Date();

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Turnos
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {turnos.length} turnos en total
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Botón nuevo turno */}
          <button
            onClick={() => { setError(""); setModal("nuevo"); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: "pointer", background: "#1e40af", border: "none", color: "#fff",
            }}
          >
            <Plus size={15} /> Nuevo turno
          </button>

          {/* Selector de vista */}
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 10 }}>
            {([["lista", List, "Lista"], ["calendario", CalendarDays, "Calendario"]] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => setVista(v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", border: "none", transition: "all 0.15s",
                  background: vista === v ? "#1e40af" : "transparent",
                  color: vista === v ? "#fff" : "var(--text-muted)",
                }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {["TODOS", ...ESTADOS].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
              background: filtroEstado === e ? "#1e40af" : "var(--bg-card)",
              color: filtroEstado === e ? "#fff" : "var(--text-muted)",
              border: filtroEstado === e ? "1px solid #1e40af" : "1px solid var(--border-md)",
            } as React.CSSProperties}>
            {e === "TODOS" ? "Todos" : ESTADO_CONFIG[e]?.label}
            {e !== "TODOS" && (
              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.8 }}>
                {turnos.filter(t => t.estado === e).length}
              </span>
            )}
          </button>
        ))}
        <input
          type="date"
          value={filtroFecha}
          onChange={e => setFiltroFecha(e.target.value)}
          style={{
            padding: "5px 10px", borderRadius: 8, fontSize: 12,
            background: "var(--bg-card)", border: "1px solid var(--border-md)",
            color: "var(--text-primary)", colorScheme: "dark", marginLeft: "auto",
          }}
        />
        {filtroFecha && (
          <button onClick={() => setFiltroFecha("")}
            style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: "transparent", border: "1px solid var(--border-md)", color: "var(--text-muted)" }}>
            Limpiar
          </button>
        )}
      </div>

      {/* ── VISTA LISTA ── */}
      {vista === "lista" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, overflow: "hidden" }}>
          {turnosFiltrados.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <CalendarDays size={32} color="var(--text-faint)" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px" }}>
                {turnos.length === 0 ? "Todavía no hay turnos" : "No hay turnos con estos filtros"}
              </p>
              {turnos.length === 0 && (
                <button onClick={() => setModal("nuevo")}
                  style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#1e40af", border: "none", color: "#fff" }}>
                  Crear el primer turno
                </button>
              )}
            </div>
          ) : (
            turnosFiltrados.map((t, i) => {
              const est = ESTADO_CONFIG[t.estado];
              return (
                <div key={t.id}
                  onClick={() => abrirDetalle(t)}
                  style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
                    borderBottom: i < turnosFiltrados.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <div style={{ minWidth: 64, textAlign: "center", flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{formatHora(t.fechaHora)}</p>
                    <p style={{ fontSize: 10, color: "var(--text-faint)", margin: "2px 0 0" }}>{formatFecha(t.fechaHora)}</p>
                  </div>
                  <div style={{ width: 2, height: 36, borderRadius: 99, background: est?.color ?? "#71717a", opacity: 0.5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.clienteNombre}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                      {t.servicio} · {t.duracionMin}min{t.precio ? ` · $${t.precio.toLocaleString("es-AR")}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {t.estado === "PENDIENTE" && (
                      <button onClick={() => cambiarEstado(t.id, "CONFIRMADO")} title="Confirmar"
                        style={{ padding: "5px 8px", borderRadius: 8, cursor: "pointer", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", display: "flex", alignItems: "center" }}>
                        <Check size={13} />
                      </button>
                    )}
                    {(t.estado === "PENDIENTE" || t.estado === "CONFIRMADO") && (
                      <button onClick={() => cambiarEstado(t.id, "COMPLETADO")} title="Completar"
                        style={{ padding: "5px 8px", borderRadius: 8, cursor: "pointer", background: "rgba(30,64,175,0.1)", border: "1px solid rgba(30,64,175,0.25)", color: "#60a5fa", display: "flex", alignItems: "center" }}>
                        <CheckCircle2 size={13} />
                      </button>
                    )}
                    <button onClick={() => abrirEditar(t)} title="Editar"
                      style={{ padding: "5px 8px", borderRadius: 8, cursor: "pointer", background: "var(--bg-hover-md)", border: "1px solid var(--border-md)", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                      <Pencil size={13} />
                    </button>
                    {t.estado !== "CANCELADO" && (
                      <button onClick={() => { setTurnoSeleccionado(t); setMotivoCancel(""); setModal("cancelar"); }} title="Cancelar"
                        style={{ padding: "5px 8px", borderRadius: 8, cursor: "pointer", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171", display: "flex", alignItems: "center" }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div style={{ padding: "3px 10px", borderRadius: 8, background: est?.bg, border: `1px solid ${est?.border}`, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: est?.color }}>{est?.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── VISTA CALENDARIO ── */}
      {vista === "calendario" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <button onClick={() => setMesCalendario(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              style={{ padding: 6, borderRadius: 8, cursor: "pointer", background: "transparent", border: "1px solid var(--border-md)", color: "var(--text-secondary)", display: "flex" }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              {MESES[mesCalendario.getMonth()]} {mesCalendario.getFullYear()}
            </span>
            <button onClick={() => setMesCalendario(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              style={{ padding: 6, borderRadius: 8, cursor: "pointer", background: "transparent", border: "1px solid var(--border-md)", color: "var(--text-secondary)", display: "flex" }}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border-subtle)" }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-faint)" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {diasDelMes.map((dia, i) => {
              const esMes     = dia.getMonth() === mesCalendario.getMonth();
              const esHoy     = isSameDay(dia, hoy);
              const turnosDia = turnosPorDia.get(dia.toDateString()) ?? [];
              return (
                <div key={i}
                  onClick={() => { if (esMes && turnosDia.length > 0) { setFiltroFecha(dia.toISOString().split("T")[0]); setVista("lista"); }}}
                  style={{
                    minHeight: 80, padding: "6px 8px",
                    borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--border-subtle)" : "none",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: esHoy ? "rgba(30,64,175,0.06)" : "transparent",
                    cursor: esMes && turnosDia.length > 0 ? "pointer" : "default",
                    opacity: esMes ? 1 : 0.3, transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (esMes && turnosDia.length > 0) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = esHoy ? "rgba(30,64,175,0.06)" : "transparent"}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 24, height: 24, borderRadius: "50%", fontSize: 12, fontWeight: esHoy ? 700 : 400,
                    background: esHoy ? "#1e40af" : "transparent",
                    color: esHoy ? "#fff" : "var(--text-primary)",
                  }}>{dia.getDate()}</span>
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                    {turnosDia.slice(0, 3).map(t => {
                      const est = ESTADO_CONFIG[t.estado];
                      return (
                        <div key={t.id} style={{
                          fontSize: 9, padding: "1px 4px", borderRadius: 4,
                          background: est?.bg, color: est?.color,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {formatHora(t.fechaHora)} {t.clienteNombre.split(" ")[0]}
                        </div>
                      );
                    })}
                    {turnosDia.length > 3 && <span style={{ fontSize: 9, color: "var(--text-faint)" }}>+{turnosDia.length - 3} más</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL NUEVO TURNO ── */}
      {modal === "nuevo" && (
        <Modal onClose={() => { setModal(null); setError(""); }} titulo="Nuevo turno">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre del cliente *</label>
                <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                  placeholder="Juan García" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono *</label>
                <input value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)}
                  placeholder="11 1234 5678" type="tel" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email (opcional)</label>
              <input value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)}
                placeholder="cliente@email.com" type="email" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Servicio *</label>
              <select value={nuevoServicio} onChange={e => setNuevoServicio(e.target.value)} style={inputStyle}>
                {servicios.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {s.duracionMin}min{s.precio ? ` · $${s.precio.toLocaleString("es-AR")}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input type="date" value={nuevoFecha} onChange={e => setNuevoFecha(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hora *</label>
                <input type="time" value={nuevoHora} onChange={e => setNuevoHora(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Notas internas (opcional)</label>
              <textarea value={nuevoNotas} onChange={e => setNuevoNotas(e.target.value)} rows={2}
                placeholder="Notas visibles solo para el negocio..."
                style={{ ...inputStyle, resize: "vertical" as const }} />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
              <button onClick={() => { setModal(null); setError(""); }} style={btnStyle("#71717a")}>Cancelar</button>
              <button onClick={crearTurno} disabled={cargando}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#1e40af", border: "none", color: "#fff", opacity: cargando ? 0.6 : 1 }}>
                {cargando ? "Guardando..." : <><Plus size={14} /> Crear turno</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL DETALLE ── */}
      {modal === "detalle" && turnoSeleccionado && (
        <Modal onClose={() => setModal(null)} titulo="Detalle del turno">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(30,64,175,0.15)", border: "1px solid rgba(30,64,175,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={20} color="#3b82f6" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{turnoSeleccionado.clienteNombre}</p>
                <a href={`tel:${turnoSeleccionado.clienteTelefono}`} style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>
                  {turnoSeleccionado.clienteTelefono}
                </a>
              </div>
              <div style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 8, background: ESTADO_CONFIG[turnoSeleccionado.estado]?.bg, border: `1px solid ${ESTADO_CONFIG[turnoSeleccionado.estado]?.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: ESTADO_CONFIG[turnoSeleccionado.estado]?.color }}>
                  {ESTADO_CONFIG[turnoSeleccionado.estado]?.label}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <InfoBox icon={Calendar} label="Fecha y hora" valor={`${formatFecha(turnoSeleccionado.fechaHora)} ${formatHora(turnoSeleccionado.fechaHora)}`} />
              <InfoBox icon={Clock} label="Servicio" valor={`${turnoSeleccionado.servicio} · ${turnoSeleccionado.duracionMin}min`} />
              {turnoSeleccionado.precio !== null && <InfoBox icon={Check} label="Precio" valor={`$${turnoSeleccionado.precio.toLocaleString("es-AR")}`} />}
              {turnoSeleccionado.clienteEmail && <InfoBox icon={MessageSquare} label="Email" valor={turnoSeleccionado.clienteEmail} />}
            </div>

            {turnoSeleccionado.notasCliente && (
              <div style={{ padding: 12, background: "var(--bg-hover)", border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nota del cliente</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{turnoSeleccionado.notasCliente}</p>
              </div>
            )}

            {turnoSeleccionado.notasAdmin && (
              <div style={{ padding: 12, background: "rgba(30,64,175,0.06)", border: "1px solid rgba(30,64,175,0.2)", borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: "#60a5fa", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nota interna</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{turnoSeleccionado.notasAdmin}</p>
              </div>
            )}

            {turnoSeleccionado.motivoCancelacion && (
              <div style={{ padding: 12, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: "#f87171", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Motivo de cancelación</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{turnoSeleccionado.motivoCancelacion}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
              {turnoSeleccionado.estado === "PENDIENTE" && (
                <button onClick={() => cambiarEstado(turnoSeleccionado.id, "CONFIRMADO")} disabled={cargando} style={btnStyle("#22c55e")}>
                  <Check size={14} /> Confirmar
                </button>
              )}
              {(turnoSeleccionado.estado === "PENDIENTE" || turnoSeleccionado.estado === "CONFIRMADO") && (
                <button onClick={() => cambiarEstado(turnoSeleccionado.id, "COMPLETADO")} disabled={cargando} style={btnStyle("#3b82f6")}>
                  <CheckCircle2 size={14} /> Completado
                </button>
              )}
              {turnoSeleccionado.estado === "CONFIRMADO" && (
                <button onClick={() => cambiarEstado(turnoSeleccionado.id, "AUSENTE")} disabled={cargando} style={btnStyle("#a1a1aa")}>
                  <AlertCircle size={14} /> Ausente
                </button>
              )}
              <button onClick={() => abrirEditar(turnoSeleccionado)} style={btnStyle("#71717a")}>
                <Pencil size={14} /> Editar
              </button>
              <a href={`https://wa.me/54${turnoSeleccionado.clienteTelefono.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ ...btnStyle("#22c55e"), textDecoration: "none" }}>
                <Phone size={14} /> WhatsApp
              </a>
              {turnoSeleccionado.estado !== "CANCELADO" && (
                <button onClick={() => { setMotivoCancel(""); setModal("cancelar"); }} disabled={cargando} style={btnStyle("#f87171")}>
                  <XCircle size={14} /> Cancelar
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL EDITAR ── */}
      {modal === "editar" && turnoSeleccionado && (
        <Modal onClose={() => setModal(null)} titulo="Editar turno">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hora</label>
                <input type="time" value={editHora} onChange={e => setEditHora(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Servicio</label>
              <select value={editServicio} onChange={e => setEditServicio(e.target.value)} style={inputStyle}>
                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} · {s.duracionMin}min</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Notas internas</label>
              <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} rows={3}
                placeholder="Notas visibles solo para el negocio..."
                style={{ ...inputStyle, resize: "vertical" as const }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)} style={btnStyle("#71717a")}>Cancelar</button>
              <button onClick={editarTurno} disabled={cargando}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#1e40af", border: "none", color: "#fff" }}>
                {cargando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CANCELAR ── */}
      {modal === "cancelar" && turnoSeleccionado && (
        <Modal onClose={() => setModal(null)} titulo="Cancelar turno">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              ¿Cancelar el turno de <strong>{turnoSeleccionado.clienteNombre}</strong>?
            </p>
            <div>
              <label style={labelStyle}>Motivo (opcional)</label>
              <input value={motivoCancel} onChange={e => setMotivoCancel(e.target.value)}
                placeholder="Ej: reprogramado, sin disponibilidad..."
                style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)} style={btnStyle("#71717a")}>Volver</button>
              <button onClick={() => cambiarEstado(turnoSeleccionado.id, "CANCELADO", motivoCancel)} disabled={cargando}
                style={{ ...btnStyle("#f87171"), background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)" }}>
                {cargando ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────

function Modal({ children, onClose, titulo }: { children: React.ReactNode; onClose: () => void; titulo: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 500,
        background: "var(--bg-card)", border: "1px solid var(--border-md)",
        borderRadius: 20, padding: "1.5rem",
        boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{titulo}</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, cursor: "pointer", background: "transparent", border: "1px solid var(--border-md)", color: "var(--text-muted)", display: "flex" }}>
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, valor }: { icon: React.ElementType; label: string; valor: string }) {
  return (
    <div style={{ padding: 10, background: "var(--bg-hover)", border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon size={12} color="var(--text-faint)" />
        <span style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{valor}</p>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", background: `${color}15`,
    border: `1px solid ${color}35`, color,
  };
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
  colorScheme: "dark",
};