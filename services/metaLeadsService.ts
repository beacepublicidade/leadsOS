import { getAdminDb } from "@/lib/firebase-admin";
import { notifyNewLead, sendWhatsApp } from "@/services/notificationService";
import { scheduleFollowUps } from "@/services/followUpService";
import { calculateScore } from "@/services/scoringService";
import { logAction } from "@/services/logsService";

export interface MetaLeadPayload {
  name:           string;
  email?:         string;
  phone?:         string;
  source?:        string;
  campaign_name?: string;
  adset_name?:    string;
  ad_name?:       string;
  form_id?:       string;
  created_at?:    string;
  client_id?:     string;
  // UTM parameters
  utm_source?:    string;
  utm_medium?:    string;
  utm_campaign?:  string;
  utm_content?:   string;
  utm_term?:      string;
}

export interface MetaLeadDocument {
  name:          string;
  email:         string;
  phone:         string;
  source:        string;
  campaign_name: string;
  adset_name:    string;
  ad_name:       string;
  form_id:       string;
  created_at:    string;
  status:        "novo";
  score:         number;
  client_id:     string;
  // UTM parameters
  utm_source:    string;
  utm_medium:    string;
  utm_campaign:  string;
  utm_content:   string;
  utm_term:      string;
}

export async function saveMetaLead(payload: MetaLeadPayload): Promise<string> {
  const doc: MetaLeadDocument = {
    name:          payload.name,
    email:         payload.email         ?? "",
    phone:         payload.phone         ?? "",
    source:        payload.source        ?? "meta_ads",
    campaign_name: payload.campaign_name ?? "",
    adset_name:    payload.adset_name    ?? "",
    ad_name:       payload.ad_name       ?? "",
    form_id:       payload.form_id       ?? "",
    created_at:    payload.created_at    ?? new Date().toISOString(),
    status:        "novo",
    score:         0,
    client_id:     payload.client_id     ?? "",
    utm_source:    payload.utm_source    ?? "",
    utm_medium:    payload.utm_medium    ?? "",
    utm_campaign:  payload.utm_campaign  ?? "",
    utm_content:   payload.utm_content   ?? "",
    utm_term:      payload.utm_term      ?? "",
  };

  doc.score = calculateScore({
    name:          doc.name,
    phone:         doc.phone,
    email:         doc.email,
    source:        doc.source,
    campaign_name: doc.campaign_name,
  });

  const ref = await getAdminDb().collection("leads").add(doc);

  logAction({
    lead_id:    ref.id,
    type:       "notification",
    message:    `Lead criado via Meta Ads. Campanha: ${doc.campaign_name || "—"}. Score: ${doc.score}.`,
    created_at: "",
  }).catch(() => {});

  await notifyNewLead({
    name:          doc.name,
    phone:         doc.phone,
    email:         doc.email,
    source:        doc.source,
    campaign_name: doc.campaign_name,
  });

  if (doc.phone) {
    scheduleFollowUps(doc.name, doc.phone, ref.id);
  }

  // Internal admin alert — separate from lead notification
  const adminPhone = process.env.WHATSAPP_RECIPIENT_PHONE;
  if (adminPhone) {
    const adminMessage =
      `🚨 Novo lead recebido!\n` +
      `Nome: ${doc.name}\n` +
      `Telefone: ${doc.phone}\n` +
      `Campanha: ${doc.campaign_name}`;

    sendWhatsApp(adminPhone, adminMessage).catch(
      (err) => console.error("[LeadsOS] Admin alert error:", err)
    );
  }

  return ref.id;
}
