// app/api/public/[slug]/route.ts
// Info pública del tenant: nombre, rubro, logo, descripción, etc.
// No requiere autenticación — usada por el frontend externo de reservas

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
      select: {
        id:          true,
        nombre:      true,
        rubro:       true,
        descripcion: true,
        logoUrl:     true,
        telefono:    true,
        instagram:   true,
        facebook:    true,
        sitioWeb:    true,
        ciudad:      true,
        provincia:   true,
        slug:        true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Comercio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: tenant });
  } catch (err) {
    console.error("[GET /api/public/[slug]]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";