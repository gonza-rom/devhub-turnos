// app/api/public/[slug]/reservar/route.ts
// Crea un turno desde el frontend externo (página pública del comercio).
// No requiere auth del comercio — solo datos del cliente.
// Valida disponibilidad antes de confirmar.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();

    const {
      servicioId,
      fechaHora,        // ISO string: "2025-05-15T10:30:00"
      clienteNombre,
      clienteTelefono,
      clienteEmail,
      notasCliente,
    } = body;

    // ── Validar campos requeridos ─────────────────────────────
    if (!servicioId || !fechaHora || !clienteNombre?.trim() || !clienteTelefono?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Campos requeridos: servicioId, fechaHora, clienteNombre, clienteTelefono" },
        { status: 400 }
      );
    }

    // ── Obtener tenant ────────────────────────────────────────
    const tenant = await prisma.tenant.findUnique({
      where:  { slug, activo: true },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Comercio no encontrado" }, { status: 404 });
    }

    // ── Obtener servicio ──────────────────────────────────────
    const servicio = await prisma.servicioTurno.findFirst({
      where:  { id: servicioId, tenantId: tenant.id, activo: true },
      select: { id: true, nombre: true, duracionMin: true, precio: true },
    });
    if (!servicio) {
      return NextResponse.json({ ok: false, error: "Servicio no disponible" }, { status: 404 });
    }

    // ── Parsear y validar fecha ───────────────────────────────
    const fechaTurno = new Date(fechaHora);
    if (isNaN(fechaTurno.getTime())) {
      return NextResponse.json({ ok: false, error: "Fecha inválida" }, { status: 400 });
    }
    if (fechaTurno <= new Date()) {
      return NextResponse.json({ ok: false, error: "No se puede reservar en el pasado" }, { status: 400 });
    }

    // ── Verificar que el slot siga disponible (anti race condition) ────────
    //
    // Prisma no soporta aritmética de columnas en el WHERE, así que traemos
    // todos los turnos activos del día y filtramos solapamientos en memoria.
    // Filtramos por tenantId SIN servicioId porque un comercio con un solo
    // operador no puede atender dos turnos a la vez, sin importar el servicio.
    //
    const turnoFin = new Date(fechaTurno.getTime() + servicio.duracionMin * 60_000);

    const inicioDia = new Date(fechaTurno);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaTurno);
    finDia.setHours(23, 59, 59, 999);

    const turnosDelDia = await prisma.turno.findMany({
      where: {
        tenantId: tenant.id,
        estado:   { in: ["PENDIENTE", "CONFIRMADO"] },
        fechaHora: { gte: inicioDia, lte: finDia },
      },
      select: { fechaHora: true, duracionMin: true },
    });

    const hayConflicto = turnosDelDia.some((t) => {
      const tFin = new Date(t.fechaHora.getTime() + t.duracionMin * 60_000);
      // Se solapan si el turno existente empieza antes de que termine el nuevo
      // Y termina después de que empieza el nuevo
      return t.fechaHora < turnoFin && tFin > fechaTurno;
    });

    if (hayConflicto) {
      return NextResponse.json(
        { ok: false, error: "El horario ya no está disponible. Por favor elegí otro." },
        { status: 409 }
      );
    }

    // ── Crear el turno ────────────────────────────────────────
    const turno = await prisma.turno.create({
      data: {
        tenantId:        tenant.id,
        servicioId:      servicio.id,
        clienteNombre:   clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        clienteEmail:    clienteEmail?.trim() || null,
        fechaHora:       fechaTurno,
        duracionMin:     servicio.duracionMin,
        estado:          "PENDIENTE",
        notasCliente:    notasCliente?.trim() || null,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id:              turno.id,
        servicio:        servicio.nombre,
        fechaHora:       turno.fechaHora.toISOString(),
        duracionMin:     turno.duracionMin,
        precio:          servicio.precio,
        clienteNombre:   turno.clienteNombre,
        clienteTelefono: turno.clienteTelefono,
        clienteEmail:    turno.clienteEmail,
        estado:          turno.estado,
      },
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/public/[slug]/reservar]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";