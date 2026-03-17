import { getAdminDb } from "@/lib/firebase-admin";
import { sendWhatsApp } from "@/services/notificationService";
import { logAction } from "@/services/logsService";

export interface FollowUpJob {
  lead_id: string;
  name: string;
  phone: string;
  step: 1 | 2;
  run_at: string; // ISO string
  done: boolean;
}

const TEN_MINUTES = 10 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Agenda os follow-ups persistindo no Firestore.
 * Substitui o setTimeout anterior — não perde dados ao reiniciar o servidor.
 */
export async function scheduleFollowUps(
  name: string,
  phone: string,
  lead_id = ""
): Promise<void> {
  const db = getAdminDb();
  const now = Date.now();

  const jobs: FollowUpJob[] = [
    {
      lead_id,
      name,
      phone,
      step: 1,
      run_at: new Date(now + TEN_MINUTES).toISOString(),
      done: false,
    },
    {
      lead_id,
      name,
      phone,
      step: 2,
      run_at: new Date(now + TWENTY_FOUR_HOURS).toISOString(),
      done: false,
    },
  ];

  const batch = db.batch();
  for (const job of jobs) {
    batch.set(db.collection("followup_jobs").doc(), job);
  }
  await batch.commit();

  console.log(`[LeadsOS] Follow-ups agendados no Firestore para ${name} (${phone})`);
}

/**
 * Processa os follow-ups pendentes cujo run_at já passou.
 * Chamado pelo cron job em /api/cron/process-followups.
 */
export async function processPendingFollowUps(): Promise<number> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const snap = await db
    .collection("followup_jobs")
    .where("done", "==", false)
    .where("run_at", "<=", now)
    .limit(50)
    .get();

  if (snap.empty) return 0;

  let processed = 0;

  for (const doc of snap.docs) {
    const job = doc.data() as FollowUpJob;
    const firstName = job.name.split(" ")[0];

    const message =
      job.step === 1
        ? `Oi ${firstName}, só passando pra ver se conseguiu ver nossa mensagem 🙂`
        : `Última mensagem aqui ${firstName}! Posso te ajudar com algo?`;

    try {
      await sendWhatsApp(job.phone, message);
      await logAction({
        lead_id: job.lead_id,
        type: "followup",
        message: `Follow-up ${job.step} (${job.step === 1 ? "10min" : "24h"}) enviado para ${job.phone}.`,
        created_at: "",
      });
      await doc.ref.update({ done: true });
      processed++;
    } catch (err) {
      console.error(`[LeadsOS] Erro ao processar follow-up job ${doc.id}:`, err);
    }
  }

  return processed;
}
