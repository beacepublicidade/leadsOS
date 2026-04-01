export interface NotificationPayload {
  name:   string;
  phone:  string;
  email?: string;
  source?: string;
  campaign_name?: string;
}

// Each channel is a function with the same signature.
// To add WhatsApp, Email or Webhook: implement the function and add it to CHANNELS.
type NotificationChannel = (payload: NotificationPayload) => Promise<void>;

async function logChannel(payload: NotificationPayload): Promise<void> {
  console.log(`[LeadsOS] New lead received: ${payload.name} - ${payload.phone}`);
}

import { normalizePhone } from "@/lib/normalizePhone";

export async function sendWhatsApp(rawPhone: string, message: string): Promise<string | null> {
  return _sendViaEvolution(rawPhone, message, {
    serverUrl:    process.env.EVOLUTION_SERVER_URL,
    instanceName: process.env.EVOLUTION_INSTANCE,
    apiKey:       process.env.EVOLUTION_API_KEY,
  });
}

export async function sendWhatsAppMedia(
  rawPhone: string,
  base64: string,
  fileName: string,
  mediatype: "document" | "image" | "video" | "audio"
): Promise<string | null> {
  return _sendMediaViaEvolution(rawPhone, base64, fileName, mediatype, {
    serverUrl:    process.env.EVOLUTION_SERVER_URL,
    instanceName: process.env.EVOLUTION_INSTANCE,
    apiKey:       process.env.EVOLUTION_API_KEY,
  });
}

async function _sendMediaViaEvolution(
  rawPhone: string,
  base64: string,
  fileName: string,
  mediatype: string,
  creds: { serverUrl?: string; instanceName?: string; apiKey?: string }
): Promise<string | null> {
  const { serverUrl, instanceName, apiKey } = creds;
  if (!serverUrl || !instanceName || !apiKey) {
    throw new Error("WhatsApp não configurado.");
  }
  const phone  = normalizePhone(rawPhone);
  const apiUrl = `${serverUrl}/message/sendMedia/${instanceName}`;
  const res = await fetch(apiUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "apikey": apiKey },
    body: JSON.stringify({ number: phone, mediatype, fileName, media: base64 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API erro (${res.status}): ${text.slice(0, 200)}`);
  }
  try {
    const json = await res.json() as Record<string, unknown>;
    return (json.key as Record<string, unknown>)?.id as string | null ?? null;
  } catch {
    return null;
  }
}

/** Envia WhatsApp usando as credenciais Evolution API de um cliente específico (fallback para global). */
export async function sendWhatsAppForLead(
  rawPhone: string,
  message:  string,
  leadId:   string
): Promise<string | null> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const leadDoc = await getAdminDb().collection("leads").doc(leadId).get();
    if (leadDoc.exists) {
      const clientId = leadDoc.data()?.client_id as string | undefined;
      if (clientId) {
        const clientDoc = await getAdminDb().collection("clients").doc(clientId).get();
        if (clientDoc.exists) {
          const c = clientDoc.data()!;
          const serverUrl    = c.evolution_server_url    as string | undefined;
          const instanceName = c.evolution_instance_name as string | undefined;
          const apiKey       = c.evolution_api_key       as string | undefined;
          if (serverUrl && instanceName && apiKey) {
            return _sendViaEvolution(rawPhone, message, { serverUrl, instanceName, apiKey });
          }
        }
      }
    }
  } catch { /* fallback para global */ }
  return sendWhatsApp(rawPhone, message);
}

async function _sendViaEvolution(
  rawPhone: string,
  message:  string,
  creds: { serverUrl?: string; instanceName?: string; apiKey?: string }
): Promise<string | null> {
  const { serverUrl, instanceName, apiKey } = creds;

  if (!serverUrl || !instanceName || !apiKey) {
    throw new Error(
      `WhatsApp não configurado. Variáveis faltando: ${[
        !serverUrl    && "EVOLUTION_SERVER_URL",
        !instanceName && "EVOLUTION_INSTANCE",
        !apiKey       && "EVOLUTION_API_KEY",
      ].filter(Boolean).join(", ")}`
    );
  }

  // @lid contacts: pass JID directly; regular phones: normalize to E.164
  const phone = rawPhone.includes("@") ? rawPhone : normalizePhone(rawPhone);
  const apiUrl = `${serverUrl}/message/sendText/${instanceName}`;

  const res = await fetch(apiUrl, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiKey,
    },
    body: JSON.stringify({ number: phone, text: message }),
  });

  if (!res.ok) {
    const text = await res.text();
    // @lid contacts (WhatsApp privacy mode): silently skip, can't send via REST API
    if (res.status === 400 && text.includes('"exists":false')) {
      console.warn(`[sendWhatsApp] Contato com privacidade @lid — mensagem não enviada: ${phone}`);
      return null;
    }
    throw new Error(`Evolution API erro (${res.status}): ${text.slice(0, 200)}`);
  }

  try {
    const json = await res.json() as Record<string, unknown>;
    return (json.key as Record<string, unknown>)?.id as string | null ?? null;
  } catch {
    return null;
  }
}

async function whatsappChannel(payload: NotificationPayload): Promise<void> {
  const rawPhone = payload.phone || process.env.WHATSAPP_RECIPIENT_PHONE;

  if (!rawPhone) {
    console.warn("[LeadsOS] WhatsApp skipped — no phone available.");
    return;
  }

  const message =
    `Novo lead recebido:\n` +
    `Nome: ${payload.name}\n` +
    `Telefone: ${payload.phone}\n` +
    `Campanha: ${payload.campaign_name ?? "—"}`;

  await sendWhatsApp(rawPhone, message);
}

// async function emailChannel(payload: NotificationPayload): Promise<void> { ... }
// async function webhookChannel(payload: NotificationPayload): Promise<void> { ... }

const CHANNELS: NotificationChannel[] = [
  logChannel,
  whatsappChannel,
  // emailChannel,
  // webhookChannel,
];

export async function notifyNewLead(payload: NotificationPayload): Promise<void> {
  await Promise.allSettled(CHANNELS.map((channel) => channel(payload)));
}
