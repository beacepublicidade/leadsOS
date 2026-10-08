export const dynamic    = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMedia } from "@/services/notificationService";
import { saveMessage } from "@/services/conversationService";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

const HUMAN_TAKEOVER_MS = 30 * 60 * 1000;

// POST /api/conversations/[lead_id]/media — send a file via WhatsApp
export async function POST(
  req: NextRequest,
  { params }: { params: { lead_id: string } }
) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Arquivo muito grande (máx. 15 MB)." }, { status: 400 });
    }

    const db      = getAdminDb();
    const session = await getSessionUser(req);

    const leadDoc = await db.collection("leads").doc(params.lead_id).get();
    if (!leadDoc.exists) {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }

    if (!session?.isAdmin && session?.client_id) {
      const leadClientId = leadDoc.data()?.client_id as string | undefined;
      if (leadClientId !== session.client_id) {
        return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
      }
    }

    const phone = leadDoc.data()?.phone as string;
    if (!phone) {
      return NextResponse.json({ success: false, error: "Lead sem telefone cadastrado." }, { status: 400 });
    }

    // Determine media type from MIME
    const mime = file.type;
    let mediatype: "document" | "image" | "video" | "audio" = "document";
    if (mime.startsWith("image/"))  mediatype = "image";
    else if (mime.startsWith("video/")) mediatype = "video";
    else if (mime.startsWith("audio/")) mediatype = "audio";

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString("base64");

    // Get sender name
    let senderName = "Sistema";
    if (session?.email) {
      const userSnap = await db.collection("users").where("email", "==", session.email).limit(1).get();
      senderName = userSnap.empty
        ? session.email.split("@")[0]
        : (userSnap.docs[0].data().name as string | undefined) ?? session.email.split("@")[0];
    }

    // Human takeover
    const humanUntil = new Date(Date.now() + HUMAN_TAKEOVER_MS).toISOString();
    await leadDoc.ref.update({ mode: "human", human_until: humanUntil });

    // Send media
    const msgId = await sendWhatsAppMedia(phone, base64, file.name, mediatype);

    // Log message
    await saveMessage({
      lead_id:     params.lead_id,
      phone,
      direction:   "out",
      content:     `📎 ${file.name}`,
      timestamp:   new Date().toISOString(),
      sender_name: senderName,
      status:      "sent",
      ...(msgId && { zapi_id: msgId }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/conversations/media]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
