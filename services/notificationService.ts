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

/**
 * Envia mensagem de voz gerada por TTS no WhatsApp.
 * Se a geração de áudio falhar, envia como texto normal (fallback automático).
 */
export async function sendWhatsAppVoice(
  rawPhone:     string,
  text:         string,
  agentName:    string = "REX",
  leadId?:      string,
): Promise<string | null> {
  try {
    const { generateVoiceMessage, SDR_VOICES } = await import("@/services/ttsService");
    const voice   = SDR_VOICES[agentName.toUpperCase()] ?? "alloy";
    const buffer  = await generateVoiceMessage(text, voice);

    if (buffer) {
      const base64 = buffer.toString("base64");
      const fn     = `${agentName.toLowerCase()}-msg-${Date.now()}.mp3`;
      const result = leadId
        ? await sendWhatsAppMediaForLead(rawPhone, base64, fn, "audio", leadId)
        : await sendWhatsAppMedia(rawPhone, base64, fn, "audio");
      if (result) return result;
    }
  } catch (err) {
    console.warn("[tts] Falha ao gerar voz, enviando como texto:", err);
  }
  // Fallback: envia como texto
  return leadId ? sendWhatsAppForLead(rawPhone, text, leadId) : sendWhatsApp(rawPhone, text);
}

/** Envia mídia usando credenciais do cliente do lead (fallback para global). */
export async function sendWhatsAppMediaForLead(
  rawPhone:  string,
  base64:    string,
  fileName:  string,
  mediatype: "document" | "image" | "video" | "audio",
  leadId:    string,
): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin");
    const { data: lead } = await supabaseAdmin
      .from("leads").select("client_id").eq("id", leadId).single();
    if (lead?.client_id) {
      const { data: client } = await supabaseAdmin
        .from("agency_clients")
        .select("evolution_server_url, evolution_instance_name, evolution_api_key")
        .eq("id", lead.client_id).single();
      if (client?.evolution_server_url && client?.evolution_instance_name && client?.evolution_api_key) {
        return _sendMediaViaEvolution(rawPhone, base64, fileName, mediatype, {
          serverUrl:    client.evolution_server_url    as string,
          instanceName: client.evolution_instance_name as string,
          apiKey:       client.evolution_api_key       as string,
        });
      }
    }
  } catch { /* fallback */ }
  return sendWhatsAppMedia(rawPhone, base64, fileName, mediatype);
}

/** Envia WhatsApp usando as credenciais Evolution API de um cliente específico (fallback para global). */
export async function sendWhatsAppForLead(
  rawPhone: string,
  message:  string,
  leadId:   string
): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin");
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("client_id")
      .eq("id", leadId)
      .single();
    if (lead?.client_id) {
      const { data: client } = await supabaseAdmin
        .from("agency_clients")
        .select("evolution_server_url, evolution_instance_name, evolution_api_key")
        .eq("id", lead.client_id)
        .single();
      if (client) {
        const serverUrl    = client.evolution_server_url    as string | undefined;
        const instanceName = client.evolution_instance_name as string | undefined;
        const apiKey       = client.evolution_api_key       as string | undefined;
        if (serverUrl && instanceName && apiKey) {
          return _sendViaEvolution(rawPhone, message, { serverUrl, instanceName, apiKey });
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
