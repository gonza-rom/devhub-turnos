// app/api/onboarding/servicios/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { servicios } = await req.json();
    if (!Array.isArray(servicios) || servicios.length === 0) {
      return NextResponse.json({ error: "Servicios inválidos" }, { status: 400 });
    }

    // Eliminar servicios anteriores del onboarding si los hubiera
    await prisma.servicioTurno.deleteMany({ where: { tenantId } });

    // Crear los nuevos
    await prisma.servicioTurno.createMany({
      data: servicios.map((s: { nombre: string; descripcion?: string; precio?: string; duracionMin: string }, i: number) => ({
        tenantId,
        nombre:      s.nombre.trim(),
        descripcion: s.descripcion?.trim() || null,
        precio:      s.precio ? parseFloat(s.precio) : null,
        duracionMin: parseInt(s.duracionMin),
        orden:       i,
        activo:      true,
      })),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}