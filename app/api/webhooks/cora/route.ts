export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWhatsApp } from "@/services/notificationService";
import { logAction } from "@/services/logsService";

// POST /api/webhooks/cora — recebe confirmação de pagamento
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type?:    string;
      invoice?: { id?: string; status?: string };
    };

    // Cora envia type = "invoice.paid" quando o pagamento é confirmado
    if (body.type !== "invoice.paid" && body.invoice?.status !== "PAID") {
      return NextResponse.json({ received: true });
    }

    const coraChargeId = body.invoice?.id;
    if (!coraChargeId) return NextResponse.json({ received: true });

    // Busca proposta pelo charge_id da Cora
    const { data: proposalData, error: propError } = await supabaseAdmin
      .from("proposals")
      .select("*")
      .eq("cora_id", coraChargeId)
      .limit(1)
      .single();

    if (propError || !proposalData) return NextResponse.json({ received: true });

    const proposal = proposalData as Record<string, unknown>;

    if (proposal.status === "paid") return NextResponse.json({ received: true });

    const now = new Date().toISOString();

    // Atualiza proposta como paga
    await supabaseAdmin.from("proposals").update({ status: "paid", paid_at: now }).eq("id", proposal.id as string);

    // Atualiza lead como fechado
    await supabaseAdmin.from("leads").update({
      status:            "fechado",
      status_changed_at: now,
    }).eq("id", proposal.lead_id as string);

    // Busca dados do lead para onboarding
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", proposal.lead_id as string)
      .single();

    // Mensagem de onboarding via WhatsApp
    const phone       = (lead?.phone as string) ?? "";
    const onboardingMsg = process.env.ONBOARDING_MESSAGE
      ?.replace("{nome}", lead?.name as string)
      ?? `🎉 Pagamento confirmado! Bem-vindo, ${lead?.name}!\n\nSua contratação está confirmada. Em breve nossa equipe entrará em contato para dar início ao seu projeto.\n\nObrigado pela confiança! 🙏`;

    if (phone) {
      await sendWhatsApp(phone, onboardingMsg);
    }

    logAction({
      lead_id:    proposal.lead_id as string,
      type:       "notification",
      message:    `Pagamento confirmado pela Cora. Lead movido para Fechado. Onboarding disparado.`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[POST /api/webhooks/cora]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
