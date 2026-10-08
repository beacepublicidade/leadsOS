import { sendWhatsApp } from "@/services/notificationService";
import { logAction }    from "@/services/logsService";

/**
 * Envia notificação para o supervisor via WhatsApp.
 * Configurado por SUPERVISOR_PHONE no .env (número do gestor).
 */
export async function notifySupervisor(message: string, lead_id = ""): Promise<void> {
  const phone = process.env.SUPERVISOR_PHONE;
  if (!phone) return; // silencioso se não configurado

  try {
    await sendWhatsApp(phone, message);
    await logAction({
      lead_id,
      type:       "notification",
      message:    `Supervisor notificado: ${message.slice(0, 100)}`,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Supervisor] Erro ao notificar:", err);
  }
}

export async function notifyHotLead(lead: { id: string; name: string; phone: string; score: number }): Promise<void> {
  const msg =
    `🔥 Lead quente detectado!\n` +
    `Nome: ${lead.name}\n` +
    `Fone: ${lead.phone}\n` +
    `Score: ${lead.score}/100\n` +
    `👉 Acesse o dashboard para retomar.`;
  await notifySupervisor(msg, lead.id);
}

export async function notifyConversion(lead: { id: string; name: string; phone: string }, event: "proposta" | "fechado"): Promise<void> {
  const emoji = event === "fechado" ? "🎉" : "📄";
  const label = event === "fechado" ? "FECHOU negócio!" : "Entrou em proposta";
  const msg   =
    `${emoji} ${label}\n` +
    `Nome: ${lead.name}\n` +
    `Fone: ${lead.phone}`;
  await notifySupervisor(msg, lead.id);
}

export async function notifyStagnatedLead(lead: { id: string; name: string; phone: string; status: string; hours: number }): Promise<void> {
  const msg =
    `⏰ Lead estagnado há ${lead.hours}h!\n` +
    `Nome: ${lead.name} | ${lead.phone}\n` +
    `Etapa atual: ${lead.status}\n` +
    `👉 Revise no dashboard.`;
  await notifySupervisor(msg, lead.id);
}
