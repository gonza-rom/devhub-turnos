// app/api/turnos/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { crearTurnoSinSolapamiento, TurnoSolapadoError } from "@/lib/reservas";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { clienteNombre, clienteTelefono, clienteEmail, servicioId, fechaHora, notasAdmin } = await req.json();

    if (!clienteNombre?.trim() || !clienteTelefono?.trim() || !servicioId || !fechaHora) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    // Verificar que el servicio pertenece al tenant
    const servicio = await prisma.servicioTurno.findFirst({
      where: { id: servicioId, tenantId, activo: true },
    });
    if (!servicio) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

    let turno;
    try {
      turno = await crearTurnoSinSolapamiento({
        tenantId,
        servicioId,
        clienteNombre:   clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        clienteEmail:    clienteEmail?.trim() || null,
        fechaHora:       new Date(fechaHora),
        duracionMin:     servicio.duracionMin,
        notasAdmin:      notasAdmin?.trim() || null,
      });
    } catch (e) {
      if (e instanceof TurnoSolapadoError) {
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }

    return NextResponse.json({
      ok: true,
      turno: {
        id:                turno.id,
        clienteNombre:     turno.clienteNombre,
        clienteTelefono:   turno.clienteTelefono,
        clienteEmail:      turno.clienteEmail,
        fechaHora:         turno.fechaHora.toISOString(),
        duracionMin:       turno.duracionMin,
        estado:            turno.estado,
        servicioId:        turno.servicioId,
        servicio:          turno.servicio.nombre,
        precio:            turno.servicio.precio,
        notasCliente:      turno.notasCliente,
        notasAdmin:        turno.notasAdmin,
        canceladoAt:       null,
        motivoCancelacion: null,
      },
    }, { status: 201 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}