// app/api/turnos/[id]/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { reprogramarTurnoSinSolapamiento, TurnoSolapadoError } from "@/lib/reservas";

export async function PATCH(req: Request, context: any) {
  try {
    const id          = context.params.id;
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { fechaHora, servicioId, duracionMin, notasAdmin } = await req.json();

    let turnoActualizado;
    try {
      turnoActualizado = await reprogramarTurnoSinSolapamiento({
        turnoId:     id,
        tenantId,
        ...(fechaHora   && { fechaHora: new Date(fechaHora) }),
        ...(servicioId  && { servicioId }),
        ...(duracionMin && { duracionMin: parseInt(duracionMin) }),
        ...(notasAdmin !== undefined && { notasAdmin }),
      });
    } catch (e) {
      if (e instanceof TurnoSolapadoError) {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }
    if (!turnoActualizado) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      turno: {
        ...turnoActualizado,
        fechaHora:   turnoActualizado.fechaHora.toISOString(),
        servicio:    turnoActualizado.servicio.nombre,
        precio:      turnoActualizado.servicio.precio,
        canceladoAt: turnoActualizado.canceladoAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    const id          = context.params.id;
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const turno = await prisma.turno.findFirst({
      where: { id, tenantId },
    });
    if (!turno) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

    await prisma.turno.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}