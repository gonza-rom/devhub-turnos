"use client";
// app/(app)/servicios/ServiciosClient.tsx

import { useState } from "react";
import { Plus, Pencil, Trash2, Clock, DollarSign, X, Check, ToggleLeft, ToggleRight, Scissors } from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────

type Servicio = {
  id:          string;
  nombre:      string;
  descripcion: string | null;
  precio:      number | null;
  duracionMin: number;
  activo:      boolean;
  orden:       number;
};

type Props = { serviciosIniciales: Servicio[] };

// ── Componente ────────────────────────────────────────────────

export default function ServiciosClient({ serviciosIniciales }: Props) {
  const [servicios, setServicios] = useState<Servicio[]>(serviciosIniciales);
  const [modal,     setModal]     = useState<"nuevo" | "editar" | "eliminar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<Servicio | null>(null);
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState("");

  // Campos del form
  const [fNombre,      setFNombre]      = useState("");
  const [fDescripcion, setFDescripcion] = useState("");
  const [fPrecio,      setFPrecio]      = useState("");
  const [fDuracion,    setFDuracion]    = useState("30");

  // ── Helpers form ─────────────────────────────────────────────

  function abrirNuevo() {
    setFNombre(""); setFDescripcion(""); setFPrecio(""); setFDuracion("30");
    setError(""); setModal("nuevo");
  }

  function abrirEditar(s: Servicio) {
    setFNombre(s.nombre);
    setFDescripcion(s.descripcion ?? "");
    setFPrecio(s.precio?.toString() ?? "");
    setFDuracion(s.duracionMin.toString());
    setSeleccionado(s);
    setError(""); setModal("editar");
  }

  // ── API calls ─────────────────────────────────────────────────

  async function crearServicio() {
    if (!fNombre.trim()) { setError("El nombre es requerido."); return; }
    if (!fDuracion || parseInt(fDuracion) < 1) { setError("La duración debe ser mayor a 0."); return; }
    setCargando(true); setError("");
    try {
      const res = await fetch("/api/servicios", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          nombre:      fNombre.trim(),
          descripcion: fDescripcion.trim() || null,
          precio:      fPrecio ? parseFloat(fPrecio) : null,
          duracionMin: parseInt(fDuracion),
          orden:       servicios.length,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServicios(s => [...s, data.servicio]);
      setModal(null);
    } catch {
      setError("Error al crear el servicio.");
    } finally {
      setCargando(false);
    }
  }

  async function editarServicio() {
    if (!seleccionado) return;
    if (!fNombre.trim()) { setError("El nombre es requerido."); return; }
    if (!fDuracion || parseInt(fDuracion) < 1) { setError("La duración debe ser mayor a 0."); return; }
    setCargando(true); setError("");
    try {
      const res = await fetch(`/api/servicios/${seleccionado.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          nombre:      fNombre.trim(),
          descripcion: fDescripcion.trim() || null,
          precio:      fPrecio ? parseFloat(fPrecio) : null,
          duracionMin: parseInt(fDuracion),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServicios(s => s.map(sv => sv.id === seleccionado.id ? data.servicio : sv));
      setModal(null);
    } catch {
      setError("Error al guardar los cambios.");
    } finally {
      setCargando(false);
    }
  }

  async function toggleActivo(s: Servicio) {
    try {
      const res = await fetch(`/api/servicios/${s.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ activo: !s.activo }),
      });
      if (!res.ok) throw new Error();
      setServicios(sv => sv.map(item => item.id === s.id ? { ...item, activo: !item.activo } : item));
    } catch {
      // silencioso — el toggle ya visualmente no se cambia
    }
  }

  async function eliminarServicio() {
    if (!seleccionado) return;
    setCargando(true); setError("");
    try {
      const res = await fetch(`/api/servicios/${seleccionado.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setServicios(s => s.filter(sv => sv.id !== seleccionado.id));
      setModal(null);
    } catch {
      setError("Error al eliminar el servicio.");
    } finally {
      setCargando(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────

  const activos   = servicios.filter(s => s.activo);
  const inactivos = servicios.filter(s => !s.activo);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Servicios
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {activos.length} activos · {inactivos.length} inactivos
          </p>
        </div>
        <button onClick={abrirNuevo}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#1e40af", border: "none", color: "#fff" }}>
          <Plus size={15} /> Nuevo servicio
        </button>
      </div>

      {/* Lista */}
      {servicios.length === 0 ? (
        <div style={{ padding: "56px 20px", textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16 }}>
          <Scissors size={32} color="var(--text-faint)" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px" }}>Todavía no hay servicios</p>
          <button onClick={abrirNuevo}
            style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#1e40af", border: "none", color: "#fff" }}>
            Crear el primer servicio
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Activos */}
          {activos.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Activos — {activos.length}
                </span>
              </div>
              {activos.map((s, i) => (
                <ServicioRow
                  key={s.id} s={s}
                  isLast={i === activos.length - 1}
                  onEditar={() => abrirEditar(s)}
                  onToggle={() => toggleActivo(s)}
                  onEliminar={() => { setSeleccionado(s); setError(""); setModal("eliminar"); }}
                />
              ))}
            </div>
          )}

          {/* Inactivos */}
          {inactivos.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, overflow: "hidden", opacity: 0.7 }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Inactivos — {inactivos.length}
                </span>
              </div>
              {inactivos.map((s, i) => (
                <ServicioRow
                  key={s.id} s={s}
                  isLast={i === inactivos.length - 1}
                  onEditar={() => abrirEditar(s)}
                  onToggle={() => toggleActivo(s)}
                  onEliminar={() => { setSeleccionado(s); setError(""); setModal("eliminar"); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL NUEVO / EDITAR ── */}
      {(modal === "nuevo" || modal === "editar") && (
        <Modal
          onClose={() => setModal(null)}
          titulo={modal === "nuevo" ? "Nuevo servicio" : "Editar servicio"}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}

            <div>
              <label style={labelStyle}>Nombre *</label>
              <input value={fNombre} onChange={e => setFNombre(e.target.value)}
                placeholder="Ej: Corte + Barba" style={inputStyle} autoFocus />
            </div>

            <div>
              <label style={labelStyle}>Descripción (opcional)</label>
              <textarea value={fDescripcion} onChange={e => setFDescripcion(e.target.value)}
                rows={2} placeholder="Breve descripción del servicio..."
                style={{ ...inputStyle, resize: "vertical" as const }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Precio</label>
                <div style={{ position: "relative" }}>
                  <DollarSign size={14} color="var(--text-faint)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input value={fPrecio} onChange={e => setFPrecio(e.target.value)}
                    type="number" min="0" placeholder="0"
                    style={{ ...inputStyle, paddingLeft: 32 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Duración (minutos) *</label>
                <div style={{ position: "relative" }}>
                  <Clock size={14} color="var(--text-faint)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input value={fDuracion} onChange={e => setFDuracion(e.target.value)}
                    type="number" min="1" placeholder="30"
                    style={{ ...inputStyle, paddingLeft: 32 }} />
                </div>
              </div>
            </div>

            {/* Preview */}
            {fNombre && (
              <div style={{ padding: 12, background: "rgba(30,64,175,0.06)", border: "1px solid rgba(30,64,175,0.2)", borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: "#60a5fa", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vista previa</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{fNombre}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                  {fDuracion ? `${fDuracion} min` : ""}
                  {fDuracion && fPrecio ? " · " : ""}
                  {fPrecio ? `$${parseFloat(fPrecio).toLocaleString("es-AR")}` : ""}
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
              <button onClick={() => setModal(null)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid var(--border-md)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={modal === "nuevo" ? crearServicio : editarServicio} disabled={cargando}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#1e40af", border: "none", color: "#fff", opacity: cargando ? 0.6 : 1 }}>
                {cargando ? "Guardando..." : <><Check size={14} />{modal === "nuevo" ? "Crear servicio" : "Guardar cambios"}</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL ELIMINAR ── */}
      {modal === "eliminar" && seleccionado && (
        <Modal onClose={() => setModal(null)} titulo="Eliminar servicio">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              ¿Eliminar <strong style={{ color: "var(--text-primary)" }}>{seleccionado.nombre}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Si el servicio tiene turnos asociados, te recomendamos desactivarlo en vez de eliminarlo.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid var(--border-md)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={eliminarServicio} disabled={cargando}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171" }}>
                {cargando ? "Eliminando..." : <><Trash2 size={14} /> Eliminar</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── Fila de servicio ──────────────────────────────────────────

function ServicioRow({ s, isLast, onEditar, onToggle, onEliminar }: {
  s: Servicio; isLast: boolean;
  onEditar: () => void; onToggle: () => void; onEliminar: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
      borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
      transition: "background 0.25s",
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
    >
      {/* Ícono */}
      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: s.activo ? "rgba(30,64,175,0.12)" : "var(--bg-hover-md)", border: `1px solid ${s.activo ? "rgba(30,64,175,0.25)" : "var(--border-md)"}`, transition: "all 0.2s" }}>
        <Scissors size={16} color={s.activo ? "#3b82f6" : "var(--text-faint)"} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {s.nombre}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
            <Clock size={11} /> {s.duracionMin} min
          </span>
          {s.precio !== null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
              <DollarSign size={11} /> ${s.precio.toLocaleString("es-AR")}
            </span>
          )}
          {s.descripcion && (
            <span style={{ fontSize: 12, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
              {s.descripcion}
            </span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

        {/* Toggle animado */}
        <button onClick={onToggle}
        className="toggle-switch"
        style={{
            width: 44, height: 24, borderRadius: 99, border: "none",
            cursor: "pointer", padding: 0, position: "relative",
            background: s.activo ? "#1e40af" : "rgba(255,255,255,0.08)",
            outline: "none",
        }}>
        <span
            className="toggle-thumb-dot"
            style={{
            position: "absolute", top: 3,
            left: s.activo ? 23 : 3,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
        />
        </button>

        <button onClick={onEditar} title="Editar"
          style={{ padding: "5px 8px", borderRadius: 8, cursor: "pointer", background: "var(--bg-hover-md)", border: "1px solid var(--border-md)", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
          <Pencil size={13} />
        </button>
        <button onClick={onEliminar} title="Eliminar"
          style={{ padding: "5px 8px", borderRadius: 8, cursor: "pointer", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171", display: "flex", alignItems: "center" }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────

function Modal({ children, onClose, titulo }: { children: React.ReactNode; onClose: () => void; titulo: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 1, width: "100%", maxWidth: 460,
        background: "var(--bg-card)", border: "1px solid var(--border-md)",
        borderRadius: 20, padding: "1.5rem",
        boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
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