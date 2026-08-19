// app/reservar/[slug]/page.tsx
// Página pública de reservas — accesible desde cualquier sitio web del comercio
// URL: /reservar/[slug]
// No requiere login del cliente

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReservarClient from "./ReservarClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where:  { slug, activo: true },
    select: { nombre: true, descripcion: true, logoUrl: true },
  });
  if (!tenant) return { title: "Reservar turno" };
  return {
    title:       `Reservar turno — ${tenant.nombre}`,
    description: tenant.descripcion ?? `Reservá tu turno en ${tenant.nombre}`,
    openGraph: {
      title:       `Reservar en ${tenant.nombre}`,
      description: tenant.descripcion ?? `Reservá tu turno en ${tenant.nombre}`,
      images:      tenant.logoUrl ? [tenant.logoUrl] : [],
    },
  };
}

export default async function ReservarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where:  { slug, activo: true },
    select: {
      id:            true,
      nombre:        true,
      slug:          true,
      rubro:         true,
      colorReserva:  true,
      temaReserva:   true,
      descripcion:   true,
      logoUrl:       true,
      telefono:      true,
      ciudad:        true,
      provincia:     true,
      instagram:     true,
    },
  });

  if (!tenant) notFound();

  const servicios = await prisma.servicioTurno.findMany({
    where:   { tenantId: tenant.id, activo: true },
    orderBy: { orden: "asc" },
    select:  { id: true, nombre: true, descripcion: true, precio: true, duracionMin: true },
  });

  return (
    <ReservarClient
      tenant={tenant}
      serviciosIniciales={servicios}
    />
  );
}