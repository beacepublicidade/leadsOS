import { getAdminDb } from "@/lib/firebase-admin";
import { sendWhatsAppForLead } from "@/services/notificationService";
import { saveMessage } from "@/services/conversationService";
import { logAction } from "@/services/logsService";

export interface FollowUpJob {
  lead_id: string;
  name:    string;
  phone:   string;
  step:    1 | 2 | 3 | 4;
  run_at:  string; // ISO string
  done:    boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const STEPS: { step: 1 | 2 | 3 | 4; delayMs: number; label: string }[] = [
  { step: 1, delayMs:  1 * DAY_MS,  label: "D+1"  },
  { step: 2, delayMs:  3 * DAY_MS,  label: "D+3"  },
  { step: 3, delayMs:  7 * DAY_MS,  label: "D+7"  },
  { step: 4, delayMs: 15 * DAY_MS,  label: "D+15" },
];

const MESSAGES: Record<number, (name: string) => string> = {
  1: (n) => `Oi ${n}! Passando pra ver se conseguiu ver nossa mensagem. Posso te ajudar com alguma coisa? 😊`,
  2: (n) => `Olá ${n}! Ainda estou por aqui caso queira saber mais sobre o que oferecemos. Qualquer dúvida é só chamar! 🙂`,
  3: (n) => `${n}, uma semana se passou e quero garantir que você tem todas as informações que precisa. Posso te apresentar nossos resultados? 🚀`,
  4: (n) => `${n}, esse é meu último contato. Se mudar de ideia ou quiser conversar no futuro, estarei aqui. Sucesso! 🌟`,
};

const CONVERTED_STATUSES = new Set(["proposta", "fechado"]);

export async function scheduleFollowUps(name: string, phone: string, lead_id = ""): Promise<void> {
  const db  = getAdminDb();
  const now = Date.now();

  const batch = db.batch();
  for (const { step, delayMs } of STEPS) {
    batch.set(db.collection("followup_jobs").doc(), {
      lead_id,
      name,
      phone,
      step,
      run_at: new Date(now + delayMs).toISOString(),
      done: false,
    } satisfies FollowUpJob);
  }
  await batch.commit();
  console.log(`[FollowUp] Agendados ${STEPS.length} steps para ${name} (${phone}): D+1, D+3, D+7, D+15`);
}

export async function processPendingFollowUps(): Promise<number> {
  const db  = getAdminDb();
  const now = new Date().toISOString();

  const snap = await db
    .collection("followup_jobs")
    .where("done", "==", false)
    .where("run_at", "<=", now)
    .limit(50)
    .get();

  if (snap.empty) return 0;

  let processed = 0;

  for (const docSnap of snap.docs) {
    const job = docSnap.data() as FollowUpJob;

    // Verifica se lead já converteu ou está em modo humano
    if (job.lead_id) {
      const leadDoc = await db.collection("leads").doc(job.lead_id).get();
      if (leadDoc.exists) {
        const ld         = leadDoc.data()!;
        const status     = ld.status     as string | undefined;
        const mode       = ld.mode       as string | undefined;
        const humanUntil = ld.human_until as string | undefined;

        // Cancela restante se lead converteu
        if (CONVERTED_STATUSES.has(status ?? "")) {
          await docSnap.ref.update({ done: true });
          continue;
        }

        // Pausa se em modo humano
        if (mode === "human" && humanUntil && new Date(humanUntil) > new Date()) {
          continue;
        }
      }
    }

    const firstName = job.name.split(" ")[0];
    const message   = MESSAGES[job.step]?.(firstName) ?? MESSAGES[1](firstName);

    try {
      const msgId     = await sendWhatsAppForLead(job.phone, message, job.lead_id);
      const timestamp = new Date().toISOString();
      const stepLabel = STEPS.find((s) => s.step === job.step)?.label ?? String(job.step);

      await saveMessage({
        lead_id:     job.lead_id,
        phone:       job.phone,
        direction:   "out",
        content:     message,
        timestamp,
        sender_name: `Follow-up ${stepLabel}`,
        status:      "sent",
        ...(msgId && { wa_msg_id: msgId }),
      });

      await logAction({
        lead_id:    job.lead_id,
        type:       "followup",
        message:    `Follow-up step ${job.step} (${stepLabel}) enviado para ${job.phone}.`,
        created_at: new Date().toISOString(),
      });

      await docSnap.ref.update({ done: true });
      processed++;
    } catch (err) {
      console.error(`[FollowUp] Erro no job ${docSnap.id}:`, err);
    }
  }

  return processed;
}
