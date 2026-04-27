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
      include: {
        franjas: { orderBy: { orden: "asc" } },
      },
    });

    return NextResponse.json({ ok: true, horarios });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

type FranjaInput = {
  horaInicio: string;
  horaFin:    string;
  orden:      number;
};

type HorarioInput = {
  diaSemana: number;
  activo:    boolean;
  franjas:   FranjaInput[];
};

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
      (horarios as HorarioInput[]).map(async (h) => {
        // Upsert del día
        const horario = await prisma.horarioDisponible.upsert({
          where:  { tenantId_diaSemana: { tenantId, diaSemana: h.diaSemana } },
          create: { tenantId, diaSemana: h.diaSemana, activo: h.activo },
          update: { activo: h.activo },
        });

        // Reemplazar todas las franjas: borrar las viejas y crear las nuevas
        await prisma.horarioFranja.deleteMany({
          where: { horarioId: horario.id },
        });

        if (h.activo && h.franjas.length > 0) {
          await prisma.horarioFranja.createMany({
            data: h.franjas.map((f, i) => ({
              horarioId:  horario.id,
              horaInicio: f.horaInicio,
              horaFin:    f.horaFin,
              orden:      i,
            })),
          });
        }
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}