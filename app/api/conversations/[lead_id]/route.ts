export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getConversation, saveMessage } from "@/services/conversationService";
import { sendWhatsApp } from "@/services/notificationService";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

const HUMAN_TAKEOVER_MS = 30 * 60 * 1000; // 30 minutes

// GET /api/conversations/[lead_id] — fetch conversation history + lead mode
export async function GET(
  _req: NextRequest,
  { params }: { params: { lead_id: string } }
) {
  try {
    const [messages, { data: leadData }] = await Promise.all([
      getConversation(params.lead_id),
      supabaseAdmin.from("leads").select("*").eq("id", params.lead_id).single(),
    ]);

    const lead       = leadData ?? {};
    const mode       = lead.mode        as string | undefined ?? "auto";
    const humanUntil = lead.human_until as string | undefined ?? null;

    // Auto-expire human mode
    const isHuman = mode === "human" && humanUntil && new Date(humanUntil) > new Date();

    return NextResponse.json({ success: true, data: messages, mode: isHuman ? "human" : "auto" });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar conversa" }, { status: 500 });
  }
}

// POST /api/conversations/[lead_id] — send a message (human takeover)
export async function POST(
  req: NextRequest,
  { params }: { params: { lead_id: string } }
) {
  try {
    const { message } = await req.json() as { message?: string };

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: "Mensagem não pode estar vazia." }, { status: 400 });
    }

    const session = await getSessionUser(req);

    // Get lead phone
    const { data: leadData, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", params.lead_id)
      .single();

    if (leadError || !leadData) {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }

    // Verifica se o usuário tem acesso a este lead
    if (!session?.isAdmin && session?.client_id) {
      const leadClientId = leadData.client_id as string | undefined;
      if (leadClientId !== session.client_id) {
        return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
      }
    }

    const phone = leadData.phone as string;
    if (!phone) {
      return NextResponse.json({ success: false, error: "Lead sem telefone cadastrado." }, { status: 400 });
    }

    // Get sender name from session
    let senderName = "Sistema";
    if (session?.email) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("name")
        .eq("email", session.email)
        .single();
      senderName = userData?.name
        ?? session.email.split("@")[0];
    }

    // Activate human takeover (30 min window)
    const humanUntil = new Date(Date.now() + HUMAN_TAKEOVER_MS).toISOString();
    await supabaseAdmin.from("leads").update({ mode: "human", human_until: humanUntil }).eq("id", params.lead_id);

    // Send WhatsApp — prepend sender name in bold if it's a human
    const whatsappText = senderName !== "Sistema"
      ? `*${senderName}:*\n${message}`
      : message;

    const zapiId = await sendWhatsApp(phone, whatsappText);

    // Log outgoing message with sender name (store original text without prefix)
    await saveMessage({
      lead_id:     params.lead_id,
      phone,
      direction:   "out",
      content:     message,
      timestamp:   new Date().toISOString(),
      sender_name: senderName,
      status:      "sent",
      ...(zapiId && { zapi_id: zapiId }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/conversations]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/conversations/[lead_id] — resume automation (exit human mode)
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { lead_id: string } }
) {
  try {
    const { error } = await supabaseAdmin.from("leads").update({
      mode:        "auto",
      human_until: null,
    }).eq("id", params.lead_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/conversations]", err);
    return NextResponse.json({ success: false, error: "Erro ao retomar automação." }, { status: 500 });
  }
}
