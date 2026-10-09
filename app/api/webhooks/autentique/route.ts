export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createPixCharge } from "@/services/coraService";
import { sendWhatsApp } from "@/services/notificationService";
import { logAction } from "@/services/logsService";

// POST /api/webhooks/autentique — recebe evento de documento assinado
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      event?: {
        type?: string;
        data?: {
          id?: string;
          signed_count?: number;
          signatures_count?: number;
        };
      };
    };

    const eventType = body.event?.type;

    // Só processa quando o documento é finalizado (todos assinaram)
    if (eventType !== "document.finished" && eventType !== "document.signed") {
      return NextResponse.json({ received: true });
    }

    const autentiqueDocId = body.event?.data?.id;
    if (!autentiqueDocId) return NextResponse.json({ received: true });

    // Busca a proposta correspondente
    const { data: proposalData, error: propError } = await supabaseAdmin
      .from("proposals")
      .select("*")
      .eq("autentique_id", autentiqueDocId)
      .limit(1)
      .single();

    if (propError || !proposalData) return NextResponse.json({ received: true });

    const proposal = proposalData as Record<string, unknown>;

    // Já tem cobrança ou foi pago — não reprocessa
    if (proposal.status === "awaiting_payment" || proposal.status === "paid") {
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();

    // Atualiza proposta como assinada (se ainda não estava)
    if (proposal.status !== "signed") {
      await supabaseAdmin.from("proposals").update({ status: "signed", signed_at: now }).eq("id", proposal.id as string);
    }

    // Busca dados do lead para gerar cobrança
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", proposal.lead_id as string)
      .single();

    if (leadError || !lead) return NextResponse.json({ received: true });

    // Gera cobrança PIX na Cora
    let chargeResult;
    try {
      chargeResult = await createPixCharge({
        amount:       proposal.amount as number,
        description:  proposal.service_title as string,
        payerName:    lead.name as string,
        payerTaxId:   (lead.tax_id as string) ?? "00000000000",
        daysUntilDue: 3,
      });

      await supabaseAdmin.from("proposals").update({
        status:         "awaiting_payment",
        cora_id:        chargeResult.chargeId,
        pix_code:       chargeResult.pixCode   ?? "",
        pix_qrcode:     chargeResult.pixQrCode ?? "",
        boleto_url:     chargeResult.boletoUrl ?? "",
      }).eq("id", proposal.id as string);

    } catch (coraErr) {
      console.error("[Autentique webhook] Erro ao criar cobrança Cora:", coraErr);
    }

    // Envia PIX via WhatsApp para o lead
    const phone = (lead.phone as string) ?? "";
    if (phone && chargeResult?.pixCode) {
      await sendWhatsApp(
        phone,
        `✅ Obrigado por assinar a proposta, ${lead.name}!\n\nAgora é só realizar o pagamento para confirmarmos tudo:\n\n💳 *PIX Copia e Cola:*\n\`${chargeResult.pixCode}\`\n\nQualquer dúvida, estamos aqui! 🙂`,
      );
    }

    logAction({
      lead_id:    proposal.lead_id as string,
      type:       "notification",
      message:    `Proposta ${proposal.proposal_number} assinada. Cobrança PIX criada na Cora.`,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[POST /api/webhooks/autentique]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
