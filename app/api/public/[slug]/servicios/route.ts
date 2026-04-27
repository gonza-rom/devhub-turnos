// app/api/public/[slug]/servicios/route.ts
// Servicios activos del tenant — público, sin auth

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where:  { slug, activo: true },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Comercio no encontrado" }, { status: 404 });
    }

    const servicios = await prisma.servicioTurno.findMany({
      where:   { tenantId: tenant.id, activo: true },
      orderBy: { orden: "asc" },
      select: {
        id:          true,
        nombre:      true,
        descripcion: true,
        precio:      true,
        duracionMin: true,
      },
    });

    return NextResponse.json({ ok: true, data: servicios });
  } catch (err) {
    console.error("[GET /api/public/[slug]/servicios]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";