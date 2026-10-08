import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWhatsAppForLead } from "@/services/notificationService";
import { saveMessage } from "@/services/conversationService";
import { logAction } from "@/services/logsService";

export interface FollowUpJob {
  id?:      string;
  lead_id:  string;
  name:     string;
  phone:    string;
  step:     1 | 2 | 3 | 4;
  run_at:   string; // ISO string
  done:     boolean;
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
  const now = Date.now();

  const jobs: Omit<FollowUpJob, "id">[] = STEPS.map(({ step, delayMs }) => ({
    lead_id,
    name,
    phone,
    step,
    run_at: new Date(now + delayMs).toISOString(),
    done: false,
  }));

  const { error } = await supabaseAdmin.from("followup_jobs").insert(jobs);
  if (error) console.error("[FollowUp] Erro ao agendar follow-ups:", error);
  else console.log(`[FollowUp] Agendados ${STEPS.length} steps para ${name} (${phone}): D+1, D+3, D+7, D+15`);
}

export async function processPendingFollowUps(): Promise<number> {
  const now = new Date().toISOString();

  const { data: jobs, error } = await supabaseAdmin
    .from("followup_jobs")
    .select("*")
    .eq("done", false)
    .lte("run_at", now)
    .limit(50);

  if (error) {
    console.error("[FollowUp] Erro ao buscar jobs:", error);
    return 0;
  }

  if (!jobs || jobs.length === 0) return 0;

  let processed = 0;

  for (const job of jobs as FollowUpJob[]) {
    // Verifica se lead já converteu ou está em modo humano
    if (job.lead_id) {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("status, mode, human_until")
        .eq("id", job.lead_id)
        .single();

      if (lead) {
        // Cancela restante se lead converteu
        if (CONVERTED_STATUSES.has(lead.status ?? "")) {
          await supabaseAdmin.from("followup_jobs").update({ done: true }).eq("id", job.id);
          continue;
        }

        // Pausa se em modo humano
        if (lead.mode === "human" && lead.human_until && new Date(lead.human_until) > new Date()) {
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
        created_at: timestamp,
      });

      await supabaseAdmin.from("followup_jobs").update({ done: true }).eq("id", job.id);
      processed++;
    } catch (err) {
      console.error(`[FollowUp] Erro no job ${job.id}:`, err);
    }
  }

  return processed;
}
