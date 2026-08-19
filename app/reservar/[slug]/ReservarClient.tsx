"use client";
// app/reservar/[slug]/ReservarClient.tsx
// Frontend externo de reservas — 4 pasos:
// 0: Elegir servicio
// 1: Elegir fecha
// 2: Elegir horario
// 3: Datos del cliente
// 4: Confirmación

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, User, Phone, Mail, MessageSquare,
  Scissors, Car, Sparkles, Stethoscope, HelpCircle,
  ArrowLeft, Loader2, AlertCircle, MapPin, Instagram,
  DollarSign,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────

type Servicio = {
  id:          string;
  nombre:      string;
  descripcion: string | null;
  precio:      number | null;
  duracionMin: number;
};

type Tenant = {
  id:            string;
  nombre:        string;
  slug:          string;
  rubro:         string | null;
  colorReserva:  string | null;
  temaReserva:   string | null;
  descripcion:   string | null;
  logoUrl:       string | null;
  telefono:      string | null;
  ciudad:        string | null;
  provincia:     string | null;
  instagram:     string | null;
};

type Props = {
  tenant:              Tenant;
  serviciosIniciales: Servicio[];
};

type DatosCliente = {
  nombre:    string;
  telefono:  string;
  email:     string;
  notas:     string;
};

// ── Helpers ───────────────────────────────────────────────────

const RUBRO_ICON: Record<string, React.FC<{ size?: number; color?: string }>> = {
  BARBERIA:  Scissors,
  DETAILING: Car,
  ESTETICA:  Sparkles,
  MEDICO:    Stethoscope,
  OTRO:      HelpCircle,
};

