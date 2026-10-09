export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveMessage, findLeadByPhone, updateMessageStatus } from "@/services/conversationService";
import { supabaseAdmin } from "@/lib/supabase-admin";

function extractContent(body: Record<string, unknown>) {
  let content   = "";
  let media_type: "audio" | "image" | "document" | undefined;
  let media_url: string | undefined;

  const textPayload  = body.text     as Record<string, unknown> | undefined;
  const audioPayload = body.audio    as Record<string, unknown> | undefined;
  const imagePayload = body.image    as Record<string, unknown> | undefined;
  const docPayload   = body.document as Record<string, unknown> | undefined;

  if (textPayload?.message) {
    content = textPayload.message as string;
  } else if (audioPayload) {
    media_type = "audio";
    media_url  = (audioPayload.audioUrl ?? audioPayload.base64 ?? "") as string;
    content    = "[Áudio]";
  } else if (imagePayload) {
    media_type = "image";
    media_url  = (imagePayload.imageUrl ?? imagePayload.base64 ?? "") as string;
    content    = (imagePayload.caption as string | undefined) || "[Imagem]";
  } else if (docPayload) {
    media_type = "document";
    media_url  = (docPayload.documentUrl ?? docPayload.base64 ?? "") as string;
    content    = (docPayload.fileName as string | undefined) || "[Documento]";
  } else {
    content = body.body as string ?? "";
  }

  return { content, media_type, media_url };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    console.log("[ZAPI WEBHOOK] payload:", JSON.stringify(body));

    const type  = body.type  as string | undefined;
    const phone = body.phone as string | undefined;

    if (!phone) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // MessageStatusCallback — atualiza status de entrega (sent/delivered/read)
    if (type === "MessageStatusCallback") {
      const status    = (body.status as string | undefined)?.toLowerCase();
      const messageId = body.messageId as string | undefined;

      if (messageId && (status === "delivered" || status === "read")) {
        await updateMessageStatus(
          messageId,
          status as "delivered" | "read"
        );
      }
      return NextResponse.json({ success: true });
    }

    // ReceivedCallback = client sent to us
    // SentCallback     = we sent from the WhatsApp app directly
    if (type !== "ReceivedCallback" && type !== "SentCallback") {
      console.log("[ZAPI WEBHOOK] skipped — type:", type);
      return NextResponse.json({ success: true, skipped: true });
    }

    const { content, media_type, media_url } = extractContent(body);

    if (!content && !media_url) {
      console.log("[ZAPI WEBHOOK] skipped — no content or media");
      return NextResponse.json({ success: true, skipped: true });
    }

    const lead_id = await findLeadByPhone(phone);
    console.log("[ZAPI WEBHOOK] lead_id found:", lead_id, "type:", type);

    const direction   = type === "SentCallback" ? "out" : "in";
    const sender_name = type === "SentCallback" ? "WhatsApp" : undefined;

    await saveMessage({
      lead_id:   lead_id ?? "",
      phone,
      direction,
      content,
      timestamp: new Date().toISOString(),
      ...(sender_name && { sender_name }),
      ...(media_type  && { media_type }),
      ...(media_url   && { media_url }),
    });

    // Recalcula score e verifica notificação supervisor quando lead responde
    if (type === "ReceivedCallback" && lead_id) {
      const { recalculateLeadScore } = await import("@/services/scoringService");
      const { notifyHotLead }        = await import("@/services/supervisorService");
      recalculateLeadScore(lead_id).then(async (score) => {
        if (score >= 75) {
          const { data: ld } = await supabaseAdmin.from("leads").select("*").eq("id", lead_id).single();
          if (ld && !ld.supervisor_hot_notified) {
            await notifyHotLead({ id: lead_id, name: ld.name as string, phone: ld.phone as string, score });
            await supabaseAdmin.from("leads").update({ supervisor_hot_notified: true }).eq("id", lead_id);
          }
        }
      }).catch(() => {});
    }

    // Auto-reply por IA — só para mensagens recebidas de leads conhecidos em modo auto
    if (type === "ReceivedCallback" && lead_id && !media_type) {
      try {
        const { data: leadData } = await supabaseAdmin.from("leads").select("*").eq("id", lead_id).single();
        const mode       = leadData?.mode       as string | undefined ?? "auto";
        const humanUntil = leadData?.human_until as string | undefined;
        const aiReply    = leadData?.ai_reply   as boolean | undefined ?? false;

        const isHuman = mode === "human" && humanUntil && new Date(humanUntil) > new Date();

        if (!isHuman && aiReply) {
          const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "https://leads-os.vercel.app";

          fetch(`${baseUrl}/api/ai/reply`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ lead_id, auto: true }),
          }).catch((e) => console.error("[ZAPI] auto-reply error:", e));
        }
      } catch (e) {
        console.error("[ZAPI] auto-reply check error:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/webhooks/zapi]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
