// app/api/horarios/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const horarios = await prisma.horarioDisponible.findMany({
      where:   { tenantId },
      orderBy: { diaSemana: "asc" },
    });

    return NextResponse.json({ ok: true, horarios });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const tenantId    = headersList.get("x-tenant-id");
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { horarios } = await req.json();
    if (!Array.isArray(horarios)) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    await Promise.all(
      horarios.map((h: { diaSemana: number; horaInicio: string; horaFin: string; activo: boolean }) =>
        prisma.horarioDisponible.upsert({
          where:  { tenantId_diaSemana: { tenantId, diaSemana: h.diaSemana } },
          create: { tenantId, diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin, activo: h.activo },
          update: { horaInicio: h.horaInicio, horaFin: h.horaFin, activo: h.activo },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}