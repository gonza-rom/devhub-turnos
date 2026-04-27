// app/api/tenants/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSecret } from "@/lib/admin-auth";

export async function GET(req: NextRequest, context: any) {
  if (!verifyAdminSecret(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = context.params;

  const tenant = await prisma.tenant.findUnique({
    where:   { id },
    include: {
      suscripcion: true,
      _count: { select: { usuarios: true, turnos: true, servicios: true } },
    },
  });

  if (!tenant)
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true, data: tenant });
}

export async function PATCH(req: NextRequest, context: any) {
  if (!verifyAdminSecret(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = context.params;
  const { plan, activo } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (plan   !== undefined) updateData.plan   = plan;
  if (activo !== undefined) updateData.activo = activo;

  const tenant = await prisma.tenant.update({ where: { id }, data: updateData });

  return NextResponse.json({ ok: true, data: tenant });
}

export async function DELETE(req: NextRequest, context: any) {
  if (!verifyAdminSecret(req))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = context.params;

  await prisma.tenant.update({ where: { id }, data: { activo: false } });

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";