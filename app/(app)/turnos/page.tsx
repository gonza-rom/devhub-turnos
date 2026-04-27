// app/(app)/turnos/page.tsx
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import TurnosClient from "./TurnosClient";

export default async function TurnosPage() {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id")!;

  const [turnos, servicios] = await Promise.all([
    prisma.turno.findMany({
      where:   { tenantId },
      include: { servicio: { select: { nombre: true, precio: true, duracionMin: true } } },
      orderBy: { fechaHora: "asc" },
    }),
    prisma.servicioTurno.findMany({
      where:   { tenantId, activo: true },
      select:  { id: true, nombre: true, duracionMin: true, precio: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  return (
    <TurnosClient
      turnosIniciales={turnos.map(t => ({
        id:               t.id,
        clienteNombre:    t.clienteNombre,
        clienteTelefono:  t.clienteTelefono,
        clienteEmail:     t.clienteEmail,
        fechaHora:        t.fechaHora.toISOString(),
        duracionMin:      t.duracionMin,
        estado:           t.estado,
        servicioId:       t.servicioId,
        servicio:         t.servicio.nombre,
        precio:           t.servicio.precio,
        notasCliente:     t.notasCliente,
        notasAdmin:       t.notasAdmin,
        canceladoAt:      t.canceladoAt?.toISOString() ?? null,
        motivoCancelacion: t.motivoCancelacion,
      }))}
      servicios={servicios.map(s => ({
        id:          s.id,
        nombre:      s.nombre,
        duracionMin: s.duracionMin,
        precio:      s.precio,
      }))}
    />
  );
}