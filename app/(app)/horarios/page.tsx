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
      include: {
        franjas: {
          orderBy: { orden: "asc" },
        },
      },
    }),
    prisma.bloqueoHorario.findMany({
      where:   { tenantId, fechaHasta: { gte: new Date() } },
      orderBy: { fechaDesde: "asc" },
    }),
  ]);

  // Asegurar los 7 días, con franjas vacías si no existen
  const diasCompletos = Array.from({ length: 7 }, (_, i) => {
    const existente = horarios.find(h => h.diaSemana === i);
    if (existente) {
      return {
        id:        existente.id,
        diaSemana: existente.diaSemana,
        activo:    existente.activo,
        franjas:   existente.franjas.map(f => ({
          id:         f.id,
          horaInicio: f.horaInicio,
          horaFin:    f.horaFin,
          orden:      f.orden,
        })),
      };
    }
    return {
      id:        "",
      diaSemana: i,
      activo:    false,
      franjas:   [],
    };
  });

  return (
    <HorariosClient
      horariosIniciales={diasCompletos}
      bloqueosIniciales={bloqueos.map(b => ({
        id:         b.id,
        fechaDesde: b.fechaDesde.toISOString(),
        fechaHasta: b.fechaHasta.toISOString(),
        motivo:     b.motivo,
      }))}
    />
  );
}