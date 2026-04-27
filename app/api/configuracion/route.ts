// app/api/configuracion/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: {
        id:          true,
        nombre:      true,
        slug:        true,
        email:       true,
        telefono:    true,
        direccion:   true,
        ciudad:      true,
        provincia:   true,
        descripcion: true,
        logoUrl:     true,
        instagram:   true,
        facebook:    true,
        sitioWeb:    true,
        rubro:       true,
        plan:        true,
      },
    });

    if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, data: tenant });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();

    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: "El nombre del negocio es obligatorio" }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        nombre:      body.nombre.trim(),
        telefono:    body.telefono?.trim()    || null,
        direccion:   body.direccion?.trim()   || null,
        ciudad:      body.ciudad?.trim()      || null,
        provincia:   body.provincia?.trim()   || null,
        descripcion: body.descripcion?.trim() || null,
        instagram:   body.instagram?.trim()   || null,
        facebook:    body.facebook?.trim()    || null,
        sitioWeb:    body.sitioWeb?.trim()    || null,
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      },
      select: {
        id:          true,
        nombre:      true,
        slug:        true,
        logoUrl:     true,
        telefono:    true,
        direccion:   true,
        ciudad:      true,
        provincia:   true,
        descripcion: true,
        instagram:   true,
        facebook:    true,
        sitioWeb:    true,
        rubro:       true,
      },
    });

    return NextResponse.json({ ok: true, data: tenant });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}