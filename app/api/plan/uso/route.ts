// app/api/plan/uso/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

const TRIAL_DIAS = 14;

const PLAN_LIMITES: Record<string, { servicios: number; usuarios: number }> = {
  FREE:       { servicios: 5,        usuarios: 1        },
  PRO:        { servicios: Infinity, usuarios: Infinity },
  ENTERPRISE: { servicios: Infinity, usuarios: Infinity },
};

export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { plan: true, createdAt: true },
    });

    if (!tenant) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });

    const limites = PLAN_LIMITES[tenant.plan] ?? PLAN_LIMITES.FREE;

    const [serviciosActivos, usuariosActivos] = await Promise.all([
      prisma.servicioTurno.count({ where: { tenantId, activo: true } }),
      prisma.usuarioTenant.count({ where: { tenantId, activo: true } }),
    ]);

    // Trial solo para FREE
    let trialDiasRestantes: number | null = null;
    let trialVencidoAt:     string | null = null;

    if (tenant.plan === "FREE") {
      const msDesdeRegistro = Date.now() - new Date(tenant.createdAt).getTime();
      const diasUsados      = Math.floor(msDesdeRegistro / 86_400_000);
      trialDiasRestantes    = Math.max(0, TRIAL_DIAS - diasUsados);
      const vence           = new Date(tenant.createdAt);
      vence.setDate(vence.getDate() + TRIAL_DIAS);
      trialVencidoAt        = vence.toISOString();
    }

    return NextResponse.json({
      ok: true,
      data: {
        plan: tenant.plan,
        uso: {
          servicios: serviciosActivos,
          usuarios:  usuariosActivos,
        },
        limites: {
          servicios: limites.servicios === Infinity ? null : limites.servicios,
          usuarios:  limites.usuarios  === Infinity ? null : limites.usuarios,
        },
        trial: {
          diasRestantes: trialDiasRestantes,
          vencidoAt:     trialVencidoAt,
          vencido:       trialDiasRestantes === 0,
        },
      },
    });

  } catch (err: any) {
    console.error("[GET /api/plan/uso]", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";