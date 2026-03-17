import { adminDb } from "@/lib/firebase-admin";
import { notifyNewLead, sendWhatsApp } from "@/services/notificationService";
import { scheduleFollowUps } from "@/services/followUpService";
import { calculateScore } from "@/services/scoringService";
import { logAction } from "@/services/logsService";

export interface MetaLeadPayload {
  name:          string;
  email?:        string;
  phone?:        string;
  campaign_name?: string;
  adset_name?:   string;
  ad_name?:      string;
  form_id?:      string;
  created_at?:   string;
}

export interface MetaLeadDocument {
  name:          string;
  email:         string;
  phone:         string;
  campaign_name: string;
  adset_name:    string;
  ad_name:       string;
  form_id:       string;
  created_at:    string;
  status:        "novo";
  source:        "meta_ads";
  score:         number;
}

export async function saveMetaLead(payload: MetaLeadPayload): Promise<string> {
  const doc: MetaLeadDocument = {
    name:          payload.name,
    email:         payload.email         ?? "",
    phone:         payload.phone         ?? "",
    campaign_name: payload.campaign_name ?? "",
    adset_name:    payload.adset_name    ?? "",
    ad_name:       payload.ad_name       ?? "",
    form_id:       payload.form_id       ?? "",
    created_at:    payload.created_at    ?? new Date().toISOString(),
    status:        "novo",
    source:        "meta_ads",
    score:         0, // placeholder — calculated below
  };

  doc.score = calculateScore({
    name:          doc.name,
    phone:         doc.phone,
    email:         doc.email,
    source:        doc.source,
    campaign_name: doc.campaign_name,
  });

  const ref = await adminDb.collection("leads").add(doc);

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
