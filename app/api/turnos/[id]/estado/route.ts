// app/api/turnos/[id]/estado/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { estado, motivoCancelacion } = await req.json();

    const estadosValidos = ["PENDIENTE", "CONFIRMADO", "COMPLETADO", "CANCELADO", "AUSENTE"];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    // Verificar que el turno pertenece al tenant
    const turno = await prisma.turno.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!turno) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

    const turnoActualizado = await prisma.turno.update({
      where: { id: params.id },
      data: {
        estado,
        ...(estado === "CANCELADO" && {
          canceladoAt:      new Date(),
          motivoCancelacion: motivoCancelacion ?? null,
        }),
      },
    });

    return NextResponse.json({ ok: true, turno: turnoActualizado });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}