/**
 * sdrDispatchService.ts
 * Dispara o SDR especializado via WhatsApp imediatamente quando um lead entra.
 * Chamado pelos webhooks Meta, Google e por entrada manual.
 */

import { supabaseAdmin }          from "@/lib/supabase-admin";
import { sendWhatsAppForLead }    from "@/services/notificationService";
import { saveMessage }            from "@/services/conversationService";
import { logAction }              from "@/services/logsService";

const DOMINUS_URL = process.env.DOMINUS_URL ?? "";

// ─── Detect SDR name from product slug ───────────────────────────────────────
const SDR_NAMES: Record<string, string> = {
  social:  "ALEX",
  traffic: "MAX",
  video:   "LEO",
  design:  "ANA",
  pack:    "VERA",
};

// ─── Route source/campaign to product slug ───────────────────────────────────
async function detectProductSlug(source: string): Promise<string | null> {
  const lower = (source ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const { data } = await supabaseAdmin
    .from("sdr_routing")
    .select("product_slug, priority")
    .order("priority", { ascending: false });
  if (!data?.length) return null;
  const match = data.find(r => lower.includes(r.pattern ?? ""));
  return match?.product_slug ?? null;
}

// ─── Build opening message from DOMINUS sdr-product ──────────────────────────
async function getSDROpening(lead: Record<string, unknown>): Promise<{ message: string; agent: string } | null> {
  if (!DOMINUS_URL) return null;
  try {
    const res = await fetch(`${DOMINUS_URL}/api/agents/sdr-product`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        leadName: (lead.name as string) ?? "cliente",
        source:   (lead.source as string) ?? (lead.campaign_name as string) ?? "",
        history:  "",
        leadId:   lead.id as string,
      }),
    });
    if (!res.ok) return null;
    const { message, agent } = await res.json() as { message: string; agent: string };
    return message ? { message, agent: agent ?? "SDR" } : null;
  } catch (err) {
    console.error("[dispatchSDR] DOMINUS error:", err);
    return null;
  }
}

// ─── Main dispatch function ───────────────────────────────────────────────────
export async function dispatchSDR(leadId: string): Promise<{ dispatched: boolean; reason?: string }> {
  // 1. Fetch lead
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (error || !lead) return { dispatched: false, reason: "lead_not_found" };

  const phone = (lead.phone as string | undefined)?.trim();
  if (!phone) return { dispatched: false, reason: "no_phone" };

  // 2. Prevent double-dispatch (SDR already triggered)
  if (lead.sdr_dispatched_at) return { dispatched: false, reason: "already_dispatched" };

  // 3. Detect product + SDR name
  const source      = (lead.source as string) ?? (lead.campaign_name as string) ?? "";
  const productSlug = await detectProductSlug(source);
  const sdrName     = (productSlug ? SDR_NAMES[productSlug] : null) ?? "ALEX";

  // 4. Get opening message from DOMINUS
  const sdr = await getSDROpening(lead);
  const message = sdr?.message ?? buildFallbackOpening(lead, sdrName);
  const agent   = sdr?.agent  ?? sdrName;

  // 5. Send WhatsApp
  try {
    const msgId = await sendWhatsAppForLead(phone, message, leadId);

    // 6. Save conversation
    await saveMessage({
      lead_id:     leadId,
      phone,
      direction:   "out",
      content:     message,
      timestamp:   new Date().toISOString(),
      sender_name: agent,
      status:      "sent",
      ...(msgId && { wa_msg_id: msgId }),
    });

    // 7. Update lead: status contato + sdr_dispatched_at + product slug
    await supabaseAdmin.from("leads").update({
      status:             "contato",
      status_updated_at:  new Date().toISOString(),
      sdr_dispatched_at:  new Date().toISOString(),
      sdr_agent:          agent,
      ...(productSlug && { campaign_name: productSlug }),
      updated_at:         new Date().toISOString(),
    }).eq("id", leadId);

    // 8. Log
    await logAction({
      lead_id:    leadId,
      type:       "sdr_dispatch",
      message:    `SDR ${agent} disparado para ${phone} (produto: ${productSlug ?? "geral"}).`,
      created_at: new Date().toISOString(),
    });

    console.log(`[dispatchSDR] ✅ ${agent} → ${phone} (lead: ${leadId})`);
    return { dispatched: true };
  } catch (err) {
    console.error("[dispatchSDR] Falha ao enviar WhatsApp:", err);
    return { dispatched: false, reason: "whatsapp_error" };
  }
}

// ─── Fallback opening if DOMINUS is unavailable ───────────────────────────────
function buildFallbackOpening(lead: Record<string, unknown>, sdrName: string): string {
  const firstName = ((lead.name as string) ?? "").split(" ")[0] || "tudo bem";
  return `Oi ${firstName}! Aqui é o ${sdrName} da BEACE. Vi que você demonstrou interesse nos nossos serviços. Como posso te ajudar? 😊`;
}
