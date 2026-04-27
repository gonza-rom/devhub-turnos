// app/api/servicios/[id]/route.ts
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

    const body = await req.json();

    // Verificar que pertenece al tenant
    const existente = await prisma.servicioTurno.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existente) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

    const servicio = await prisma.servicioTurno.update({
      where: { id: params.id },
      data: {
        ...(body.nombre      !== undefined && { nombre:      body.nombre.trim() }),
        ...(body.descripcion !== undefined && { descripcion: body.descripcion?.trim() || null }),
        ...(body.precio      !== undefined && { precio:      body.precio ? parseFloat(body.precio) : null }),
        ...(body.duracionMin !== undefined && { duracionMin: parseInt(body.duracionMin) }),
        ...(body.activo      !== undefined && { activo:      body.activo }),
        ...(body.orden       !== undefined && { orden:       body.orden }),
      },
    });

    return NextResponse.json({ ok: true, servicio });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Verificar que pertenece al tenant
    const existente = await prisma.servicioTurno.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existente) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

    // Verificar que no tenga turnos futuros asociados
    const turnosFuturos = await prisma.turno.count({
      where: {
        servicioId: params.id,
        fechaHora:  { gte: new Date() },
        estado:     { notIn: ["CANCELADO", "COMPLETADO"] },
      },
    });

    if (turnosFuturos > 0) {
      return NextResponse.json({
        error: `Este servicio tiene ${turnosFuturos} turno(s) futuro(s) activo(s). Cancelalos primero o desactivá el servicio.`,
      }, { status: 409 });
    }

    await prisma.servicioTurno.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}