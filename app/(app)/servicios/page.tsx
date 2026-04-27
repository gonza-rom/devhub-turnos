// app/(app)/servicios/page.tsx
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import ServiciosClient from "./ServiciosClient";

export default async function ServiciosPage() {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id")!;

  const servicios = await prisma.servicioTurno.findMany({
    where:   { tenantId },
    orderBy: { orden: "asc" },
  });

  return (
    <ServiciosClient
      serviciosIniciales={servicios.map(s => ({
        id:          s.id,
        nombre:      s.nombre,
        descripcion: s.descripcion,
        precio:      s.precio,
        duracionMin: s.duracionMin,
        activo:      s.activo,
        orden:       s.orden,
      }))}
    />
  );
}