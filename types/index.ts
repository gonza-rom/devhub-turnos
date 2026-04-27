// types/index.ts
import type {
  Tenant, UsuarioTenant, PlanTipo, RolTenant,
  ServicioTurno, Turno, EstadoTurno, HorarioDisponible,
  HorarioFranja, BloqueoHorario, Suscripcion, RubroTipo,
} from "@prisma/client";

// Re-export tipos de Prisma
export type {
  Tenant, UsuarioTenant, PlanTipo, RolTenant,
  ServicioTurno, Turno, EstadoTurno, HorarioDisponible,
  HorarioFranja, BloqueoHorario, Suscripcion, RubroTipo,
};

// ── Respuesta estándar API ────────────────────────────────────

export type ApiResponse<T = null> = {
  ok:     boolean;
  data?:  T;
  error?: string;
};

// ── Sesión ────────────────────────────────────────────────────

export type SesionUsuario = {
  supabaseId: string;
  tenantId:   string;
  nombre:     string;
  email:      string;
  rol:        RolTenant;
};

// ── Turno con relaciones ──────────────────────────────────────

export type TurnoConServicio = Turno & {
  servicio: Pick<ServicioTurno, "id" | "nombre" | "precio" | "duracionMin">;
};

// ── Horario con franjas ───────────────────────────────────────

export type HorarioConFranjas = HorarioDisponible & {
  franjas: HorarioFranja[];
};

// ── Input para crear turno ────────────────────────────────────

export type CreateTurnoInput = {
  servicioId:      string;
  clienteNombre:   string;
  clienteTelefono: string;
  clienteEmail?:   string;
  fechaHora:       string;
  notasCliente?:   string;
  notasAdmin?:     string;
};

// ── Input para crear servicio ─────────────────────────────────

export type CreateServicioInput = {
  nombre:      string;
  descripcion?: string;
  precio?:     number;
  duracionMin: number;
  orden?:      number;
};