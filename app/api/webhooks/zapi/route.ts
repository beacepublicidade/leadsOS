export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveMessage, findLeadByPhone } from "@/services/conversationService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    // Log everything to diagnose Z-API payload format
    console.log("[ZAPI WEBHOOK] payload:", JSON.stringify(body));

    const type  = body.type as string | undefined;
    const phone = body.phone as string | undefined;
    const text  = (body.text as Record<string, unknown>)?.message as string
               ?? body.body as string
               ?? "";

    console.log("[ZAPI WEBHOOK] type:", type, "phone:", phone, "text:", text);

    if (type !== "ReceivedCallback" || !phone || !text) {
      console.log("[ZAPI WEBHOOK] skipped — type or phone or text missing");
      return NextResponse.json({ success: true, skipped: true });
    }

    const lead_id = await findLeadByPhone(phone);
    console.log("[ZAPI WEBHOOK] lead_id found:", lead_id);

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
