import { sendWhatsApp } from "@/services/notificationService";
import { logAction } from "@/services/logsService";

const TEN_MINUTES = 10 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export function scheduleFollowUps(name: string, phone: string, lead_id = ""): void {
  const firstName = name.split(" ")[0];

  // Follow-up 1 — 10 minutos
  setTimeout(async () => {
    console.log(`[LeadsOS] Sending follow-up 1 to ${phone}`);
    await sendWhatsApp(
      phone,
      `Oi ${firstName}, só passando pra ver se conseguiu ver nossa mensagem 🙂`
    );
    logAction({ lead_id, type: "followup", message: `Follow-up 1 (10min) enviado para ${phone}.`, created_at: "" }).catch(() => {});
  }, TEN_MINUTES);

  // Follow-up 2 — 24 horas
  setTimeout(async () => {
    console.log(`[LeadsOS] Sending follow-up 2 to ${phone}`);
    await sendWhatsApp(
      phone,
      `Última mensagem aqui ${firstName}! Posso te ajudar com algo?`
    );
    logAction({ lead_id, type: "followup", message: `Follow-up 2 (24h) enviado para ${phone}.`, created_at: "" }).catch(() => {});
  }, TWENTY_FOUR_HOURS);

  console.log(`[LeadsOS] Follow-ups scheduled for ${name} (${phone}): 10min and 24h`);
}
