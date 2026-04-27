// app/api/servicios/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const servicios = await prisma.servicioTurno.findMany({
      where:   { tenantId, activo: true },
      orderBy: { orden: "asc" },
    });

    return NextResponse.json({ ok: true, servicios });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { nombre, descripcion, precio, duracionMin, orden } = await req.json();

    if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    if (!duracionMin || duracionMin < 1) return NextResponse.json({ error: "La duración es requerida" }, { status: 400 });

    const servicio = await prisma.servicioTurno.create({
      data: {
        tenantId,
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precio:      precio ? parseFloat(precio) : null,
        duracionMin: parseInt(duracionMin),
        orden:       orden ?? 0,
        activo:      true,
      },
    });

    return NextResponse.json({ ok: true, servicio }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}