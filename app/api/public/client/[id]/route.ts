export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// GET /api/public/client/[id] — dados públicos do cliente para white label na LP
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await getAdminDb().collection("clients").doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Cliente não encontrado." }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      success: true,
      data: {
        name:             data.name             as string,
        niche:            data.niche            as string,
        brand_color:      (data.brand_color      as string | undefined) ?? "#7c3aed",
        whatsapp_number:  (data.whatsapp_number  as string | undefined) ?? "",
        lp_logo_url:      (data.lp_logo_url      as string | undefined) ?? "",
        lp_headline:      (data.lp_headline      as string | undefined) ?? "",
        lp_subheadline:   (data.lp_subheadline   as string | undefined) ?? "",
        lp_cta_button:    (data.lp_cta_button    as string | undefined) ?? "Falar no WhatsApp →",
        lp_metrics:       (data.lp_metrics       as unknown[] | undefined) ?? [],
        lp_dores:         (data.lp_dores         as string[] | undefined) ?? [],
        lp_beneficios:    (data.lp_beneficios    as string[] | undefined) ?? [],
        lp_depoimentos:   (data.lp_depoimentos   as unknown[] | undefined) ?? [],
        lp_sobre:         (data.lp_sobre         as string | undefined) ?? "",
        lp_sobre_foto:    (data.lp_sobre_foto    as string | undefined) ?? "",
      },
    });
  } catch (err) {
    console.error("[GET /api/public/client/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar cliente." }, { status: 500 });
  }
}
