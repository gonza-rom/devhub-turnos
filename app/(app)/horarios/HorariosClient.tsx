"use client";
// app/(app)/horarios/HorariosClient.tsx

import { useState } from "react";
import { Clock, Plus, Trash2, X, Check, CalendarOff, Save } from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────

type Franja = {
  id:         string;   // cuid o "new-{timestamp}" para las nuevas
  horaInicio: string;
  horaFin:    string;
  orden:      number;
};

type Horario = {
  id:        string;
  diaSemana: number;
  activo:    boolean;
  franjas:   Franja[];
};

type Bloqueo = {
  id:         string;
  fechaDesde: string;
  fechaHasta: string;
  motivo:     string | null;
};

type Props = {
  horariosIniciales: Horario[];
  bloqueosIniciales: Bloqueo[];
};

const DIAS       = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const DIAS_CORTO = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function calcularHoras(inicio: string, fin: string): string {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  const totalMin = hf * 60 + mf - (hi * 60 + mi);
  if (totalMin <= 0) return "";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

function franjaDefault(orden: number): Franja {
  return {
    id:         `new-${Date.now()}-${orden}`,
    horaInicio: orden === 0 ? "09:00" : "17:00",
    horaFin:    orden === 0 ? "13:00" : "21:00",
    orden,
  };
}

// ── Estilos compartidos ───────────────────────────────────────

const timeInputStyle: React.CSSProperties = {
  padding: "6px 10px",
  background: "var(--bg-input)",
  border: "1px solid var(--border-md)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  colorScheme: "dark",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--bg-input)",
  border: "1px solid var(--border-md)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  colorScheme: "dark",
  boxSizing: "border-box",
};

// ── Componente ────────────────────────────────────────────────

export default function HorariosClient({ horariosIniciales, bloqueosIniciales }: Props) {
  const [horarios,  setHorarios]  = useState<Horario[]>(horariosIniciales);
  const [bloqueos,  setBloqueos]  = useState<Bloqueo[]>(bloqueosIniciales);
  const [guardando, setGuardando] = useState(false);
  const [guardado,  setGuardado]  = useState(false);
  const [error,     setError]     = useState("");

  // Modal bloqueo
  const [modalBloqueo, setModalBloqueo] = useState(false);
  const [bFechaDesde,  setBFechaDesde]  = useState("");
  const [bFechaHasta,  setBFechaHasta]  = useState("");
  const [bMotivo,      setBMotivo]      = useState("");
  const [cargandoB,    setCargandoB]    = useState(false);
  const [errorB,       setErrorB]       = useState("");

  // ── Horarios ─────────────────────────────────────────────────

  function toggleDia(i: number) {
    setHorarios(h =>
      h.map((d, idx) => {
        if (idx !== i) return d;
        const activo = !d.activo;
        // Si se activa y no tiene franjas, agregar una por defecto
        const franjas =
          activo && d.franjas.length === 0 ? [franjaDefault(0)] : d.franjas;
        return { ...d, activo, franjas };
      })
    );
    setGuardado(false);
  }

  function actualizarFranja(
    diaIdx: number,
    franjaIdx: number,
    campo: "horaInicio" | "horaFin",
    valor: string
  ) {
    setHorarios(h =>
      h.map((d, i) => {
        if (i !== diaIdx) return d;
        return {
          ...d,
          franjas: d.franjas.map((f, j) =>
            j === franjaIdx ? { ...f, [campo]: valor } : f
          ),
        };
      })
    );
    setGuardado(false);
  }

  function agregarFranja(diaIdx: number) {
    setHorarios(h =>
      h.map((d, i) => {
        if (i !== diaIdx) return d;
        return {
          ...d,
          franjas: [...d.franjas, franjaDefault(d.franjas.length)],
        };
      })
    );
    setGuardado(false);
  }

  function eliminarFranja(diaIdx: number, franjaIdx: number) {
    setHorarios(h =>
      h.map((d, i) => {
        if (i !== diaIdx) return d;
        return {
          ...d,
          franjas: d.franjas
            .filter((_, j) => j !== franjaIdx)
            .map((f, j) => ({ ...f, orden: j })),
        };
      })
    );
    setGuardado(false);
  }

  async function guardarHorarios() {
    setGuardando(true);
    setError("");
    setGuardado(false);
    try {
      const res = await fetch("/api/horarios", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ horarios }),
      });
      if (!res.ok) throw new Error();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch {
      setError("Error al guardar los horarios.");
    } finally {
      setGuardando(false);
    }
  }

  // ── Bloqueos ─────────────────────────────────────────────────

  async function crearBloqueo() {
    if (!bFechaDesde || !bFechaHasta) {
      setErrorB("Las fechas son requeridas.");
      return;
    }
    if (new Date(bFechaDesde) > new Date(bFechaHasta)) {
      setErrorB("La fecha de inicio debe ser anterior al fin.");
      return;
    }
    setCargandoB(true);
    setErrorB("");
    try {
      const res = await fetch("/api/bloqueos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fechaDesde: new Date(bFechaDesde).toISOString(),
          fechaHasta: new Date(`${bFechaHasta}T23:59:59`).toISOString(),
          motivo:     bMotivo.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBloqueos(b => [
        ...b,
        {
          ...data.bloqueo,
          fechaDesde: data.bloqueo.fechaDesde,
          fechaHasta: data.bloqueo.fechaHasta,
        },
      ]);
      setBFechaDesde("");
      setBFechaHasta("");
      setBMotivo("");
      setModalBloqueo(false);
    } catch {
      setErrorB("Error al crear el bloqueo.");
    } finally {
      setCargandoB(false);
    }
  }

  async function eliminarBloqueo(id: string) {
    try {
      const res = await fetch(`/api/bloqueos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBloqueos(b => b.filter(bl => bl.id !== id));
    } catch {
      // silencioso
    }
  }

  const diasActivos = horarios.filter(h => h.activo).length;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 680, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Horarios
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {diasActivos} {diasActivos === 1 ? "día activo" : "días activos"}
          </p>
        </div>
        <button
          onClick={guardarHorarios}
          disabled={guardando}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: guardando ? "not-allowed" : "pointer",
            background: guardado ? "rgba(34,197,94,0.15)" : "#1e40af",
            border: guardado ? "1px solid rgba(34,197,94,0.3)" : "none",
            color: guardado ? "#22c55e" : "#fff",
            opacity: guardando ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          {guardado
            ? <><Check size={15} /> Guardado</>
            : guardando
            ? "Guardando..."
            : <><Save size={15} /> Guardar cambios</>}
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10, color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Días de atención ── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Días y horarios de atención
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Activá los días que atendés. Podés agregar múltiples franjas por día (ej: mañana y tarde)
          </p>
        </div>

        <div style={{ padding: "4px 0" }}>
          {horarios.map((h, diaIdx) => (
            <div
              key={h.diaSemana}
              style={{
                borderBottom: diaIdx < 6 ? "1px solid var(--border-subtle)" : "none",
                padding: "14px 20px",
                opacity: h.activo ? 1 : 0.5,
                transition: "opacity 0.2s",
              }}
            >
              {/* Fila principal: toggle + nombre del día */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: h.activo ? 12 : 0 }}>
                {/* Toggle */}
                <button
                  onClick={() => toggleDia(diaIdx)}
                  style={{
                    width: 44, height: 24, borderRadius: 99, border: "none",
                    cursor: "pointer", padding: 0, position: "relative",
                    background: h.activo ? "#1e40af" : "rgba(255,255,255,0.08)",
                    outline: "none", flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute", top: 3,
                      left: h.activo ? 23 : 3,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      transition: "left 0.15s",
                    }}
                  />
                </button>

                {/* Nombre */}
                <div style={{ minWidth: 90 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                    {DIAS[h.diaSemana]}
                  </p>
                  {!h.activo && (
                    <p style={{ fontSize: 11, color: "var(--text-faint)", margin: 0 }}>No atiende</p>
                  )}
                  {h.activo && h.franjas.length > 0 && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                      {h.franjas.length === 1 ? "1 franja" : `${h.franjas.length} franjas`}
                    </p>
                  )}
                </div>

                {/* Botón agregar franja — solo si está activo */}
                {h.activo && h.franjas.length < 3 && (
                  <button
                    onClick={() => agregarFranja(diaIdx)}
                    title="Agregar franja"
                    style={{
                      marginLeft: "auto",
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      background: "rgba(30,64,175,0.08)",
                      border: "1px solid rgba(30,64,175,0.2)",
                      color: "#60a5fa",
                    }}
                  >
                    <Plus size={12} /> Agregar franja
                  </button>
                )}
              </div>

              {/* Franjas horarias */}
              {h.activo && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 58 }}>
                  {h.franjas.map((f, franjaIdx) => (
                    <div
                      key={f.id}
                      style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                    >
                      {/* Etiqueta de la franja */}
                      <span
                        style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                          color: franjaIdx === 0 ? "#60a5fa" : franjaIdx === 1 ? "#a78bfa" : "#34d399",
                          textTransform: "uppercase", minWidth: 40,
                        }}
                      >
                        {franjaIdx === 0 ? "1ra" : franjaIdx === 1 ? "2da" : "3ra"}
                      </span>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={12} color="var(--text-faint)" />
                        <input
                          type="time"
                          value={f.horaInicio}
                          onChange={e => actualizarFranja(diaIdx, franjaIdx, "horaInicio", e.target.value)}
                          style={timeInputStyle}
                        />
                      </div>

                      <span style={{ color: "var(--text-faint)", fontSize: 12 }}>→</span>

                      <input
                        type="time"
                        value={f.horaFin}
                        onChange={e => actualizarFranja(diaIdx, franjaIdx, "horaFin", e.target.value)}
                        style={timeInputStyle}
                      />

                      <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 36 }}>
                        {calcularHoras(f.horaInicio, f.horaFin)}
                      </span>

                      {/* Eliminar franja (solo si hay más de una) */}
                      {h.franjas.length > 1 && (
                        <button
                          onClick={() => eliminarFranja(diaIdx, franjaIdx)}
                          title="Eliminar franja"
                          style={{
                            padding: "4px 7px", borderRadius: 6,
                            cursor: "pointer",
                            background: "rgba(220,38,38,0.07)",
                            border: "1px solid rgba(220,38,38,0.18)",
                            color: "#f87171",
                            display: "flex", alignItems: "center",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Resumen semanal ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {horarios.map(h => (
          <div
            key={h.diaSemana}
            style={{
              padding: "10px 6px", borderRadius: 10, textAlign: "center",
              background: h.activo ? "rgba(30,64,175,0.1)" : "var(--bg-card)",
              border: `1px solid ${h.activo ? "rgba(30,64,175,0.25)" : "var(--border-base)"}`,
              transition: "all 0.2s",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: h.activo ? "#60a5fa" : "var(--text-faint)", margin: "0 0 4px" }}>
              {DIAS_CORTO[h.diaSemana]}
            </p>
            {h.activo && h.franjas.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {h.franjas.map((f, fi) => (
                  <p key={fi} style={{ fontSize: 9, color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                    {f.horaInicio}–{f.horaFin}
                  </p>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 9, color: "var(--text-faint)", margin: 0 }}>—</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Bloqueos ── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-base)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Bloqueos y días cerrados</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>Vacaciones, feriados o cualquier período sin atención</p>
          </div>
          <button
            onClick={() => { setModalBloqueo(true); setErrorB(""); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "rgba(30,64,175,0.1)", border: "1px solid rgba(30,64,175,0.25)", color: "#60a5fa" }}
          >
            <Plus size={13} /> Agregar bloqueo
          </button>
        </div>

        {bloqueos.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <CalendarOff size={28} color="var(--text-faint)" style={{ margin: "0 auto 10px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>No hay bloqueos configurados</p>
          </div>
        ) : (
          <div>
            {bloqueos.map((b, i) => (
              <div
                key={b.id}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: i < bloqueos.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CalendarOff size={16} color="#fbbf24" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                    {formatFecha(b.fechaDesde)}
                    {b.fechaDesde !== b.fechaHasta ? ` → ${formatFecha(b.fechaHasta)}` : ""}
                  </p>
                  {b.motivo && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{b.motivo}</p>
                  )}
                </div>
                <button
                  onClick={() => eliminarBloqueo(b.id)}
                  style={{ padding: "5px 8px", borderRadius: 8, cursor: "pointer", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171", display: "flex", alignItems: "center" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL BLOQUEO ── */}
      {modalBloqueo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setModalBloqueo(false)}
          />
          <div style={{
            position: "relative", zIndex: 1, width: "100%", maxWidth: 420,
            background: "var(--bg-card)", border: "1px solid var(--border-md)",
            borderRadius: 20, padding: "1.5rem",
            boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Agregar bloqueo
              </h3>
              <button
                onClick={() => setModalBloqueo(false)}
                style={{ padding: 6, borderRadius: 8, cursor: "pointer", background: "transparent", border: "1px solid var(--border-md)", color: "var(--text-muted)", display: "flex" }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {errorB && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{errorB}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Desde *</label>
                  <input type="date" value={bFechaDesde} onChange={e => setBFechaDesde(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hasta *</label>
                  <input type="date" value={bFechaHasta} onChange={e => setBFechaHasta(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Motivo (opcional)</label>
                <input
                  value={bMotivo}
                  onChange={e => setBMotivo(e.target.value)}
                  placeholder="Ej: Vacaciones, Feriado, Refacción..."
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setModalBloqueo(false)}
                  style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid var(--border-md)", color: "var(--text-muted)" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={crearBloqueo}
                  disabled={cargandoB}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#1e40af", border: "none", color: "#fff", opacity: cargandoB ? 0.6 : 1 }}
                >
                  {cargandoB ? "Guardando..." : <><Check size={14} /> Guardar bloqueo</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}