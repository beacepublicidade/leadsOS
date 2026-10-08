export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyNaiaKey } from "@/lib/naiaAuth";
import { sendWhatsApp } from "@/services/notificationService";

export async function POST(req: NextRequest) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    if (!session.permissions.includes("messages:write")) {
      return NextResponse.json({ success: false, error: "Permissão negada" }, { status: 403 });
    }

    const body = await req.json();
    const { phone, message, lead_id } = body as { phone: string; message: string; lead_id?: string };

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: "phone e message obrigatórios" }, { status: 400 });
    }

    const msgId = await sendWhatsApp(phone, message);

    // Log the message if lead_id is provided (non-critical)
    if (lead_id) {
      supabaseAdmin
        .from("messages")
        .insert({
          lead_id,
          phone,
          direction: "outbound",
          content: message,
          source: "naia",
          msg_id: msgId ?? "",
        })
        .then(() => {})
        .catch(() => {});
    }

    return NextResponse.json({ success: true, msg_id: msgId });
  } catch (err) {
    console.error("[NAIA POST /api/naia/mensagem]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
