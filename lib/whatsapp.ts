// lib/whatsapp.ts
const BASE_URL = "https://graph.facebook.com/v20.0";

// ── Normalizar número argentino para Meta API ─────────────────
export function normalizarParaMeta(tel: string): string | null {
  const limpio  = tel.replace(/[\s\-\(\)]/g, "");
  const sinPlus = limpio.startsWith("+") ? limpio.slice(1) : limpio;

  // 5493834944727 → 543834944727 (quita el 9 del móvil argentino)
  if (sinPlus.startsWith("549") && sinPlus.length === 13) {
    return sinPlus.slice(0, 2) + sinPlus.slice(3);
  }
  // 543834944727 (12 dígitos) → ok
  if (sinPlus.startsWith("54") && sinPlus.length === 12) {
    return sinPlus;
  }
  // 03834944727 → quita el 0
  const sinCero = sinPlus.startsWith("0") ? sinPlus.slice(1) : sinPlus;
  // 10 dígitos → agrega 54
  if (sinCero.length === 10) return `54${sinCero}`;

  return null;
}

export function normalizarTelefono(tel: string): string | null {
  const meta = normalizarParaMeta(tel);
  return meta ? `+${meta}` : null;
}

// ── Enviar mensaje de texto libre ─────────────────────────────
export async function enviarWhatsApp(
  telefono: string,
  mensaje:  string
): Promise<{ ok: boolean; error?: string }> {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("[WhatsApp] Variables no configuradas.");
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
        to,
        type: "text",
        text: { body: mensaje },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message ?? "Error desconocido de Meta API";
      console.error("[WhatsApp] Error:", errMsg, data);
      return { ok: false, error: errMsg };
    }

    console.log(`[WhatsApp] OK → ${to}:`, data?.messages?.[0]?.id);
    return { ok: true };
  } catch (err: any) {
    console.error("[WhatsApp] Excepción:", err.message);
    return { ok: false, error: err.message };
  }
}

// ── Enviar template ───────────────────────────────────────────
async function enviarTemplate(
  telefono:   string,
  name:       string,
  language:   string,
  components?: object[]
): Promise<{ ok: boolean; error?: string }> {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("[WhatsApp] Variables no configuradas.");
    return { ok: false, error: "WhatsApp no configurado" };
  }

  const to = normalizarParaMeta(telefono);
  if (!to) {
    console.warn(`[WhatsApp] Número inválido: ${telefono}`);
    return { ok: false, error: "Número de teléfono inválido" };
  }

  console.log(`[WhatsApp] Template "${name}" → ${to}`);

  try {
    const body: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name,
        language: { code: language },
        ...(components?.length ? { components } : {}),
      },
    };

    const res = await fetch(`${BASE_URL}/${phoneId}/messages`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message ?? "Error desconocido de Meta API";
      console.error("[WhatsApp] Error template:", errMsg, data);
      return { ok: false, error: errMsg };
    }

    console.log(`[WhatsApp] Template OK → ${to}:`, data?.messages?.[0]?.id);
    return { ok: true };
  } catch (err: any) {
    console.error("[WhatsApp] Excepción:", err.message);
    return { ok: false, error: err.message };
  }
}

// ── Tipos ─────────────────────────────────────────────────────

export type NuevaTurnoParams = {
  nombreComercio:  string;
  clienteNombre:   string;
  clienteTelefono: string;
  servicio:        string;
  fecha:           string;
  hora:            string;
  duracion:        string;
  precio?:         string;       // ← incluido
  notasCliente?:   string;
};

export type ConfirmacionClienteParams = {
  nombreComercio:    string;
  clienteNombre:     string;
  servicio:          string;
  fecha:             string;
  hora:              string;
  telefonoComercio?: string;     // ← incluido
};

// ── Mensaje al DUEÑO — texto libre (fallback) ─────────────────
export function mensajeNuevaTurno(p: NuevaTurnoParams): string {
  const lineas = [
    `📅 Nueva reserva en ${p.nombreComercio}`,
    ``,
    `👤 Cliente: ${p.clienteNombre}`,
    `📞 Tel: ${p.clienteTelefono}`,
    ``,
    `✂️ Servicio: ${p.servicio}`,
    `🗓 Fecha: ${p.fecha}`,
    `🕐 Hora: ${p.hora} hs`,
    `⏱ Duración: ${p.duracion}`,
  ];

  if (p.precio)              lineas.push(`💰 Precio: ${p.precio}`);
  if (p.notasCliente?.trim()) lineas.push(``, `📝 Nota: ${p.notasCliente}`);
  lineas.push(``, `DevHub Turnos`);

  return lineas.join("\n");
}

// ── Confirmación al CLIENTE — texto libre (fallback) ──────────
export function mensajeConfirmacionCliente(p: ConfirmacionClienteParams): string {
  const lineas = [
    `✅ Turno confirmado`,
    ``,
    `Hola ${p.clienteNombre}, tu turno en ${p.nombreComercio} fue registrado.`,
    ``,
    `✂️ Servicio: ${p.servicio}`,
    `🗓 Fecha: ${p.fecha}`,
    `🕐 Hora: ${p.hora} hs`,
  ];

  if (p.telefonoComercio) lineas.push(``, `Consultas al ${p.telefonoComercio}`);
  lineas.push(``, `DevHub Turnos`);

  return lineas.join("\n");
}

// ── Templates aprobados por Meta ──────────────────────────────
// Usar estos una vez que los templates estén aprobados en Meta.

// Template nueva_reserva → al dueño
export function notificarNuevaReserva(params: {
  telefonoDueno:   string;
  nombreComercio:  string;
  clienteNombre:   string;
  clienteTelefono: string;
  servicio:        string;
  fecha:           string;
  hora:            string;
  duracion:        string;
}): Promise<{ ok: boolean; error?: string }> {
  return enviarTemplate(
    params.telefonoDueno,
    "nueva_reserva",
    "es_AR",
    [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.nombreComercio  },
          { type: "text", text: params.clienteNombre   },
          { type: "text", text: params.clienteTelefono },
          { type: "text", text: params.servicio        },
          { type: "text", text: params.fecha           },
          { type: "text", text: params.hora            },
          { type: "text", text: params.duracion        },
        ],
      },
    ]
  );
}

// Template confirmacion_cliente → al cliente
export function notificarTurnoConfirmado(params: {
  telefonoCliente: string;
  clienteNombre:   string;
  nombreComercio:  string;
  servicio:        string;
  fecha:           string;
  hora:            string;
}): Promise<{ ok: boolean; error?: string }> {
  return enviarTemplate(
    params.telefonoCliente,
    "confirmacion_cliente",
    "es_AR",
    [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.clienteNombre  },
          { type: "text", text: params.nombreComercio },
          { type: "text", text: params.servicio       },
          { type: "text", text: params.fecha          },
          { type: "text", text: params.hora           },
        ],
      },
    ]
  );
}

// Test con hello_world (siempre disponible)
export function testHelloWorld(
  telefono: string
): Promise<{ ok: boolean; error?: string }> {
  return enviarTemplate(telefono, "hello_world", "en_US");
}