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

export async function sendWhatsApp(rawPhone: string, message: string): Promise<void> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    console.warn("[LeadsOS] WhatsApp not configured — skipping.");
    return;
  }

  // Garante country code 55 (Brasil)
  const phone = rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`;

  const res = await fetch(apiUrl, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": apiKey,
    },
    body: JSON.stringify({ phone, message }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[LeadsOS] WhatsApp send failed (${res.status}):`, text.slice(0, 200));
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
