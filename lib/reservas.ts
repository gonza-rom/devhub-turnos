// lib/reservas.ts
// Creación y reprogramación de turnos sin solapamiento, a prueba de
// condiciones de carrera: dos requests concurrentes para el mismo
// horario ya no pueden pasar ambas la validación.
//
// Se logra con un advisory lock de Postgres (pg_advisory_xact_lock),
// tomado dentro de la misma transacción, con hashtext(tenantId) como
// clave. Eso serializa el "verificar solapamiento + crear/actualizar"
// por tenant: la segunda request espera a que la primera termine (y
// libere el lock al cerrar la transacción) antes de correr su propio
// chequeo, así que siempre ve el turno recién creado por la primera.

import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export class TurnoSolapadoError extends Error {
  constructor() {
    super("El horario ya no está disponible. Por favor elegí otro.");
    this.name = "TurnoSolapadoError";
  }
}

const ESTADOS_OCUPAN_HORARIO = ["PENDIENTE", "CONFIRMADO"] as const;

async function haySolapamiento(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; fechaHora: Date; duracionMin: number; excluirTurnoId?: string }
): Promise<boolean> {
  const { tenantId, fechaHora, duracionMin, excluirTurnoId } = params;
  const fin = new Date(fechaHora.getTime() + duracionMin * 60 * 1000);

  const turnos = await tx.turno.findMany({
    where: {
      tenantId,
      estado: { in: [...ESTADOS_OCUPAN_HORARIO] },
      ...(excluirTurnoId ? { id: { not: excluirTurnoId } } : {}),
      fechaHora: {
        gte: new Date(fechaHora.getTime() - 24 * 60 * 60 * 1000),
        lt:  fin,
      },
    },
    select: { fechaHora: true, duracionMin: true },
  });

  return turnos.some((t) => {
    const tFin = new Date(t.fechaHora.getTime() + t.duracionMin * 60 * 1000);
    return t.fechaHora < fin && tFin > fechaHora;
  });
}

async function conLockDeTenant<T>(
  tx: Prisma.TransactionClient,
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
  return fn();
}

// ── Crear ────────────────────────────────────────────────────────

export type CrearTurnoInput = {
  tenantId:         string;
  servicioId:       string;
  fechaHora:        Date;
  duracionMin:      number;
  clienteNombre:    string;
  clienteTelefono:  string;
  clienteEmail?:    string | null;
  notasCliente?:    string | null;
  notasAdmin?:      string | null;
};

export async function crearTurnoSinSolapamiento(input: CrearTurnoInput) {
  return prisma.$transaction(async (tx) =>
    conLockDeTenant(tx, input.tenantId, async () => {
      if (await haySolapamiento(tx, input)) throw new TurnoSolapadoError();

      return tx.turno.create({
        data: {
          tenantId:        input.tenantId,
          servicioId:      input.servicioId,
          clienteNombre:   input.clienteNombre,
          clienteTelefono: input.clienteTelefono,
          clienteEmail:    input.clienteEmail ?? null,
          fechaHora:       input.fechaHora,
          duracionMin:     input.duracionMin,
          estado:          "PENDIENTE",
          notasCliente:    input.notasCliente ?? null,
          notasAdmin:      input.notasAdmin ?? null,
        },
        include: { servicio: { select: { nombre: true, precio: true } } },
      });
    })
  );
}

// ── Reprogramar ──────────────────────────────────────────────────

export type ReprogramarTurnoInput = {
  turnoId:      string;
  tenantId:     string;
  fechaHora?:   Date;
  duracionMin?: number;
  servicioId?:  string;
  notasAdmin?:  string | null;
};

export async function reprogramarTurnoSinSolapamiento(input: ReprogramarTurnoInput) {
  return prisma.$transaction(async (tx) =>
    conLockDeTenant(tx, input.tenantId, async () => {
      const actual = await tx.turno.findFirst({
        where: { id: input.turnoId, tenantId: input.tenantId },
      });
      if (!actual) return null;

      const fechaHora   = input.fechaHora   ?? actual.fechaHora;
      const duracionMin = input.duracionMin ?? actual.duracionMin;

      if (input.fechaHora || input.duracionMin) {
        const solapa = await haySolapamiento(tx, {
          tenantId:       input.tenantId,
          fechaHora,
          duracionMin,
          excluirTurnoId: input.turnoId,
        });
        if (solapa) throw new TurnoSolapadoError();
      }

      return tx.turno.update({
        where: { id: input.turnoId },
        data: {
          ...(input.fechaHora           ? { fechaHora }   : {}),
          ...(input.servicioId          ? { servicioId: input.servicioId } : {}),
          ...(input.duracionMin         ? { duracionMin } : {}),
          ...(input.notasAdmin !== undefined ? { notasAdmin: input.notasAdmin } : {}),
        },
        include: { servicio: { select: { nombre: true, precio: true } } },
      });
    })
  );
}
