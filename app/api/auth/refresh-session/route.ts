// app/api/auth/refresh-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { crearTenantSession, setTenantCookie } from "@/lib/session";
import { toSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    let usuarioTenant = await prisma.usuarioTenant.findUnique({
      where:  { supabaseId: user.id },
      select: { tenantId: true, rol: true, nombre: true, activo: true },
    });

    // ── Primer login: crear tenant ────────────────────────────
    let esNuevoTenant = false;

    if (!usuarioTenant) {
      esNuevoTenant = true;

      const nombre         = user.user_metadata?.nombre         ?? "Usuario";
      const nombreComercio = user.user_metadata?.nombreComercio ?? "Mi Negocio";
      const telefono       = user.user_metadata?.telefono?.trim() || null;

      const base = toSlug(nombreComercio);
      let slug = base, contador = 2;
      while (await prisma.tenant.findUnique({ where: { slug } })) {
        slug = `${base}-${contador++}`;
      }

      await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            nombre:  nombreComercio,
            email:   user.email!,
            slug,
            plan:    "FREE",
            telefono,
            // rubro se carga en el onboarding
          },
        });

        await tx.usuarioTenant.create({
          data: {
            tenantId:   tenant.id,
            supabaseId: user.id,
            nombre,
            email:      user.email!,
            rol:        "PROPIETARIO",
          },
        });

        await tx.suscripcion.create({
          data: {
            tenantId: tenant.id,
            plan:     "FREE",
            estado:   "trial",
            // 14 días de trial desde la suscripcion
            proximoVencimiento: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      });

      usuarioTenant = await prisma.usuarioTenant.findUnique({
        where:  { supabaseId: user.id },
        select: { tenantId: true, rol: true, nombre: true, activo: true },
      });
    }

    if (!usuarioTenant || !usuarioTenant.activo) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // ── Armar sesión ──────────────────────────────────────────
    const [tenant, suscripcion] = await Promise.all([
      prisma.tenant.findUnique({
        where:  { id: usuarioTenant.tenantId },
        select: { plan: true, rubro: true },
      }),
      prisma.suscripcion.findUnique({
        where:  { tenantId: usuarioTenant.tenantId },
        select: { proximoVencimiento: true, estado: true },
      }),
    ]);

    const plan        = (tenant?.plan ?? "FREE") as "FREE" | "PRO" | "ENTERPRISE";
    const planVenceAt = suscripcion?.proximoVencimiento?.getTime() ?? null;

    const token = await crearTenantSession({
      tenantId:  usuarioTenant.tenantId,
      usuarioId: user.id,
      rol:       usuarioTenant.rol,
      nombre:    usuarioTenant.nombre,
      plan,
      planVenceAt,
    });

    // Si es nuevo o no tiene rubro → onboarding
    const destino = (esNuevoTenant || !tenant?.rubro)
      ? "/onboarding"
      : redirectTo;

    const response = NextResponse.redirect(new URL(destino, req.url));
    setTenantCookie(response, token);
    return response;

  } catch (error) {
    console.error("[refresh-session]", error);
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}

export const dynamic = "force-dynamic";