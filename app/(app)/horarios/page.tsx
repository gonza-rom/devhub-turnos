// app/(app)/horarios/page.tsx
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import HorariosClient from "./HorariosClient";

export default async function HorariosPage() {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id")!;

  const [horarios, bloqueos] = await Promise.all([
    prisma.horarioDisponible.findMany({
      where:   { tenantId },
      orderBy: { diaSemana: "asc" },
    }),
    prisma.bloqueoHorario.findMany({
      where:   { tenantId, fechaHasta: { gte: new Date() } },
      orderBy: { fechaDesde: "asc" },
    }),
  ]);

  // Asegurar que los 7 días estén presentes
  const diasCompletos = Array.from({ length: 7 }, (_, i) => {
    const existente = horarios.find(h => h.diaSemana === i);
    return existente ?? {
      id:         "",
      tenantId,
      diaSemana:  i,
      horaInicio: "09:00",
      horaFin:    "18:00",
      activo:     false,
    };
  });

  return (
    <HorariosClient
      horariosIniciales={diasCompletos.map(h => ({
        id:         h.id,
        diaSemana:  h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin:    h.horaFin,
        activo:     h.activo,
      }))}
      bloqueosIniciales={bloqueos.map(b => ({
        id:         b.id,
        fechaDesde: b.fechaDesde.toISOString(),
        fechaHasta: b.fechaHasta.toISOString(),
        motivo:     b.motivo,
      }))}
    />
  );
}