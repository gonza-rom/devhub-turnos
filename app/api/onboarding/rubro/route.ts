// app/api/onboarding/rubro/route.ts
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

    const { rubro } = await req.json();
    const rubrosValidos = ["BARBERIA", "DETAILING", "ESTETICA", "MEDICO", "OTRO"];
    if (!rubrosValidos.includes(rubro)) {
      return NextResponse.json({ error: "Rubro inválido" }, { status: 400 });
    }

    await prisma.tenant.update({
      where: { id: ut.tenantId },
      data:  { rubro },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";