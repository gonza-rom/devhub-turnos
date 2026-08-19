// lib/admin-auth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "devhub-admin-session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("ADMIN_SECRET no está definido en .env");
  return new TextEncoder().encode(secret);
}

/** Compara contra ADMIN_SECRET en tiempo constante para evitar timing attacks. */
export function secretDeAdminEsValido(candidato: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const a = Buffer.from(candidato);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/** Firma una sesión de admin de corta duración. No contiene el secreto crudo. */
export async function crearAdminSession(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecretKey());
}

async function adminSessionEsValida(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.admin === true;
  } catch {
    return false;
  }
}

/**
 * Verifica que la sesión de admin sea válida.
 * Llamar al inicio de cada Server Component / Route Handler del área /admin.
 */
export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!(await adminSessionEsValida(token))) {
    redirect("/admin/login");
  }
}
