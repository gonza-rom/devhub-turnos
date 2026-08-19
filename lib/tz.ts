// lib/tz.ts
// El negocio corre en horario de Argentina (UTC-3, sin horario de verano),
// pero el servidor (Vercel) corre en UTC. `new Date(year, month, day, h, m)`
// y `.getHours()/.getMinutes()/.getDay()` interpretan y leen en el huso
// horario del proceso — en producción eso corre todo 3hs desfasado.
// Estos helpers arman/leen instantes de forma explícita para no depender
// del huso horario del servidor.

const OFFSET_MS = -3 * 60 * 60 * 1000; // UTC-3

/** Arma un instante a partir de fecha (YYYY-MM-DD) y hora (HH:MM) en horario argentino. */
export function fechaHoraArgentina(fechaStr: string, horaStr: string): Date {
  return new Date(`${fechaStr}T${horaStr}:00-03:00`);
}

/** Rango [00:00:00, 23:59:59] del día (horario argentino), como instantes. */
export function diaCompletoArgentina(fechaStr: string): { inicio: Date; fin: Date } {
  return {
    inicio: new Date(`${fechaStr}T00:00:00-03:00`),
    fin:    new Date(`${fechaStr}T23:59:59-03:00`),
  };
}

/** Vista del instante shifteada -3hs, para leer sus campos con getters *UTC*
 *  (evita que .getHours()/.getDay() usen el huso del servidor). */
function vistaArgentina(fecha: Date): Date {
  return new Date(fecha.getTime() + OFFSET_MS);
}

/** Minutos desde medianoche (horario argentino) para un instante dado. */
export function minutosDelDiaArgentina(fecha: Date): number {
  const v = vistaArgentina(fecha);
  return v.getUTCHours() * 60 + v.getUTCMinutes();
}

/** "HH:MM" en horario argentino para un instante dado. */
export function horaArgentina(fecha: Date): string {
  const min = minutosDelDiaArgentina(fecha);
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

const DIAS_SEMANA = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

/** "Miércoles 19 de Agosto" en horario argentino para un instante dado. */
export function formatFechaArgentina(fecha: Date): string {
  const v = vistaArgentina(fecha);
  return `${DIAS_SEMANA[v.getUTCDay()]} ${v.getUTCDate()} de ${MESES[v.getUTCMonth()]}`;
}