const RUBRO_COLOR: Record<string, string> = {
  BARBERIA:  "#3b82f6",
  DETAILING: "#8b5cf6",
  ESTETICA:  "#ec4899",
  MEDICO:    "#10b981",
  OTRO:      "#71717a",
};

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS_SHORT = ["Do","Lu","Ma","Mi","Ju","Vi","Sá"];
const DIAS_FULL  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function formatFecha(d: Date): string {
  return `${DIAS_FULL[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPrecio(precio: number | null): string {
  if (!precio) return "";
  return `$${precio.toLocaleString("es-AR")}`;
}

function formatDuracion(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ── Componente principal ───────────────────────────────────────

export default function ReservarClient({ tenant, serviciosIniciales }: Props) {
  const [paso,          setPaso]          = useState(0);
  const [servicio,      setServicio]      = useState<Servicio | null>(null);
  const [fecha,         setFecha]         = useState<Date | null>(null);
  const [mesActual,     setMesActual]     = useState(() => {
    const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1);
  });
  const [slots,         setSlots]         = useState<string[]>([]);
  const [loadingSlots,  setLoadingSlots]  = useState(false);
  const [slotError,     setSlotError]     = useState("");
  const [horario,       setHorario]       = useState<string | null>(null);
  const [datos,         setDatos]         = useState<DatosCliente>({ nombre: "", telefono: "", email: "", notas: "" });
  const [errores,       setErrores]       = useState<Partial<DatosCliente>>({});
  const [cargando,      setCargando]      = useState(false);
  const [errorGlobal,   setErrorGlobal]   = useState("");
  const [turnoCreado,   setTurnoCreado]   = useState<{ id: string; fechaHora: string } | null>(null);

  const rubroColor = tenant.colorReserva || RUBRO_COLOR[tenant.rubro ?? "OTRO"] || "#3b82f6";
  const RubroIcon  = RUBRO_ICON[tenant.rubro ?? "OTRO"] ?? HelpCircle;
  const claro      = tenant.temaReserva === "CLARO";
  const T          = crearTokens(claro);
  const s          = crearEstilos(T);

  // ── Cargar slots cuando cambia fecha o servicio ────────────
  const cargarSlots = useCallback(async (f: Date, s: Servicio) => {
    setLoadingSlots(true);
    setSlotError("");
    setSlots([]);
    setHorario(null);
    try {
      const fechaStr = toLocalDateStr(f);
      const res = await fetch(
        `/api/public/${tenant.slug}/disponibilidad?fecha=${fechaStr}&servicio=${s.id}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      if (json.cerrado)   setSlotError("El comercio no atiende ese día.");
      else if (json.bloqueado) setSlotError(json.motivoBloqueo ?? "Día no disponible.");
      else if (json.data.length === 0) setSlotError("No hay turnos disponibles para ese día.");
      else setSlots(json.data);
    } catch (e: any) {
      setSlotError(e.message ?? "Error al cargar disponibilidad.");
    } finally {
      setLoadingSlots(false);
    }
  }, [tenant.slug]);

  useEffect(() => {
    if (paso === 2 && fecha && servicio) {
      cargarSlots(fecha, servicio);
    }
  }, [paso, fecha, servicio, cargarSlots]);

  // ── Validar formulario ────────────────────────────────────
  function validarDatos(): boolean {
    const e: Partial<DatosCliente> = {};
    if (!datos.nombre.trim())    e.nombre    = "Requerido";
    if (!datos.telefono.trim())  e.telefono  = "Requerido";
    if (datos.email && !/\S+@\S+\.\S+/.test(datos.email)) e.email = "Email inválido";
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  // ── Confirmar reserva ─────────────────────────────────────
  async function confirmarReserva() {
    if (!validarDatos()) return;
    if (!fecha || !horario || !servicio) return;

    setCargando(true);
    setErrorGlobal("");

    try {
      // Construir ISO de la fecha+hora en zona local
      const [hh, mm] = horario.split(":").map(Number);
      const fechaHora = new Date(
        fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), hh, mm
      ).toISOString();

      const res = await fetch(`/api/public/${tenant.slug}/reservar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioId:      servicio.id,
          fechaHora,
          clienteNombre:   datos.nombre,
          clienteTelefono: datos.telefono,
          clienteEmail:    datos.email || null,
          notasCliente:    datos.notas || null,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setTurnoCreado({ id: json.data.id, fechaHora: json.data.fechaHora });
      setPaso(4);
    } catch (e: any) {
      setErrorGlobal(e.message ?? "No se pudo confirmar la reserva. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  // ── Calendario ────────────────────────────────────────────
  function diasDelMes(): (Date | null)[] {
    const primerDia   = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
    const ultimoDia   = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
    const offsetInicio = primerDia.getDay();
    const dias: (Date | null)[] = Array(offsetInicio).fill(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      dias.push(new Date(mesActual.getFullYear(), mesActual.getMonth(), d));
    }
    return dias;
  }

  const hoy          = new Date(); hoy.setHours(0, 0, 0, 0);
  const maxFecha     = new Date(hoy); maxFecha.setDate(hoy.getDate() + 60);
  const puedeAtras   = mesActual > new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const puedeAdelante = new Date(mesActual.getFullYear(), mesActual.getMonth() + 2, 1) <= maxFecha;

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div style={s.shell}>
      {/* Fondo decorativo */}
      <div style={{ ...s.bgBlob, background: `radial-gradient(ellipse at 60% 0%, ${rubroColor}18 0%, transparent 65%)` }} />
      <div style={{ ...s.bgBlob, background: "radial-gradient(ellipse at 20% 80%, rgba(30,64,175,0.07) 0%, transparent 65%)", top: "auto", bottom: 0 }} />

      <div style={s.wrap}>

        {/* ── Header del comercio ── */}
        <header style={s.header}>
          <div style={s.headerInner}>
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.nombre} style={s.logo} />
            ) : (
              <div style={{ ...s.logoFallback, background: `${rubroColor}18`, border: `1px solid ${rubroColor}30` }}>
                <RubroIcon size={20} color={rubroColor} />
              </div>
            )}
            <div>
              <h1 style={s.headerNombre}>{tenant.nombre}</h1>
              {(tenant.ciudad || tenant.provincia) && (
                <p style={s.headerSub}>
                  <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                  {[tenant.ciudad, tenant.provincia].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
          {tenant.instagram && (
            <a
              href={`https://instagram.com/${tenant.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={s.igLink}
            >
              <Instagram size={15} />
            </a>
          )}
        </header>

        {/* ── Progress bar ── */}
        {paso < 4 && (
          <div style={s.progressWrap}>
            {["Servicio","Fecha","Horario","Tus datos"].map((label, i) => (
              <div key={i} style={s.progressStep}>
                <div style={{
                  ...s.progressDot,
                  background: i < paso ? rubroColor : i === paso ? rubroColor : T.border08,
                  border:     `1.5px solid ${i <= paso ? rubroColor : T.border12}`,
                  transform:  i === paso ? "scale(1.2)" : "scale(1)",
                }} />
                <span style={{ ...s.progressLabel, color: i === paso ? T.textPrimary : T.textFaint }}>
                  {label}
                </span>
                {i < 3 && <div style={{ ...s.progressLine, background: i < paso ? rubroColor : T.border10 }} />}
              </div>
            ))}
          </div>
        )}

        {/* ── PASO 0: Elegir servicio ── */}
        {paso === 0 && (
          <div style={s.card}>
            <div style={s.cardHead}>
              <div style={{ ...s.stepIcon, background: `${rubroColor}15`, border: `1px solid ${rubroColor}25` }}>
                <RubroIcon size={16} color={rubroColor} />
              </div>
              <div>
                <h2 style={s.cardTitle}>¿Qué servicio necesitás?</h2>
                <p style={s.cardDesc}>Seleccioná el tipo de turno</p>
              </div>
            </div>

            <div style={s.serviciosGrid}>
              {serviciosIniciales.map((sv) => (
                <button
                  key={sv.id}
                  onClick={() => { setServicio(sv); setPaso(1); }}
                  style={s.servicioCard}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = rubroColor;
                    (e.currentTarget as HTMLButtonElement).style.background = `${rubroColor}08`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = T.border08;
                    (e.currentTarget as HTMLButtonElement).style.background = T.surface4;
                  }}
                >
                  <div style={s.servicioTop}>
                    <span style={s.servicioNombre}>{sv.nombre}</span>
                    {sv.precio && (
                      <span style={{ ...s.servicioPrecio, color: rubroColor }}>
                        {formatPrecio(sv.precio)}
                      </span>
                    )}
                  </div>
                  {sv.descripcion && (
                    <p style={s.servicioDesc}>{sv.descripcion}</p>
                  )}
                  <div style={s.servicioDuracion}>
                    <Clock size={11} color={T.textFaint} />
                    <span>{formatDuracion(sv.duracionMin)}</span>
                  </div>
                </button>
              ))}
            </div>

            {serviciosIniciales.length === 0 && (
              <div style={s.emptyState}>
                <AlertCircle size={20} color={T.textFaint} />
                <p>Este comercio aún no tiene servicios disponibles.</p>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 1: Elegir fecha ── */}
        {paso === 1 && (
          <div style={s.card}>
            <button onClick={() => setPaso(0)} style={s.backBtn}>
              <ArrowLeft size={14} /> Cambiar servicio
            </button>

            {servicio && (
              <div style={s.seleccionada}>
                <span style={{ color: T.textMuted, fontSize: 12 }}>Servicio:</span>
                <span style={{ color: T.textPrimary, fontWeight: 600 }}>{servicio.nombre}</span>
                {servicio.precio && <span style={{ color: rubroColor, fontSize: 12 }}>{formatPrecio(servicio.precio)}</span>}
                <span style={{ color: T.textFaint, fontSize: 12 }}>{formatDuracion(servicio.duracionMin)}</span>
              </div>
            )}

            <div style={s.cardHead}>
              <div style={{ ...s.stepIcon, background: `${rubroColor}15`, border: `1px solid ${rubroColor}25` }}>
                <CalendarDays size={16} color={rubroColor} />
              </div>
              <div>
                <h2 style={s.cardTitle}>¿Qué día preferís?</h2>
                <p style={s.cardDesc}>Seleccioná una fecha disponible</p>
              </div>
            </div>

            {/* Calendario */}
            <div style={s.calendar}>
              {/* Nav mes */}
              <div style={s.calNav}>
                <button
                  onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))}
                  disabled={!puedeAtras}
                  style={s.calNavBtn}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={s.calMes}>
                  {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
                </span>
                <button
                  onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))}
                  disabled={!puedeAdelante}
                  style={s.calNavBtn}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Días semana */}
              <div style={s.calDiasHeader}>
                {DIAS_SHORT.map(d => (
                  <span key={d} style={s.calDiaLabel}>{d}</span>
                ))}
              </div>

              {/* Grilla días */}
              <div style={s.calGrid}>
                {diasDelMes().map((dia, i) => {
                  if (!dia) return <div key={`e${i}`} />;
                  const esHoy        = dia.getTime() === hoy.getTime();
                  const pasado       = dia < hoy;
                  const demasiado    = dia > maxFecha;
                  const deshabilitado = pasado || demasiado;
                  const seleccionado = fecha?.getTime() === dia.getTime();

                  return (
                    <button
                      key={dia.getTime()}
                      disabled={deshabilitado}
                      onClick={() => { setFecha(dia); setPaso(2); }}
                      style={{
                        ...s.calDia,
                        background: seleccionado ? rubroColor
                          : esHoy ? `${rubroColor}15` : "transparent",
                        color: deshabilitado ? T.textFainter
                          : seleccionado ? "#fff" : T.textSecondary,
                        border: esHoy && !seleccionado ? `1px solid ${rubroColor}40` : "1px solid transparent",
                        cursor: deshabilitado ? "not-allowed" : "pointer",
                        fontWeight: seleccionado ? 700 : esHoy ? 600 : 400,
                      }}
                    >
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 2: Elegir horario ── */}
        {paso === 2 && (
          <div style={s.card}>
            <button onClick={() => setPaso(1)} style={s.backBtn}>
              <ArrowLeft size={14} /> Cambiar fecha
            </button>

            {fecha && (
              <div style={s.seleccionada}>
                <span style={{ color: T.textMuted, fontSize: 12 }}>Fecha:</span>
                <span style={{ color: T.textPrimary, fontWeight: 600 }}>{formatFecha(fecha)}</span>
              </div>
            )}

            <div style={s.cardHead}>
              <div style={{ ...s.stepIcon, background: `${rubroColor}15`, border: `1px solid ${rubroColor}25` }}>
                <Clock size={16} color={rubroColor} />
              </div>
              <div>
                <h2 style={s.cardTitle}>Elegí un horario</h2>
                <p style={s.cardDesc}>Turnos disponibles para ese día</p>
              </div>
            </div>

            {loadingSlots && (
              <div style={s.loadingWrap}>
                <Loader2 size={20} color={rubroColor} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ color: T.textMuted, fontSize: 13 }}>Cargando disponibilidad...</span>
              </div>
            )}

            {slotError && !loadingSlots && (
              <div style={s.errorBox}>
                <AlertCircle size={15} />
                {slotError}
              </div>
            )}

            {!loadingSlots && !slotError && slots.length > 0 && (
              <div style={s.slotsGrid}>
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => { setHorario(slot); setPaso(3); }}
                    style={{
                      ...s.slotBtn,
                      background: horario === slot ? rubroColor : T.surface4,
                      border:     `1px solid ${horario === slot ? rubroColor : T.border10}`,
                      color:      horario === slot ? "#fff" : T.textSecondary,
                    }}
                    onMouseEnter={e => {
                      if (horario !== slot) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = rubroColor;
                        (e.currentTarget as HTMLButtonElement).style.background = `${rubroColor}12`;
                      }
                    }}
                    onMouseLeave={e => {
                      if (horario !== slot) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = T.border10;
                        (e.currentTarget as HTMLButtonElement).style.background = T.surface4;
                      }
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PASO 3: Datos del cliente ── */}
        {paso === 3 && (
          <div style={s.card}>
            <button onClick={() => setPaso(2)} style={s.backBtn}>
              <ArrowLeft size={14} /> Cambiar horario
            </button>

            {/* Resumen */}
            <div style={s.resumenBox}>
              <div style={s.resumenRow}>
                <RubroIcon size={12} color={rubroColor} />
                <span>{servicio?.nombre}</span>
                {servicio?.precio && <span style={{ color: rubroColor, marginLeft: "auto" }}>{formatPrecio(servicio.precio)}</span>}
              </div>
              <div style={s.resumenRow}>
                <CalendarDays size={12} color={rubroColor} />
                <span>{fecha ? formatFecha(fecha) : ""}</span>
              </div>
              <div style={s.resumenRow}>
                <Clock size={12} color={rubroColor} />
                <span>{horario} hs · {servicio ? formatDuracion(servicio.duracionMin) : ""}</span>
              </div>
            </div>

            <div style={s.cardHead}>
              <div style={{ ...s.stepIcon, background: `${rubroColor}15`, border: `1px solid ${rubroColor}25` }}>
                <User size={16} color={rubroColor} />
              </div>
              <div>
                <h2 style={s.cardTitle}>Tus datos</h2>
                <p style={s.cardDesc}>Para confirmar tu turno</p>
              </div>
            </div>

            <div style={s.formGrid}>
              {/* Nombre */}
              <div style={s.formGroup}>
                <label style={s.label}>
                  <User size={13} /> Nombre y apellido *
                </label>
                <input
                  style={{ ...s.input, borderColor: errores.nombre ? "#ef4444" : T.border10 }}
                  placeholder="Tu nombre completo"
                  value={datos.nombre}
                  onChange={e => setDatos(d => ({ ...d, nombre: e.target.value }))}
                />
                {errores.nombre && <span style={s.fieldError}>{errores.nombre}</span>}
              </div>

              {/* Teléfono */}
              <div style={s.formGroup}>
                <label style={s.label}>
                  <Phone size={13} /> Teléfono / WhatsApp *
                </label>
                <input
                  style={{ ...s.input, borderColor: errores.telefono ? "#ef4444" : T.border10 }}
                  placeholder="Ej: 3816-123456"
                  type="tel"
                  value={datos.telefono}
                  onChange={e => setDatos(d => ({ ...d, telefono: e.target.value }))}
                />
                {errores.telefono && <span style={s.fieldError}>{errores.telefono}</span>}
              </div>

              {/* Email */}
              <div style={s.formGroup}>
                <label style={s.label}>
                  <Mail size={13} /> Email <span style={{ color: T.textFaint }}>(opcional)</span>
                </label>
                <input
                  style={{ ...s.input, borderColor: errores.email ? "#ef4444" : T.border10 }}
                  placeholder="tu@email.com"
                  type="email"
                  value={datos.email}
                  onChange={e => setDatos(d => ({ ...d, email: e.target.value }))}
                />
                {errores.email && <span style={s.fieldError}>{errores.email}</span>}
              </div>

              {/* Notas */}
              <div style={s.formGroup}>
                <label style={s.label}>
                  <MessageSquare size={13} /> Notas <span style={{ color: T.textFaint }}>(opcional)</span>
                </label>
                <textarea
                  style={{ ...s.input, height: 72, resize: "none" as const, paddingTop: 10 }}
                  placeholder="Alguna aclaración para el comercio..."
                  value={datos.notas}
                  onChange={e => setDatos(d => ({ ...d, notas: e.target.value }))}
                />
              </div>
            </div>

            {errorGlobal && (
              <div style={s.errorBox}>
                <AlertCircle size={15} />
                {errorGlobal}
              </div>
            )}

            <button
              onClick={confirmarReserva}
              disabled={cargando}
              style={{ ...s.btnConfirmar, background: rubroColor, opacity: cargando ? 0.7 : 1 }}
            >
              {cargando ? (
                <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Confirmando...</>
              ) : (
                <><CheckCircle2 size={16} /> Confirmar turno</>
              )}
            </button>
          </div>
        )}

        {/* ── PASO 4: Confirmación ── */}
        {paso === 4 && turnoCreado && (
          <div style={{ ...s.card, textAlign: "center" as const, padding: "2.5rem 1.75rem" }}>
            <div style={{ ...s.successRing, border: `2px solid ${rubroColor}` }}>
              <CheckCircle2 size={40} color={rubroColor} />
            </div>
            <h2 style={{ ...s.cardTitle, fontSize: "1.4rem", marginBottom: 8 }}>
              ¡Turno reservado!
            </h2>
            <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 24 }}>
              Tu reserva fue confirmada exitosamente.
            </p>

            <div style={{ ...s.resumenBox, textAlign: "left" as const, marginBottom: 28 }}>
              <div style={s.resumenRow}>
                <RubroIcon size={12} color={rubroColor} />
                <span><strong style={{ color: T.textPrimary }}>{servicio?.nombre}</strong></span>
              </div>
              <div style={s.resumenRow}>
                <CalendarDays size={12} color={rubroColor} />
                <span>{fecha ? formatFecha(fecha) : ""}</span>
              </div>
              <div style={s.resumenRow}>
                <Clock size={12} color={rubroColor} />
                <span>{horario} hs · {servicio ? formatDuracion(servicio.duracionMin) : ""}</span>
              </div>
              <div style={s.resumenRow}>
                <User size={12} color={rubroColor} />
                <span>{datos.nombre}</span>
              </div>
            </div>

            <p style={{ color: T.textFaint, fontSize: 12, marginBottom: 20 }}>
              Código de reserva: <code style={{ color: T.textMuted, fontFamily: "monospace" }}>#{turnoCreado.id.slice(-8).toUpperCase()}</code>
            </p>

            <button
              onClick={() => {
                setPaso(0); setServicio(null); setFecha(null);
                setHorario(null); setSlots([]); setDatos({ nombre: "", telefono: "", email: "", notas: "" });
                setTurnoCreado(null); setErrorGlobal("");
              }}
              style={{ ...s.btnSecundario, borderColor: `${rubroColor}40`, color: rubroColor }}
            >
              Reservar otro turno
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <footer style={s.footer}>
          <span>Powered by</span>
          <a href="/" style={{ color: "#3b82f6", fontWeight: 700, textDecoration: "none" }}>
            DevHub Turnos
          </a>
        </footer>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus, textarea:focus { outline: none; border-color: ${rubroColor} !important; }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}

// ── Tema (personalizable por tenant: colorReserva + temaReserva) ──

type Tokens = ReturnType<typeof crearTokens>;

function crearTokens(claro: boolean) {
  return claro
    ? {
        claro: true,
        bg: "#ffffff", card: "#ffffff",
        surface2: "#f4f4f5", surface3: "#f0f0f1", surface4: "#ececed",
        border005: "rgba(0,0,0,0.05)", border06: "rgba(0,0,0,0.06)",
        border07: "rgba(0,0,0,0.07)",  border08: "rgba(0,0,0,0.08)",
        border10: "rgba(0,0,0,0.10)",  border12: "rgba(0,0,0,0.12)",
        textPrimary: "#18181b", textSecondary: "#27272a", textTertiary: "#52525b",
        textMuted: "#6b7280", textFaint: "#9ca3af", textFainter: "#c4c4c8",
        errorText: "#dc2626",
      }
    : {
        claro: false,
        bg: "#0a0a0a", card: "#111111",
        surface2: "#141414", surface3: "#161616", surface4: "#191919",
        border005: "rgba(255,255,255,0.05)", border06: "rgba(255,255,255,0.06)",
        border07: "rgba(255,255,255,0.07)",  border08: "rgba(255,255,255,0.08)",
        border10: "rgba(255,255,255,0.10)",  border12: "rgba(255,255,255,0.12)",
        textPrimary: "#f4f4f5", textSecondary: "#e4e4e7", textTertiary: "#a1a1aa",
        textMuted: "#71717a", textFaint: "#52525b", textFainter: "#3f3f46",
        errorText: "#f87171",
      };
}

// ── Estilos ────────────────────────────────────────────────────

function crearEstilos(T: Tokens): Record<string, React.CSSProperties> {
  return {
  shell: {
    minHeight: "100vh", background: T.bg,
    display: "flex", justifyContent: "center",
    padding: "1.5rem 1rem 3rem", position: "relative", overflowX: "hidden",
  },
  bgBlob: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: "none", zIndex: 0,
  },
  wrap: {
    position: "relative", zIndex: 1,
    width: "100%", maxWidth: 520,
    display: "flex", flexDirection: "column", gap: 16,
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px",
    background: T.card, border: `1px solid ${T.border07}`, borderRadius: 16,
  },
  headerInner: { display: "flex", alignItems: "center", gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 12, objectFit: "cover" },
  logoFallback: {
    width: 44, height: 44, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  headerNombre: { margin: 0, fontSize: 15, fontWeight: 700, color: T.textPrimary },
  headerSub:    { margin: 0, fontSize: 12, color: T.textMuted, display: "flex", alignItems: "center" },
  igLink: {
    width: 32, height: 32, borderRadius: 8,
    background: T.border005, border: `1px solid ${T.border08}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: T.textMuted, textDecoration: "none",
  },
  progressWrap: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
    padding: "12px 16px",
    background: T.card, border: `1px solid ${T.border07}`, borderRadius: 12,
  },
  progressStep: { display: "flex", alignItems: "center", gap: 6 },
  progressDot: {
    width: 8, height: 8, borderRadius: "50%", transition: "all 0.2s",
  },
  progressLine: { width: 28, height: 1, margin: "0 4px" },
  progressLabel: { fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" as const },
  card: {
    background: T.card, border: `1px solid ${T.border08}`,
    borderRadius: 20, padding: "1.5rem",
    display: "flex", flexDirection: "column", gap: 16,
  },
  cardHead: { display: "flex", alignItems: "flex-start", gap: 12 },
  stepIcon: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  cardTitle: { margin: 0, fontSize: "1.1rem", fontWeight: 700, color: T.textPrimary },
  cardDesc:  { margin: "2px 0 0", fontSize: 12, color: T.textMuted },
  backBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "transparent", border: "none",
    color: T.textFaint, fontSize: 12, cursor: "pointer",
    padding: "0 0 4px", width: "fit-content",
  },
  seleccionada: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const,
    padding: "8px 12px", background: T.surface3,
    border: `1px solid ${T.border07}`, borderRadius: 10,
    fontSize: 13,
  },
  serviciosGrid: { display: "flex", flexDirection: "column", gap: 8 },
  servicioCard: {
    background: T.surface4, border: `1px solid ${T.border08}`, borderRadius: 14,
    padding: "14px 16px", textAlign: "left" as const, cursor: "pointer",
    transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 4,
  },
  servicioTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  servicioNombre: { fontSize: 14, fontWeight: 600, color: T.textPrimary },
  servicioPrecio: { fontSize: 14, fontWeight: 700 },
  servicioDesc:   { margin: 0, fontSize: 12, color: T.textMuted },
  servicioDuracion: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 11, color: T.textFaint, marginTop: 4,
  },
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 8, padding: "2rem", color: T.textFaint, fontSize: 13,
  },
  calendar: { background: T.surface2, borderRadius: 14, padding: "14px 12px", border: `1px solid ${T.border07}` },
  calNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  calNavBtn: {
    background: T.border005, border: `1px solid ${T.border08}`,
    borderRadius: 8, padding: 6, color: T.textTertiary, cursor: "pointer",
    display: "flex", alignItems: "center",
  },
  calMes: { fontSize: 13, fontWeight: 600, color: T.textPrimary },
  calDiasHeader: {
    display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: 8, textAlign: "center" as const,
  },
  calDiaLabel: { fontSize: 11, color: T.textFaint, fontWeight: 600, padding: "4px 0" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 },
  calDia: {
    aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, fontSize: 13, border: "1px solid transparent",
    transition: "all 0.12s",
  },
  slotsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: 8,
  },
  slotBtn: {
    padding: "10px 8px", borderRadius: 10, fontSize: 13,
    fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
    textAlign: "center" as const,
  },
  loadingWrap: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 10, padding: "2rem",
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 14px", background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10,
    color: T.errorText, fontSize: 13,
  },
  resumenBox: {
    background: T.surface2, border: `1px solid ${T.border07}`,
    borderRadius: 12, padding: "12px 14px",
    display: "flex", flexDirection: "column", gap: 8,
  },
  resumenRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.textTertiary },
  formGrid: { display: "flex", flexDirection: "column", gap: 12 },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 12, color: T.textMuted, fontWeight: 500,
    display: "flex", alignItems: "center", gap: 5,
  },
  input: {
    width: "100%", padding: "10px 12px",
    background: T.surface2, border: `1px solid ${T.border10}`,
    borderRadius: 10, color: T.textPrimary, fontSize: 14,
    fontFamily: "inherit", transition: "border-color 0.15s",
  },
  fieldError: { fontSize: 11, color: T.errorText },
  btnConfirmar: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px 24px", borderRadius: 12, border: "none",
    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
    transition: "opacity 0.15s",
  },
  btnSecundario: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "10px 20px", borderRadius: 10, background: "transparent",
    border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  successRing: {
    width: 80, height: 80, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
    background: T.claro ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.06)",
  },
  footer: {
    textAlign: "center" as const, fontSize: 12, color: T.textFainter,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    paddingTop: 8,
  },
  };
}