import { NextRequest, NextResponse } from "next/server";
import { saveMetaLead } from "@/services/metaLeadsService";

// POST /api/lp/submit — public endpoint for landing page lead capture
// No token required; source is fixed to "landing_page"
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name?: string; phone?: string; email?: string };
    const { name, phone, email } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Nome e telefone são obrigatórios." },
        { status: 400 }
      );
    }

    const id = await saveMetaLead({
      name,
      phone:         phone ?? "",
      email:         email ?? "",
      campaign_name: "landing_page",
    });

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/lp/submit]", err);
    return NextResponse.json(
      { success: false, error: "Erro ao processar. Tente novamente." },
      { status: 500 }
    );
  }
}
