// lib/tenant.ts
import { headers } from "next/headers";
import { prisma } from "./prisma";

const PLAN_LIMITES: Record<string, { servicios: number; usuarios: number }> = {
  FREE:       { servicios: 5,        usuarios: 1        },
  PRO:        { servicios: Infinity, usuarios: Infinity },
  ENTERPRISE: { servicios: Infinity, usuarios: Infinity },
};

// ── Contexto desde headers del middleware ─────────────────────────────────

export async function getTenantContext(): Promise<{
  tenantId:     string;
  usuarioId:    string;
  rol:          string;
  nombreUsuario: string;
}> {
  const headersList = await headers();
  const tenantId    = headersList.get("x-tenant-id");
  const usuarioId   = headersList.get("x-user-id");
  const rol         = headersList.get("x-user-rol");
  const nombre      = headersList.get("x-user-nombre");

  if (!tenantId || !usuarioId) throw new Error("No autenticado");

  return {
    tenantId,
    usuarioId,
    rol:           rol    ?? "EMPLEADO",
    nombreUsuario: nombre ?? "",
  };
}

export async function getTenantId(): Promise<string> {
  const { tenantId } = await getTenantContext();
  return tenantId;
}

// ── Verificar límite de servicios según plan ──────────────────────────────

export async function verificarLimiteServicios(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: {
      plan:   true,
      _count: { select: { servicios: { where: { activo: true } } } },
    },
  });

  if (!tenant) throw new Error("Tenant no encontrado");

  const limite = PLAN_LIMITES[tenant.plan]?.servicios ?? 5;
  const actual = tenant._count.servicios;

  if (actual >= limite) {
    throw new Error(
      `Límite de servicios alcanzado (${actual}/${limite}). Actualizá tu plan para agregar más.`
    );
  }
}