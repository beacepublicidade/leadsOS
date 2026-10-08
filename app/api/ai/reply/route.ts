export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getConversation } from "@/services/conversationService";
import { getAdminDb }      from "@/lib/firebase-admin";

// POST /api/ai/reply
// Repassa a conversa para o DOMINUS (REX) e envia a resposta via WhatsApp
export async function POST(req: NextRequest) {
  try {
    const { lead_id, auto = false } = await req.json() as { lead_id?: string; auto?: boolean };

    if (!lead_id) {
      return NextResponse.json({ success: false, error: "lead_id obrigatório." }, { status: 400 });
    }

    const dominusUrl = process.env.DOMINUS_URL;
    if (!dominusUrl) {
      return NextResponse.json({ success: false, error: "DOMINUS_URL não configurada." }, { status: 500 });
    }

    const db      = getAdminDb();
    const leadDoc = await db.collection("leads").doc(lead_id).get();
    if (!leadDoc.exists) {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }

    const lead      = leadDoc.data() as Record<string, unknown>;
    const leadName  = (lead.name    as string | undefined) ?? "cliente";
    const leadPhone = (lead.phone   as string | undefined) ?? "";
    const source    = (lead.source  as string | undefined)
                   ?? (lead.campaign_name as string | undefined)
                   ?? "não informada";

    const messages = await getConversation(lead_id);
    const history  = messages.slice(-10).map((m) => {
      const who = m.direction === "in" ? leadName : "REX";
      return `${who}: ${m.content}`;
    }).join("\n");

    // Chama o REX no DOMINUS
    const rexRes = await fetch(`${dominusUrl}/api/agents/rex`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ leadName, source, history, leadId: lead_id }),
    });

    if (!rexRes.ok) {
      const err = await rexRes.text();
      throw new Error(`DOMINUS/REX erro (${rexRes.status}): ${err.slice(0, 200)}`);
    }

    const { message, shouldHandoff } = await rexRes.json() as { message: string; shouldHandoff: boolean };

    if (!message) {
      return NextResponse.json({ success: false, error: "REX não retornou resposta." }, { status: 500 });
    }

    // Handoff: lead qualificado → notifica Robson + pausa REX por 24h
    if (shouldHandoff) {
      const { notifySupervisor } = await import("@/services/supervisorService");
      const humanUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await Promise.all([
        db.collection("leads").doc(lead_id).update({ mode: "human", human_until: humanUntil }),
        notifySupervisor(
          `🎯 Lead pronto pro closer!\nNome: ${leadName}\nFone: ${leadPhone}\nREX qualificou — só fechar o valor.`,
          lead_id
        ),
      ]);
    }

    if (auto) {
      const { sendWhatsApp } = await import("@/services/notificationService");
      const { saveMessage }  = await import("@/services/conversationService");
      await sendWhatsApp(leadPhone, message);
      await saveMessage({
        lead_id, phone: leadPhone, direction: "out",
        content: message, timestamp: new Date().toISOString(), sender_name: "REX",
      });
      return NextResponse.json({ success: true, sent: true, message, handoff: shouldHandoff });
    }

    return NextResponse.json({ success: true, sent: false, message, handoff: shouldHandoff });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ai/reply]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
