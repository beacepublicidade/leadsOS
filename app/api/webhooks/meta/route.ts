export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveMetaLead, type MetaLeadPayload } from "@/services/metaLeadsService";
import type { ApiResponse } from "@/types/lead";

const UNAUTHORIZED: ApiResponse<null> = { success: false, data: null, error: "Unauthorized" };

// GET /api/webhooks/meta — verificação do webhook pelo Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_SECRET && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// POST /api/webhooks/meta — recebe leads do Meta Ads
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-webhook-token");

  if (!token || token !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  try {
    const body = await req.json() as MetaLeadPayload;

    if (!body.name) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: "Campo obrigatório: name",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const id = await saveMetaLead(body);

    const response: ApiResponse<{ id: string }> = { success: true, data: { id } };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/webhooks/meta]", err);
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: "Erro interno ao processar webhook",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
