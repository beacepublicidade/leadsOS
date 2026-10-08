import { getAdminDb } from "@/lib/firebase-admin";

interface ScoringInput {
  name:           string;
  phone:          string;
  email?:         string;
  source?:        string;
  campaign_name?: string;
  status?:        string;
  message_count?: number;   // total messages from lead
  response_time?: number;   // minutes to first response (our side)
}

/** Calcula score 0–100 para um lead */
export function calculateScore(input: ScoringInput): number {
  let score = 0;

  // Dados básicos (0–45)
  if (input.phone) score += 20;
  if (input.name && input.name.trim().length > 2) score += 10;
  if (input.email && input.email.includes("@"))   score += 15;

  // Qualidade da origem (0–15)
  const sourceScores: Record<string, number> = {
    meta_ads:      15,
    google_ads:    12,
    landing_page:  10,
    prospecao:     8,
    whatsapp:      5,
  };
  score += sourceScores[input.source ?? ""] ?? 0;

  // Engajamento — quantidade de mensagens recebidas (0–20)
  const msgs = input.message_count ?? 0;
  if (msgs >= 6) score += 20;
  else if (msgs >= 3) score += 12;
  else if (msgs >= 1) score += 5;

  // Progressão no funil (0–20)
  const statusBonus: Record<string, number> = {
    contato:  5,
    proposta: 15,
    fechado:  20,
  };
  score += statusBonus[input.status ?? ""] ?? 0;

  // Bônus de campanha com palavra-chave de intenção
  const campaign = (input.campaign_name ?? "").toLowerCase();
  if (campaign.match(/promo|oferta|desc|urgen|hot|vip|premium/)) score += 5;

  return Math.min(Math.round(score), 100);
}

/** Recalcula e persiste o score do lead no Firestore */
export async function recalculateLeadScore(leadId: string): Promise<number> {
  const db      = getAdminDb();
  const leadDoc = await db.collection("leads").doc(leadId).get();
  if (!leadDoc.exists) return 0;

  const lead = leadDoc.data()!;

  // Conta mensagens recebidas do lead
  const msgsSnap = await db
    .collection("messages")
    .where("lead_id", "==", leadId)
    .where("direction", "==", "in")
    .get();

  const score = calculateScore({
    name:          lead.name          as string,
    phone:         lead.phone         as string,
    email:         lead.email         as string | undefined,
    source:        lead.source        as string | undefined,
    campaign_name: lead.campaign_name as string | undefined,
    status:        lead.status        as string | undefined,
    message_count: msgsSnap.size,
  });

  await db.collection("leads").doc(leadId).update({ score, score_updated_at: new Date().toISOString() });
  return score;
}
