export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("financial_recurrences")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) return NextResponse.json({ success: false, error: "Recorrência não encontrada" }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/financeiro/recorrencias/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body   = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status           !== undefined) update.status           = body.status;
    if (body.next_charge_date !== undefined) update.next_charge_date = body.next_charge_date;
    if (body.amount           !== undefined) update.amount           = body.amount;
    if (body.description      !== undefined) update.description      = body.description;
    if (body.end_date         !== undefined) update.end_date         = body.end_date;
    if (body.auto_nfse        !== undefined) update.auto_nfse        = body.auto_nfse;

    const { error } = await supabaseAdmin
      .from("financial_recurrences")
      .update(update)
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/financeiro/recorrencias/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const { error } = await supabaseAdmin
      .from("financial_recurrences")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/financeiro/recorrencias/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
