export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveMessage, findLeadByPhone } from "@/services/conversationService";

/**
 * POST /api/webhooks/zapi
 * Receives incoming WhatsApp messages from Z-API webhook.
 * Configure this URL in Z-API dashboard → Webhooks → On Message Received.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    // Z-API sends type "ReceivedCallback" for incoming messages
    const type  = body.type as string | undefined;
    const phone = body.phone as string | undefined;
    const text  = (body.text as Record<string, unknown>)?.message as string
               ?? body.body as string
               ?? "";

    // Only process incoming text messages
    if (type !== "ReceivedCallback" || !phone || !text) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Find matching lead by phone number
    const lead_id = await findLeadByPhone(phone);

    await saveMessage({
      lead_id:   lead_id ?? "",
      phone,
      direction: "in",
      content:   text,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/webhooks/zapi]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
