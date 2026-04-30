"use client";
// app/(app)/dashboard/DashboardClient.tsx

import { useState } from "react";
import {
  CalendarDays, Clock, CheckCircle2, XCircle,
  AlertCircle, TrendingUp, Scissors, ChevronRight,
  Phone, User,Briefcase
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────

type TurnoHoy = {
  id:              string;
  clienteNombre:   string;
  clienteTelefono: string;
  fechaHora:       string;
  duracionMin:     number;
  estado:          string;
  servicio:        string;
  precio:          number | null;
  notasCliente:    string | null;
};

type Stats = {
  turnosHoy:        number;
  confirmadosHoy:   number;
  pendientesHoy:    number;
  canceladosHoy:    number;
  turnosPendientes: number;
  totalMes:         number;
  serviciosActivos: number;
};

type Props = {
  turnosHoy: TurnoHoy[];
  stats:     Stats;
};

// ── Helpers ───────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  PENDIENTE:  { label: "Pendiente",  color: "#fbbf24", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  icon: AlertCircle  },
  CONFIRMADO: { label: "Confirmado", color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)",   icon: CheckCircle2 },
  CANCELADO:  { label: "Cancelado",  color: "#f87171", bg: "rgba(220,38,38,0.08)",  border: "rgba(220,38,38,0.2)",    icon: XCircle      },
  COMPLETADO: { label: "Completado", color: "#60a5fa", bg: "rgba(30,64,175,0.1)",   border: "rgba(30,64,175,0.25)",   icon: CheckCircle2 },
  AUSENTE:    { label: "Ausente",    color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.2)", icon: XCircle      },
};

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

// ── Componente ────────────────────────────────────────────────

export default function DashboardClient({ turnosHoy, stats }: Props) {
  const [filtro, setFiltro] = useState<string>("TODOS");

  const turnosFiltrados = filtro === "TODOS"
    ? turnosHoy
    : turnosHoy.filter(t => t.estado === filtro);

  const hoy = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, textTransform: "capitalize" }}>
          {formatFecha(hoy.toISOString())}
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard
          icon={CalendarDays}
          label="Turnos hoy"
          valor={stats.turnosHoy}
          color="#3b82f6"
        />
        <StatCard
          icon={CheckCircle2}
          label="Confirmados"
          valor={stats.confirmadosHoy}
          color="#22c55e"
        />
        <StatCard
          icon={AlertCircle}
          label="Pendientes"
          valor={stats.turnosPendientes}
          color="#fbbf24"
          alerta={stats.turnosPendientes > 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Turnos del mes"
          valor={stats.totalMes}
          color="#8b5cf6"
        />
        <StatCard
          icon={Briefcase}
          label="Servicios"
          valor={stats.serviciosActivos}
          color="#1e40af"
        />
      </div>

      {/* ── Turnos de hoy ── */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-base)",
        borderRadius: 16, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={16} color="#3b82f6" />
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
              Turnos de hoy
            </span>
            {turnosHoy.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: "rgba(30,64,175,0.12)", color: "#60a5fa",
                border: "1px solid rgba(30,64,175,0.25)",
              }}>
                {turnosHoy.length}
              </span>
            )}
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["TODOS", "PENDIENTE", "CONFIRMADO", "COMPLETADO", "CANCELADO"].map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  background: filtro === f ? "#1e40af" : "transparent",
                  color: filtro === f ? "#fff" : "var(--text-muted)",
                  border: filtro === f ? "1px solid #1e40af" : "1px solid var(--border-md)",
                }}
              >
                {f === "TODOS" ? "Todos" : ESTADO_CONFIG[f]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {turnosFiltrados.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <CalendarDays size={32} color="var(--text-faint)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              {turnosHoy.length === 0
                ? "No hay turnos para hoy"
                : "No hay turnos con este filtro"}
            </p>
          </div>
        ) : (
          <div>
            {turnosFiltrados.map((turno, i) => {
              const estado = ESTADO_CONFIG[turno.estado] ?? ESTADO_CONFIG.PENDIENTE;
              const IconEstado = estado.icon;
              return (
                <div
                  key={turno.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "14px 20px",
                    borderBottom: i < turnosFiltrados.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  {/* Hora */}
                  <div style={{ minWidth: 52, textAlign: "center" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {formatHora(turno.fechaHora)}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text-faint)", margin: 0 }}>
                      {turno.duracionMin}min
                    </p>
                  </div>

                  {/* Línea vertical */}
                  <div style={{ width: 2, height: 36, borderRadius: 99, background: estado.color, opacity: 0.5, flexShrink: 0 }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <User size={12} color="var(--text-faint)" />
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {turno.clienteNombre}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                        {turno.servicio}
                      </p>
                      {turno.precio && (
                        <>
                          <span style={{ color: "var(--text-faint)", fontSize: 10 }}>·</span>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                            ${turno.precio.toLocaleString("es-AR")}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Teléfono */}
                  <a
                    href={`https://wa.me/54${turno.clienteTelefono.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 8,
                      background: "rgba(34,197,94,0.08)",
                      border: "1px solid rgba(34,197,94,0.2)",
                      color: "#4ade80", fontSize: 11, fontWeight: 600,
                      textDecoration: "none", flexShrink: 0,
                    }}
                  >
                    <Phone size={11} />
                    WA
                  </a>

                  {/* Estado */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 8,
                    background: estado.bg, border: `1px solid ${estado.border}`,
                    flexShrink: 0,
                  }}>
                    <IconEstado size={11} color={estado.color} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: estado.color }}>
                      {estado.label}
                    </span>
                  </div>

                  <ChevronRight size={14} color="var(--text-faint)" style={{ flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Acceso rápido ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <QuickAction href="/turnos"    icon={CalendarDays} label="Ver todos los turnos"  desc="Gestionar y confirmar" color="#3b82f6" />
        <QuickAction href="/servicios" icon={Briefcase}     label="Configurar servicios"  desc="Precios y duración"    color="#8b5cf6" />
        <QuickAction href="/horarios"  icon={Clock}        label="Horarios de atención"  desc="Días y horas"          color="#1e40af" />
      </div>

    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({ icon: Icon, label, valor, color, alerta }: {
  icon: React.ElementType; label: string; valor: number; color: string; alerta?: boolean;
}) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: `1px solid ${alerta && valor > 0 ? "rgba(245,158,11,0.3)" : "var(--border-base)"}`,
      borderRadius: 12, padding: "16px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: `${color}18`, border: `1px solid ${color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1 }}>
          {valor}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Quick Action ──────────────────────────────────────────────

function QuickAction({ href, icon: Icon, label, desc, color }: {
  href: string; icon: React.ElementType; label: string; desc: string; color: string;
}) {
  return (
    <a
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px", borderRadius: 12,
        background: "var(--bg-card)", border: "1px solid var(--border-base)",
        textDecoration: "none", transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = color;
        (e.currentTarget as HTMLElement).style.background = `${color}08`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-base)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${color}15`, border: `1px solid ${color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>{desc}</p>
      </div>
      <ChevronRight size={14} color="var(--text-faint)" style={{ marginLeft: "auto", flexShrink: 0 }} />
    </a>
  );
}