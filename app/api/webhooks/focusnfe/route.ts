export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event ?? body.status;
    const ref = body.ref ?? body.nfse_id;

    if (!ref) {
      return NextResponse.json({ success: false, error: "ref ausente" }, { status: 400 });
    }

    console.log("[Webhook FocusNFe]", event, ref);

    if (event === "nfse.emitida" || event === "autorizada") {
      // Buscar cobrança que tem esse nfse_id
      const { data: chargeData, error } = await supabaseAdmin
        .from("financial_charges")
        .select("id")
        .eq("nfse_id", ref)
        .limit(1)
        .single();

      if (!error && chargeData) {
        await supabaseAdmin.from("financial_charges").update({
          nfse_status:  "emitida",
          nfse_numero:  body.numero ?? "",
          nfse_pdf_url: body.url ?? body.pdf_url ?? "",
          updated_at:   new Date().toISOString(),
        }).eq("id", chargeData.id);
        console.log("[Webhook FocusNFe] Cobrança atualizada com NFS-e:", chargeData.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Webhook FocusNFe] Erro:", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
