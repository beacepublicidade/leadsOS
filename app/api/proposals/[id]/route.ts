export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";
import { sendWhatsApp } from "@/services/notificationService";
import { logAction } from "@/services/logsService";
import { createPixCharge } from "@/services/coraService";

// GET /api/proposals/[id] — retorna proposta + dados do lead
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const { data: p, error } = await supabaseAdmin.from("proposals").select("*").eq("id", params.id).single();
    if (error || !p) return NextResponse.json({ success: false, error: "Não encontrada." }, { status: 404 });

    const { data: lead } = await supabaseAdmin.from("leads").select("*").eq("id", p.lead_id as string).single();
    const result = { ...p, lead: lead ?? {} };

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[GET /api/proposals/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}

// DELETE /api/proposals/[id] — remove proposta
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const { data: proposal, error: fetchError } = await supabaseAdmin.from("proposals").select("*").eq("id", params.id).single();
    if (fetchError || !proposal) return NextResponse.json({ success: false, error: "Proposta não encontrada." }, { status: 404 });

    const { error } = await supabaseAdmin.from("proposals").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/proposals/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}

// PATCH /api/proposals/[id] — atualiza status da proposta
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const body = await req.json() as {
      action?: string;
      service_title?: string;
      service_desc?: string;
      amount?: number;
      payment_terms?: string;
      notes?: string;
    };

    const validActions = ["mark_paid", "retry_charge", "mark_sent", "edit", "send_whatsapp"];
    if (!body.action || !validActions.includes(body.action)) {
      return NextResponse.json({ success: false, error: "Ação inválida." }, { status: 400 });
    }

    const { data: proposal, error: fetchError } = await supabaseAdmin.from("proposals").select("*").eq("id", params.id).single();
    if (fetchError || !proposal) return NextResponse.json({ success: false, error: "Proposta não encontrada." }, { status: 404 });

    const now = new Date().toISOString();

    // ── edit: atualiza campos editáveis da proposta ────────────────────────────
    if (body.action === "edit") {
      const updates: Record<string, unknown> = {};
      if (body.service_title !== undefined) updates.service_title  = body.service_title;
      if (body.service_desc  !== undefined) updates.service_desc   = body.service_desc;
      if (body.amount        !== undefined) updates.amount         = body.amount;
      if (body.payment_terms !== undefined) updates.payment_terms  = body.payment_terms;
      if (body.notes         !== undefined) updates.notes          = body.notes;
      updates.updated_at = new Date().toISOString();
      const { error } = await supabaseAdmin.from("proposals").update(updates).eq("id", params.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ── mark_sent: marca proposta como enviada manualmente ─────────────────────
    if (body.action === "mark_sent") {
      const { error } = await supabaseAdmin.from("proposals").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", params.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ── send_whatsapp: envia proposta via WhatsApp + muda status para sent ──────
    if (body.action === "send_whatsapp") {
      const { data: lead, error: leadError } = await supabaseAdmin.from("leads").select("*").eq("id", proposal.lead_id as string).single();
      if (leadError || !lead) return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
      const phone = (lead.phone as string) ?? "";
      if (!phone) return NextResponse.json({ success: false, error: "Lead sem telefone cadastrado." }, { status: 400 });

      // Busca configurações da empresa para personalizar a mensagem
      const clientId = (proposal.client_id as string) ?? "";
      let agencyName = "nossa agência";
      if (clientId) {
        const { data: settings } = await supabaseAdmin.from("company_settings").select("company_name").eq("id", clientId).single();
        if (settings?.company_name) agencyName = settings.company_name as string;
      }

      const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      const validUntil = proposal.valid_until
        ? new Date(proposal.valid_until as string).toLocaleDateString("pt-BR")
        : "";
      const paymentLine = proposal.payment_terms
        ? `\n💳 *Pagamento:* ${proposal.payment_terms}`
        : "";

      const msg = `Olá, ${lead.name}! 👋\n\nSegue a proposta comercial conforme conversamos:\n\n📄 *${proposal.service_title}*\n💰 *Investimento:* ${fmt(proposal.amount as number)}${paymentLine}${validUntil ? `\n📅 *Válida até:* ${validUntil}` : ""}\n\nPara aceitar esta proposta, basta responder esta mensagem com *"Aceito"* ou *"Confirmo"*.\n\nO aceite via WhatsApp tem validade e equivale à confirmação do serviço. Em breve entraremos em contato para os próximos passos.\n\nQualquer dúvida, estamos à disposição! 😊\n\n— ${agencyName}`;

      await sendWhatsApp(phone, msg);
      const { error } = await supabaseAdmin.from("proposals").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", params.id);
      if (error) throw error;

      logAction({
        lead_id:    proposal.lead_id as string,
        type:       "notification",
        message:    `Proposta ${proposal.proposal_number} enviada via WhatsApp para ${phone}.`,
        created_at: new Date().toISOString(),
      }).catch(() => {});

      return NextResponse.json({ success: true });
    }

    // ── retry_charge: re-tenta criar cobrança Cora para proposta assinada sem PIX ──
    if (body.action === "retry_charge") {
      if (proposal.status !== "signed") {
        return NextResponse.json({ success: false, error: "Retry só disponível para propostas assinadas sem cobrança." }, { status: 409 });
      }

      const { data: lead, error: leadError } = await supabaseAdmin.from("leads").select("*").eq("id", proposal.lead_id as string).single();
      if (leadError || !lead) return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });

      const chargeResult = await createPixCharge({
        amount:       proposal.amount as number,
        description:  proposal.service_title as string,
        payerName:    lead.name as string,
        payerTaxId:   (lead.tax_id as string) ?? "00000000000",
        daysUntilDue: 3,
      });

      const { error } = await supabaseAdmin.from("proposals").update({
        status:         "awaiting_payment",
        cora_charge_id: chargeResult.chargeId,
        pix_code:       chargeResult.pixCode   ?? "",
        pix_qrcode:     chargeResult.pixQrCode ?? "",
        boleto_url:     chargeResult.boletoUrl ?? "",
      }).eq("id", params.id);
      if (error) throw error;

      const phone = (lead.phone as string) ?? "";
      if (phone && chargeResult.pixCode) {
        await sendWhatsApp(
          phone,
          `✅ Olá, ${lead.name}!\n\nSua cobrança foi gerada:\n\n💳 *PIX Copia e Cola:*\n\`${chargeResult.pixCode}\`\n\nQualquer dúvida, estamos aqui! 🙂`,
        );
      }

      logAction({
        lead_id:    proposal.lead_id as string,
        type:       "notification",
        message:    `Cobrança PIX re-gerada para proposta ${proposal.proposal_number}.`,
        created_at: new Date().toISOString(),
      }).catch(() => {});

      return NextResponse.json({ success: true });
    }

    // ── mark_paid: marca proposta como paga manualmente ──────────────────────
    if (proposal.status === "paid") {
      return NextResponse.json({ success: false, error: "Proposta já marcada como paga." }, { status: 409 });
    }

    const { error: paidError } = await supabaseAdmin.from("proposals").update({ status: "paid", paid_at: now }).eq("id", params.id);
    if (paidError) throw paidError;

    // Atualiza lead como fechado
    await supabaseAdmin.from("leads").update({
      status:            "fechado",
      status_changed_at: now,
    }).eq("id", proposal.lead_id as string);

    // Envia mensagem de onboarding via WhatsApp
    const { data: lead } = await supabaseAdmin.from("leads").select("*").eq("id", proposal.lead_id as string).single();
    const phone   = (lead?.phone as string) ?? "";
    const onboardingMsg = process.env.ONBOARDING_MESSAGE
      ?.replace("{nome}", lead?.name as string)
      ?? `🎉 Pagamento confirmado! Bem-vindo, ${lead?.name}!\n\nSua contratação está confirmada. Em breve nossa equipe entrará em contato para dar início ao seu projeto.\n\nObrigado pela confiança! 🙏`;

    if (phone) {
      await sendWhatsApp(phone, onboardingMsg);
    }

    logAction({
      lead_id:    proposal.lead_id as string,
      type:       "notification",
      message:    `Proposta ${proposal.proposal_number} marcada como paga manualmente. Lead movido para Fechado. Onboarding disparado.`,
      created_at: "",
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/proposals/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}
