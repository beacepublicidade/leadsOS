export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveMessage, findLeadByPhone, updateMessageStatus } from "@/services/conversationService";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Phone: "5511999999999@s.whatsapp.net" → "5511999999999"
function phoneFromJid(jid: string): string {
  return jid.replace(/@.*$/, "").replace(/:\d+$/, "");
}

// Map Evolution API status → our status
function mapStatus(evStatus: string): "sent" | "delivered" | "read" | null {
  switch (evStatus) {
    case "DELIVERY_ACK": return "delivered";
    case "READ":
    case "PLAYED":       return "read";
    default:             return null;
  }
}

// Extract text/media from Evolution message object
function extractContent(msg: Record<string, unknown>): {
  content: string;
  media_type?: "audio" | "image" | "document";
  media_url?: string;
} {
  // Plain text
  if (msg.conversation) return { content: msg.conversation as string };

  // Extended text (links, mentions)
  const ext = msg.extendedTextMessage as Record<string, unknown> | undefined;
  if (ext?.text) return { content: ext.text as string };

  // Image
  const img = msg.imageMessage as Record<string, unknown> | undefined;
  if (img) return {
    content:    (img.caption as string | undefined) || "[Imagem]",
    media_type: "image",
    media_url:  (img.url ?? img.jpegThumbnail ?? "") as string,
  };

  // Audio / PTT
  const audio = (msg.audioMessage ?? msg.pttMessage) as Record<string, unknown> | undefined;
  if (audio) return {
    content:    "[Áudio]",
    media_type: "audio",
    media_url:  (audio.url ?? "") as string,
  };

  // Document
  const doc = msg.documentMessage as Record<string, unknown> | undefined;
  if (doc) return {
    content:    (doc.fileName as string | undefined) || "[Documento]",
    media_type: "document",
    media_url:  (doc.url ?? "") as string,
  };

  // Video
  const vid = msg.videoMessage as Record<string, unknown> | undefined;
  if (vid) return {
    content:    (vid.caption as string | undefined) || "[Vídeo]",
    media_type: "document",
    media_url:  (vid.url ?? "") as string,
  };

  // Sticker / reaction — skip
  if (msg.stickerMessage || msg.reactionMessage) return { content: "" };

  return { content: "[Mensagem]" };
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json() as Record<string, unknown>;
    const event = body.event as string | undefined;

    // ── Status update ──────────────────────────────────────────────
    if (event === "messages.update") {
      const rawData = body.data;
      const updates: Array<Record<string, unknown>> = Array.isArray(rawData)
        ? rawData
        : (rawData && typeof rawData === "object" ? [rawData as Record<string, unknown>] : []);
      for (const upd of updates) {
        const key    = upd.key    as Record<string, unknown> | undefined;
        const update = upd.update as Record<string, unknown> | undefined;
        if (!key?.fromMe || !key.id) continue;
        const status = mapStatus((update?.status as string | undefined) ?? "");
        if (status) await updateMessageStatus(key.id as string, status);
      }
      return NextResponse.json({ success: true });
    }

    // ── Incoming / outgoing message ────────────────────────────────
    if (event !== "messages.upsert") {
      return NextResponse.json({ success: true, skipped: true });
    }

    const data = body.data as Record<string, unknown> | undefined;
    if (!data) return NextResponse.json({ success: true, skipped: true });

    const key     = data.key     as Record<string, unknown> | undefined;
    const message = data.message as Record<string, unknown> | undefined;

    if (!key || !message) return NextResponse.json({ success: true, skipped: true });

    const remoteJid = key.remoteJid as string | undefined;
    if (!remoteJid || remoteJid.includes("@g.us")) {
      // Skip group messages
      return NextResponse.json({ success: true, skipped: true });
    }

    // For @lid contacts use the full JID as identifier so we can send back to them
    const isLid  = remoteJid.endsWith("@lid");
    const phone  = isLid ? remoteJid : phoneFromJid(remoteJid);
    const fromMe    = key.fromMe as boolean;
    const messageId = key.id    as string;
    const pushName  = data.pushName as string | undefined;

    const { content, media_type, media_url } = extractContent(message);

    if (!content && !media_url) {
      return NextResponse.json({ success: true, skipped: true });
    }

    let lead_id = await findLeadByPhone(phone);

    // Auto-create lead for unknown incoming contacts (handles @lid and new numbers)
    if (!lead_id && !fromMe) {
      const { data: newLead, error } = await supabaseAdmin.from("leads").insert({
        name:       pushName || phone,
        phone,
        status:     "novo",
        source:     "WhatsApp",
        score:      0,
        client_id:  null,
        created_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      lead_id = newLead.id;
    }

    const direction:   "in" | "out" = fromMe ? "out" : "in";
    const sender_name: string | undefined = fromMe ? "WhatsApp" : undefined;

    await saveMessage({
      lead_id:   lead_id ?? "",
      phone,
      direction,
      content,
      timestamp:  new Date().toISOString(),
      zapi_id:    messageId,
      ...(fromMe && { status: "sent" as const }),
      ...(sender_name && { sender_name }),
      ...(media_type  && { media_type }),
      ...(media_url   && { media_url }),
    });

    // Recalculate score + notify supervisor for incoming messages
    if (!fromMe && lead_id) {
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

    // Auto-reply by AI — only incoming, lead in auto mode with ai_reply on
    if (!fromMe && lead_id) {
      try {
        const { data: leadData } = await supabaseAdmin.from("leads").select("*").eq("id", lead_id).single();
        const mode       = leadData?.mode       as string | undefined ?? "auto";
        const humanUntil = leadData?.human_until as string | undefined;
        const aiReply    = leadData?.ai_reply   as boolean | undefined ?? false;
        const isHuman    = mode === "human" && humanUntil && new Date(humanUntil) > new Date();

        if (!isHuman && aiReply && !media_type) {
          const baseUrl = process.env.NEXTAUTH_URL
            ? process.env.NEXTAUTH_URL
            : "https://leads-os.vercel.app";
          fetch(`${baseUrl}/api/ai/reply`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ lead_id, auto: true }),
          }).catch((e) => console.error("[EVOLUTION] auto-reply error:", e));
        }
      } catch (e) {
        console.error("[EVOLUTION] auto-reply check error:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/webhooks/evolution]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
