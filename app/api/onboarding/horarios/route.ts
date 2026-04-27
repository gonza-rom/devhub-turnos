import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const ut = await prisma.usuarioTenant.findUnique({
      where:  { supabaseId: user.id },
      select: { tenantId: true },
    });
    if (!ut) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

    const { horarios } = await req.json();
    if (!Array.isArray(horarios)) {
      return NextResponse.json({ error: "Horarios inválidos" }, { status: 400 });
    }

    await Promise.all(
      horarios.map(async (h: {
        diaSemana:  number;
        horaInicio: string;
        horaFin:    string;
        activo:     boolean;
      }) => {
        const horario = await prisma.horarioDisponible.upsert({
          where:  { tenantId_diaSemana: { tenantId: ut.tenantId, diaSemana: h.diaSemana } },
          create: { tenantId: ut.tenantId, diaSemana: h.diaSemana, activo: h.activo },
          update: { activo: h.activo },
        });

        await prisma.horarioFranja.deleteMany({
          where: { horarioId: horario.id },
        });

        if (h.activo) {
          await prisma.horarioFranja.create({
            data: {
              horarioId:  horario.id,
              horaInicio: h.horaInicio,
              horaFin:    h.horaFin,
              orden:      0,
            },
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

export const dynamic = "force-dynamic";