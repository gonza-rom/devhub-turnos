// app/api/public/[slug]/reservar/route.ts
// Crea un turno desde el frontend externo y envía WhatsApp:
//   → Al DUEÑO: aviso de nueva reserva
//   → Al CLIENTE: confirmación (solo si dejó teléfono válido)
//
// No requiere auth del comercio.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  enviarWhatsApp,
  mensajeNuevaTurno,
  mensajeConfirmacionCliente,
  normalizarTelefono,
} from "@/lib/whatsapp";

// ── Helpers de formato ────────────────────────────────────────

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function formatFecha(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function formatHora(d: Date): string {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function formatDuracion(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatPrecio(precio: number): string {
  return `$${precio.toLocaleString("es-AR")}`;
}

// ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();

    const {
      servicioId,
      fechaHora,        // ISO string
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

    // ── Obtener tenant con datos del propietario ───────────────
    const tenant = await prisma.tenant.findUnique({
      where:  { slug, activo: true },
      select: {
        id:       true,
        nombre:   true,
        telefono: true,
        usuarios: {
          where:  { rol: "PROPIETARIO", activo: true },
          take:   1,
          select: { telefono: true, nombre: true, email: true },
        },
      },
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

    // ── Verificar solapamiento (race condition) ────────────────
    const turnoFin = new Date(fechaTurno.getTime() + servicio.duracionMin * 60 * 1000);

    const turnos = await prisma.turno.findMany({
      where: {
        tenantId:  tenant.id,
        estado:    { in: ["PENDIENTE", "CONFIRMADO"] },
        fechaHora: {
          gte: new Date(fechaTurno.getTime() - 24 * 60 * 60 * 1000),
          lt:  turnoFin,
        },
      },
      select: { fechaHora: true, duracionMin: true },
    });

    for (const t of turnos) {
      const tFin = new Date(t.fechaHora.getTime() + t.duracionMin * 60 * 1000);
      if (t.fechaHora < turnoFin && tFin > fechaTurno) {
        return NextResponse.json(
          { ok: false, error: "El horario ya no está disponible. Por favor elegí otro." },
          { status: 409 }
        );
      }
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

    // ── Enviar WhatsApp al dueño (no bloquea la respuesta) ────
    // Primero intentamos el teléfono del comercio, después el del propietario
    const telefonoComercio = tenant.telefono ?? tenant.usuarios[0]?.telefono;

    if (telefonoComercio) {
      const msgDueno = mensajeNuevaTurno({
        nombreComercio:  tenant.nombre,
        clienteNombre:   turno.clienteNombre,
        clienteTelefono: turno.clienteTelefono,
        servicio:        servicio.nombre,
        fecha:           formatFecha(fechaTurno),
        hora:            formatHora(fechaTurno),
        duracion:        formatDuracion(servicio.duracionMin),
        precio:          servicio.precio ? formatPrecio(servicio.precio) : undefined,
        notasCliente:    turno.notasCliente ?? undefined,
      });

      // fire-and-forget — no esperamos para no demorar la respuesta al cliente
      enviarWhatsApp(telefonoComercio, msgDueno).catch((err) =>
        console.error("[reservar] WA dueño error:", err)
      );
    } else {
      console.warn(`[reservar] Tenant ${tenant.id} sin teléfono — no se envía WA al dueño`);
    }

    // ── Enviar WhatsApp de confirmación al cliente (opcional) ─
    const telClienteValido = normalizarTelefono(clienteTelefono.trim());
    if (telClienteValido) {
      const msgCliente = mensajeConfirmacionCliente({
        nombreComercio:   tenant.nombre,
        clienteNombre:    turno.clienteNombre,
        servicio:         servicio.nombre,
        fecha:            formatFecha(fechaTurno),
        hora:             formatHora(fechaTurno),
        telefonoComercio: telefonoComercio ?? undefined,
      });

      enviarWhatsApp(telClienteValido, msgCliente).catch((err) =>
        console.error("[reservar] WA cliente error:", err)
      );
    }

    // ── Responder ─────────────────────────────────────────────
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