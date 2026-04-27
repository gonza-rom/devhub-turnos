// app/api/configuracion/logo/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });

    await prisma.tenant.update({
      where: { id: tenantId },
      data:  { logoUrl: url },
    });

    return NextResponse.json({ ok: true, logoUrl: url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}