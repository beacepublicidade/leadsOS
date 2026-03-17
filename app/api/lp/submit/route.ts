export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveMetaLead } from "@/services/metaLeadsService";

// POST /api/lp/submit — public endpoint for landing page lead capture
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?:         string;
      phone?:        string;
      email?:        string;
      client_id?:    string;
      utm_source?:   string;
      utm_medium?:   string;
      utm_campaign?: string;
      utm_content?:  string;
      utm_term?:     string;
    };

    const { name, phone, email, client_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Nome e telefone são obrigatórios." },
        { status: 400 }
      );
    }

    const id = await saveMetaLead({
      name,
      phone:        phone ?? "",
      email:        email ?? "",
      source:       "landing_page",
      client_id:    client_id ?? "",
      utm_source:   utm_source   ?? "",
      utm_medium:   utm_medium   ?? "",
      utm_campaign: utm_campaign ?? "",
      utm_content:  utm_content  ?? "",
      utm_term:     utm_term     ?? "",
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
