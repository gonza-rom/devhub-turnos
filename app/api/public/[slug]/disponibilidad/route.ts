// app/api/public/[slug]/disponibilidad/route.ts
// Devuelve los slots disponibles para una fecha y servicio dados.
// Lógica:
//   1. Verificar que el día no esté bloqueado
//   2. Obtener las franjas horarias del día (HorarioFranja)
//   3. Generar slots cada `duracionMin` minutos
//   4. Quitar slots ocupados por CUALQUIER turno del día (sin filtrar por servicio)
//      → un comercio con un operador no puede atender dos turnos a la vez
//   5. Quitar slots en el pasado

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug }   = await params;
    const { searchParams } = new URL(req.url);
    const fechaStr   = searchParams.get("fecha");    // "YYYY-MM-DD"
    const servicioId = searchParams.get("servicio"); // id del servicio

    if (!fechaStr || !servicioId) {
      return NextResponse.json({ ok: false, error: "Parámetros requeridos: fecha, servicio" }, { status: 400 });
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
      select: { duracionMin: true },
    });
    if (!servicio) {
      return NextResponse.json({ ok: false, error: "Servicio no encontrado" }, { status: 404 });
    }

    // ── Parsear fecha ─────────────────────────────────────────
    const [year, month, day] = fechaStr.split("-").map(Number);
    const diaSemana    = new Date(year, month - 1, day).getDay(); // 0=Dom ... 6=Sáb
    const inicioDelDia = new Date(year, month - 1, day, 0, 0, 0);
    const finDelDia    = new Date(year, month - 1, day, 23, 59, 59);

    // ── 1. Verificar bloqueos ─────────────────────────────────
    const bloqueo = await prisma.bloqueoHorario.findFirst({
      where: {
        tenantId:   tenant.id,
        fechaDesde: { lte: finDelDia },
        fechaHasta: { gte: inicioDelDia },
      },
    });
    if (bloqueo) {
      return NextResponse.json({ ok: true, data: [], bloqueado: true, motivoBloqueo: bloqueo.motivo });
    }

    // ── 2. Obtener horario del día ────────────────────────────
    const horarioDia = await prisma.horarioDisponible.findUnique({
      where:   { tenantId_diaSemana: { tenantId: tenant.id, diaSemana } },
      include: { franjas: { orderBy: { orden: "asc" } } },
    });

    if (!horarioDia || !horarioDia.activo || horarioDia.franjas.length === 0) {
      return NextResponse.json({ ok: true, data: [], cerrado: true });
    }

    // ── 3. Generar todos los slots posibles ───────────────────
    const duracion = servicio.duracionMin;
    const ahora    = new Date();
    const slots: string[] = [];

    for (const franja of horarioDia.franjas) {
      const [hIni, mIni] = franja.horaInicio.split(":").map(Number);
      const [hFin, mFin] = franja.horaFin.split(":").map(Number);

      const minInicio = hIni * 60 + mIni;
      const minFin    = hFin * 60 + mFin;

      for (let min = minInicio; min + duracion <= minFin; min += duracion) {
        const hh = String(Math.floor(min / 60)).padStart(2, "0");
        const mm = String(min % 60).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }
    }

    // ── 4. Traer TODOS los turnos activos del día (sin filtrar por servicio) ──
    //
    // Un comercio con un solo operador no puede atender dos turnos al mismo
    // tiempo aunque sean servicios distintos. Si en el futuro se soportan
    // múltiples empleados, agregar un filtro por `empleadoId` aquí.
    //
    const turnosDelDia = await prisma.turno.findMany({
      where: {
        tenantId:  tenant.id,           // ← sin servicioId
        fechaHora: { gte: inicioDelDia, lte: finDelDia },
        estado:    { in: ["PENDIENTE", "CONFIRMADO"] },
      },
      select: { fechaHora: true, duracionMin: true },
    });

    // ── 5. Filtrar slots ocupados o pasados ───────────────────
    const slotsFiltrados = slots.filter((slot) => {
      const [sh, sm] = slot.split(":").map(Number);
      const slotInicio = sh * 60 + sm;
      const slotFin    = slotInicio + duracion;

      // Descartar slots en el pasado (solo relevante si la fecha es hoy)
      const slotDate = new Date(year, month - 1, day, sh, sm);
      if (slotDate <= ahora) return false;

      // Descartar slots que se solapen con algún turno existente
      for (const turno of turnosDelDia) {
        const tInicio = turno.fechaHora.getHours() * 60 + turno.fechaHora.getMinutes();
        const tFin    = tInicio + turno.duracionMin;
        if (slotInicio < tFin && slotFin > tInicio) return false;
      }

      return true;
    });

    return NextResponse.json({ ok: true, data: slotsFiltrados });

  } catch (err) {
    console.error("[GET /api/public/[slug]/disponibilidad]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";