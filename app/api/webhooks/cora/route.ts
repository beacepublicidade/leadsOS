export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
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
    const snap = await getAdminDb()
      .collection("proposals")
      .where("cora_charge_id", "==", coraChargeId)
      .limit(1)
      .get();

    if (snap.empty) return NextResponse.json({ received: true });

    const proposalDoc = snap.docs[0];
    const proposal    = { id: proposalDoc.id, ...proposalDoc.data() } as Record<string, unknown>;

    if (proposal.status === "paid") return NextResponse.json({ received: true });

    const now = new Date().toISOString();

    // Atualiza proposta como paga
    await proposalDoc.ref.update({ status: "paid", paid_at: now });

    // Atualiza lead como fechado
    await getAdminDb().collection("leads").doc(proposal.lead_id as string).update({
      status:            "fechado",
      status_changed_at: now,
    });

    // Busca dados do lead para onboarding
    const leadDoc = await getAdminDb().collection("leads").doc(proposal.lead_id as string).get();
    const lead    = leadDoc.data() as Record<string, unknown>;

    // Mensagem de onboarding via WhatsApp
    const phone       = (lead.phone as string) ?? "";
    const onboardingMsg = process.env.ONBOARDING_MESSAGE
      ?.replace("{nome}", lead.name as string)
      ?? `🎉 Pagamento confirmado! Bem-vindo, ${lead.name}!\n\nSua contratação está confirmada. Em breve nossa equipe entrará em contato para dar início ao seu projeto.\n\nObrigado pela confiança! 🙏`;

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
