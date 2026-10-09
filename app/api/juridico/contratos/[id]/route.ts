export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const { data, error } = await supabaseAdmin.from("legal_contracts").select("*").eq("id", params.id).single();
    if (error || !data) return NextResponse.json({ success: false, error: "Contrato não encontrado" }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/juridico/contratos/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();

    const { data: existing, error: fetchError } = await supabaseAdmin.from("legal_contracts").select("id").eq("id", params.id).single();
    if (fetchError || !existing) return NextResponse.json({ success: false, error: "Contrato não encontrado" }, { status: 404 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) update.status = body.status;
    if (body.sign_link) update.sign_link = body.sign_link;
    if (body.pdf_url) update.pdf_url = body.pdf_url;
    if (body.signed_at) update.signed_at = body.signed_at;
    if (body.autentique_id) update.autentique_id = body.autentique_id;

    const { error } = await supabaseAdmin.from("legal_contracts").update(update).eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/juridico/contratos/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const { error } = await supabaseAdmin.from("legal_contracts").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/juridico/contratos/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
