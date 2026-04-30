// app/api/configuracion/whatsapp/route.ts
// Guarda el teléfono del comercio y habilita/deshabilita notificaciones WA.
// Solo PROPIETARIO o ADMINISTRADOR.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { normalizarTelefono } from "@/lib/whatsapp";
import { enviarWhatsApp } from "@/lib/whatsapp";

export async function GET() {
  try {
    const { tenantId } = await getTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { telefono: true, notificacionesWA: true },
    });

    return NextResponse.json({ ok: true, data: tenant });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId, rol } = await getTenantContext();

    if (!["PROPIETARIO", "ADMINISTRADOR"].includes(rol)) {
      return NextResponse.json({ ok: false, error: "Sin permisos" }, { status: 403 });
    }

    const { telefono, notificacionesWA } = await req.json();

    const data: Record<string, unknown> = {};

    if (telefono !== undefined) {
      if (telefono === "" || telefono === null) {
        data.telefono = null;
      } else {
        const normalizado = normalizarTelefono(telefono);
        if (!normalizado) {
          return NextResponse.json(
            { ok: false, error: "Número de teléfono inválido. Usá formato argentino, ej: 3816123456" },
            { status: 400 }
          );
        }
        data.telefono = normalizado;
      }
    }

    if (notificacionesWA !== undefined) {
      data.notificacionesWA = Boolean(notificacionesWA);
    }

    const tenant = await prisma.tenant.update({
      where:  { id: tenantId },
      data,
      select: { telefono: true, notificacionesWA: true, nombre: true },
    });

    return NextResponse.json({ ok: true, data: tenant });
  } catch (err: any) {
    console.error("[PATCH /api/configuracion/whatsapp]", err);
    return NextResponse.json({ ok: false, error: err.message ?? "Error interno" }, { status: 500 });
  }
}

// POST /api/configuracion/whatsapp/test — envía un mensaje de prueba al dueño
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { telefono: true, nombre: true },
    });

    if (!tenant?.telefono) {
      return NextResponse.json(
        { ok: false, error: "Configurá el teléfono antes de enviar la prueba" },
        { status: 400 }
      );
    }

    const resultado = await enviarWhatsApp(
      tenant.telefono,
      `✅ *Prueba de notificación — ${tenant.nombre}*\n\nLas notificaciones de WhatsApp están funcionando correctamente.\n\n_DevHub Turnos_`
    );

    if (!resultado.ok) {
      return NextResponse.json(
        { ok: false, error: resultado.error ?? "No se pudo enviar el mensaje" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, mensaje: "Mensaje de prueba enviado" });
  } catch (err: any) {
    console.error("[POST /api/configuracion/whatsapp]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";