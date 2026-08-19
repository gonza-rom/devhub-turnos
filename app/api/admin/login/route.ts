import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  crearAdminSession,
  secretDeAdminEsValido,
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE,
} from "@/lib/admin-auth";
import { checkRateLimit, obtenerIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`admin-login:${obtenerIp(req)}`, {
    limite:   5,
    ventanaMs: 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un minuto e intentá de nuevo." },
      { status: 429 }
    );
  }

  const { secret } = await req.json();

  if (!secret || !secretDeAdminEsValido(secret)) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  const token = await crearAdminSession();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   ADMIN_SESSION_MAX_AGE,
    path:     "/",
  });

  return NextResponse.json({ ok: true });
}
