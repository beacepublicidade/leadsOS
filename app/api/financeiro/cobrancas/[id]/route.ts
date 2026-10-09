export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("financial_charges")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) return NextResponse.json({ success: false, error: "Cobrança não encontrada" }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/financeiro/cobrancas/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body   = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status     !== undefined) update.status     = body.status;
    if (body.paid_at    !== undefined) update.paid_at    = body.paid_at;
    if (body.nfse_id    !== undefined) update.nfse_id    = body.nfse_id;
    if (body.pix_code   !== undefined) update.pix_code   = body.pix_code;
    if (body.boleto_url !== undefined) update.boleto_url = body.boleto_url;

    const { error } = await supabaseAdmin
      .from("financial_charges")
      .update(update)
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/financeiro/cobrancas/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const { error } = await supabaseAdmin
      .from("financial_charges")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/financeiro/cobrancas/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
