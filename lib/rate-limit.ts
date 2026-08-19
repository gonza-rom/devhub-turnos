// lib/rate-limit.ts
// Limitador simple en memoria, por instancia del proceso.
// No es perfectamente preciso en despliegues serverless con múltiples
// instancias (cada una lleva su propio contador), pero frena abuso
// básico (fuerza bruta, spam de formularios) sin depender de Redis.

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

const MAX_BUCKETS = 5000;

function limpiarExpirados(ahora: number): void {
  for (const [key, entry] of buckets) {
    if (ahora > entry.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  opts: { limite: number; ventanaMs: number }
): { ok: boolean } {
  const ahora = Date.now();
  const entry = buckets.get(key);

  if (buckets.size > MAX_BUCKETS) limpiarExpirados(ahora);

  if (!entry || ahora > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: ahora + opts.ventanaMs });
    return { ok: true };
  }

  if (entry.count >= opts.limite) {
    return { ok: false };
  }

  entry.count++;
  return { ok: true };
}

export function obtenerIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "desconocido";
}
