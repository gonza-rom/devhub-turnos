// lib/whatsapp.ts
const BASE_URL = "https://graph.facebook.com/v20.0";

// ── Normalizar número argentino a E.164 para Meta API ─────────
// Meta espera: 5438349447xx (sin el 9 del móvil)
// Ejemplos de entrada válidos:
//   "+543834944727"  → "543834944727"  (ya en formato Meta, quita +)
//   "+5493834944727" → "543834944727"  (quita el 9 del móvil)
//   "3834944727"     → "543834944727"  (agrega 54)
//   "03834944727"    → "543834944727"  (quita 0, agrega 54)
export function normalizarParaMeta(tel: string): string | null {
  // 1. Limpiar caracteres no numéricos excepto +
  const limpio = tel.replace(/[\s\-\(\)]/g, "");

  // 2. Quitar el + si tiene
  const sinPlus = limpio.startsWith("+") ? limpio.slice(1) : limpio;

  // 3. Si empieza con 549 (código Argentina + 9 de móvil) → quitar el 9
  //    Ej: 5493834944727 → 543834944727
  if (sinPlus.startsWith("549") && sinPlus.length === 13) {
    return sinPlus.slice(0, 2) + sinPlus.slice(3); // saca el 9
  }

  // 4. Si empieza con 54 y tiene 12 dígitos → está bien
  //    Ej: 543834944727
  if (sinPlus.startsWith("54") && sinPlus.length === 12) {
    return sinPlus;
  }

  // 5. Número local con 0 adelante → quitar el 0
  const sinCero = sinPlus.startsWith("0") ? sinPlus.slice(1) : sinPlus;

  // 6. 10 dígitos = código área (3/4 dígitos) + número → agregar 54
  if (sinCero.length === 10) {
    return `54${sinCero}`;
  }

  return null;
}

// ── Enviar mensaje de texto simple ────────────────────────────
export async function enviarWhatsApp(
  telefono: string,
  mensaje:  string
): Promise<{ ok: boolean; error?: string }> {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("[WhatsApp] Variables WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configuradas.");
    return { ok: false, error: "WhatsApp no configurado" };
  }

  const to = normalizarParaMeta(telefono);
  if (!to) {
    console.warn(`[WhatsApp] Número inválido: ${telefono}`);
    return { ok: false, error: "Número de teléfono inválido" };
  }

  console.log(`[WhatsApp] Enviando a: ${to}`);

  try {
    const res = await fetch(`${BASE_URL}/${phoneId}/messages`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to,
        type:              "text",
        text: { preview_url: false, body: mensaje },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message ?? "Error desconocido de Meta API";
      console.error("[WhatsApp] Error al enviar:", errMsg, data);
      return { ok: false, error: errMsg };
    }

    console.log(`[WhatsApp] OK → ${to}:`, data?.messages?.[0]?.id);
    return { ok: true };

  } catch (err: any) {
    console.error("[WhatsApp] Excepción:", err.message);
    return { ok: false, error: err.message };
  }
}

// Versión pública para usar en otros módulos (normaliza a E.164 con +)
export function normalizarTelefono(tel: string): string | null {
  const meta = normalizarParaMeta(tel);
  return meta ? `+${meta}` : null;
}

// ── Mensajes predefinidos ──────────────────────────────────────

export type NuevaTurnoParams = {
  nombreComercio:  string;
  clienteNombre:   string;
  clienteTelefono: string;
  servicio:        string;
  fecha:           string;
  hora:            string;
  duracion:        string;
  precio?:         string;
  notasCliente?:   string;
};

export function mensajeNuevaTurno(p: NuevaTurnoParams): string {
  const lineas = [
    `🗓 *Nueva reserva en ${p.nombreComercio}*`,
    ``,
    `👤 *Cliente:* ${p.clienteNombre}`,
    `📱 *Teléfono:* ${p.clienteTelefono}`,
    ``,
    `✂️ *Servicio:* ${p.servicio}`,
    `📅 *Fecha:* ${p.fecha}`,
    `⏰ *Hora:* ${p.hora} hs`,
    `⏱ *Duración:* ${p.duracion}`,
  ];

  if (p.precio) lineas.push(`💰 *Precio:* ${p.precio}`);
  if (p.notasCliente?.trim()) lineas.push(``, `📝 *Nota del cliente:* ${p.notasCliente}`);
  lineas.push(``, `_Reservado desde DevHub Turnos_`);

  return lineas.join("\n");
}

export type ConfirmacionClienteParams = {
  nombreComercio:    string;
  clienteNombre:     string;
  servicio:          string;
  fecha:             string;
  hora:              string;
  telefonoComercio?: string;
};

export function mensajeConfirmacionCliente(p: ConfirmacionClienteParams): string {
  const lineas = [
    `✅ *¡Turno confirmado!*`,
    ``,
    `Hola ${p.clienteNombre}, tu reserva en *${p.nombreComercio}* fue registrada.`,
    ``,
    `📋 *Detalle:*`,
    `• Servicio: ${p.servicio}`,
    `• Fecha: ${p.fecha}`,
    `• Hora: ${p.hora} hs`,
  ];

  if (p.telefonoComercio) lineas.push(``, `❓ Consultas al ${p.telefonoComercio}`);
  lineas.push(``, `_Gracias por tu reserva_ 🙌`);

  return lineas.join("\n");
}