export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveGoogleLead, type GoogleLeadPayload } from "@/services/googleLeadsService";

// POST /api/webhooks/google — recebe leads do Google Ads Lead Form Extension
// O Google não faz verificação GET — envia diretamente um POST com o lead.
// Autenticação via google_key no payload (configurado no Google Ads como "webhook key").
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GoogleLeadPayload;

    // Valida a chave secreta enviada pelo Google no payload
    const expectedKey = process.env.GOOGLE_WEBHOOK_KEY;
    if (expectedKey && body.google_key !== expectedKey) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cols  = body.user_column_data ?? [];
    const name  = cols.find((d) => d.column_name === "FULL_NAME")?.string_value
               || cols.find((d) => d.column_name === "full_name")?.string_value
               || "";

    if (!name) {
      return NextResponse.json({ success: false, error: "Campo obrigatório: FULL_NAME" }, { status: 400 });
    }

    const id = await saveGoogleLead(body);

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/webhooks/google]", err);
    return NextResponse.json({ success: false, error: "Erro interno ao processar webhook" }, { status: 500 });
  }
}
