export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getConversation, saveMessage } from "@/services/conversationService";
import { sendWhatsApp } from "@/services/notificationService";
import { getAdminDb } from "@/lib/firebase-admin";

// GET /api/conversations/[lead_id] — fetch conversation history
export async function GET(
  _req: NextRequest,
  { params }: { params: { lead_id: string } }
) {
  try {
    const messages = await getConversation(params.lead_id);
    return NextResponse.json({ success: true, data: messages });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar conversa" }, { status: 500 });
  }
}

// POST /api/conversations/[lead_id] — send a message to the lead
export async function POST(
  req: NextRequest,
  { params }: { params: { lead_id: string } }
) {
  try {
    const { message } = await req.json() as { message?: string };

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: "Mensagem não pode estar vazia." }, { status: 400 });
    }

    // Get lead phone
    const leadDoc = await getAdminDb().collection("leads").doc(params.lead_id).get();
    if (!leadDoc.exists) {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }

    const phone = leadDoc.data()?.phone as string;
    if (!phone) {
      return NextResponse.json({ success: false, error: "Lead sem telefone cadastrado." }, { status: 400 });
    }

    // Send WhatsApp
    await sendWhatsApp(phone, message);

    // Log outgoing message
    await saveMessage({
      lead_id:   params.lead_id,
      phone,
      direction: "out",
      content:   message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/conversations]", err);
    return NextResponse.json({ success: false, error: "Erro ao enviar mensagem." }, { status: 500 });
  }
}
