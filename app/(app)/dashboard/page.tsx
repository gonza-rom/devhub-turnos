// app/(app)/dashboard/page.tsx
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id")!;

  const hoy       = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

  const [turnosHoy, turnosPendientes, totalTurnos, servicios] = await Promise.all([
    // Turnos de hoy
    prisma.turno.findMany({
      where: {
        tenantId,
        fechaHora: { gte: inicioDia, lte: finDia },
      },
      include: { servicio: { select: { nombre: true, precio: true } } },
      orderBy: { fechaHora: "asc" },
    }),

    // Pendientes de confirmar
    prisma.turno.count({
      where: { tenantId, estado: "PENDIENTE" },
    }),

    // Total del mes
    prisma.turno.count({
      where: {
        tenantId,
        fechaHora: {
          gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
          lte: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0),
        },
      },
    }),

    // Servicios activos
    prisma.servicioTurno.count({
      where: { tenantId, activo: true },
    }),
  ]);

  const confirmadosHoy  = turnosHoy.filter(t => t.estado === "CONFIRMADO").length;
  const pendientesHoy   = turnosHoy.filter(t => t.estado === "PENDIENTE").length;
  const canceladosHoy   = turnosHoy.filter(t => t.estado === "CANCELADO").length;

  return (
    <DashboardClient
      turnosHoy={turnosHoy.map(t => ({
        id:              t.id,
        clienteNombre:   t.clienteNombre,
        clienteTelefono: t.clienteTelefono,
        fechaHora:       t.fechaHora.toISOString(),
        duracionMin:     t.duracionMin,
        estado:          t.estado,
        servicio:        t.servicio.nombre,
        precio:          t.servicio.precio,
        notasCliente:    t.notasCliente,
      }))}
      stats={{
        turnosHoy:       turnosHoy.length,
        confirmadosHoy,
        pendientesHoy,
        canceladosHoy,
        turnosPendientes,
        totalMes:        totalTurnos,
        serviciosActivos: servicios,
      }}
    />
  );
}