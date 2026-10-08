export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event ?? body.status;
    const ref = body.ref ?? body.nfse_id;

    if (!ref) {
      return NextResponse.json({ success: false, error: "ref ausente" }, { status: 400 });
    }

    console.log("[Webhook FocusNFe]", event, ref);

    const db = getAdminDb();

    if (event === "nfse.emitida" || event === "autorizada") {
      // Buscar cobrança que tem esse nfse_id
      const snap = await db.collection("financial_charges")
        .where("nfse_id", "==", ref)
        .limit(1)
        .get();

      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await docRef.update({
          nfse_status: "emitida",
          nfse_numero: body.numero ?? "",
          nfse_pdf_url: body.url ?? body.pdf_url ?? "",
          updated_at: new Date().toISOString(),
        });
        console.log("[Webhook FocusNFe] Cobrança atualizada com NFS-e:", snap.docs[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Webhook FocusNFe] Erro:", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
