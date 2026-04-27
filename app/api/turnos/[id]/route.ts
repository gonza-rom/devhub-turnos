// app/api/turnos/[id]/route.ts
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

    const { fechaHora, servicioId, duracionMin, notasAdmin } = await req.json();

    // Verificar que el turno pertenece al tenant
    const turno = await prisma.turno.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!turno) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

    const turnoActualizado = await prisma.turno.update({
      where: { id: params.id },
      data: {
        ...(fechaHora  && { fechaHora: new Date(fechaHora) }),
        ...(servicioId && { servicioId }),
        ...(duracionMin && { duracionMin: parseInt(duracionMin) }),
        ...(notasAdmin !== undefined && { notasAdmin }),
      },
      include: {
        servicio: { select: { nombre: true, precio: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      turno: {
        ...turnoActualizado,
        fechaHora: turnoActualizado.fechaHora.toISOString(),
        servicio:  turnoActualizado.servicio.nombre,
        precio:    turnoActualizado.servicio.precio,
        canceladoAt: turnoActualizado.canceladoAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}