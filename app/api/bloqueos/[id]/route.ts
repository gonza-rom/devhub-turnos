// app/api/bloqueos/[id]/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  context: any
) {
  try {
    const id = context.params.id;
    
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await prisma.bloqueoHorario.findFirst({
      where: { id, tenantId },
    });
    if (!existente) return NextResponse.json({ error: "Bloqueo no encontrado" }, { status: 404 });

    await prisma.bloqueoHorario.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}