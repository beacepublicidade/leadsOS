import { sendWhatsApp } from "@/services/notificationService";
import { getTemplateByTrigger, interpolate } from "@/services/templatesService";

interface AutomationContext {
  name:       string;
  phone:      string;
  client_id?: string;
}

// Fallback messages used when no template is found in Firestore
const DEFAULT_MESSAGES: Partial<Record<string, (ctx: AutomationContext) => string>> = {
  contato:  ({ name }) => `Oi ${name}, vi que você demonstrou interesse. Posso te ajudar?`,
  proposta: ()         => `Já te enviei a proposta, qualquer dúvida me chama 🙂`,
  fechado:  ()         => `Bem-vindo! Vamos começar 🚀`,
};

export async function runStatusAutomation(
  status: string,
  ctx: AutomationContext
): Promise<void> {
  let message: string | null = null;

  // 1. Try fetching template from Firestore (client-specific first, then global)
  const template = await getTemplateByTrigger(status, ctx.client_id);

  if (template) {
    message = interpolate(template.message, { name: ctx.name, phone: ctx.phone });
    console.log(`[LeadsOS] Using Firestore template "${template.name}" for trigger "${status}"`);
  } else {
    // 2. Fallback to hardcoded defaults
    const buildDefault = DEFAULT_MESSAGES[status];
    if (!buildDefault) return; // no automation for this status
    message = buildDefault(ctx);
    console.log(`[LeadsOS] Using default message for trigger "${status}"`);
  }

  console.log(`[LeadsOS] Automation triggered for status "${status}" → ${ctx.phone}`);
  await sendWhatsApp(ctx.phone, message);
}
