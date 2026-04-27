// app/api/bloqueos/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { fechaDesde, fechaHasta, motivo } = await req.json();
    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json({ error: "Las fechas son requeridas" }, { status: 400 });
    }

    const bloqueo = await prisma.bloqueoHorario.create({
      data: {
        tenantId,
        fechaDesde: new Date(fechaDesde),
        fechaHasta: new Date(fechaHasta),
        motivo:     motivo?.trim() || null,
      },
    });

    return NextResponse.json({
      ok: true,
      bloqueo: {
        id:         bloqueo.id,
        fechaDesde: bloqueo.fechaDesde.toISOString(),
        fechaHasta: bloqueo.fechaHasta.toISOString(),
        motivo:     bloqueo.motivo,
      },
    }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}