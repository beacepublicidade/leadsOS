export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/agencia/clientes/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const { data, error } = await supabaseAdmin.from("agency_clients").select("*").eq("id", params.id).single();
    if (error || !data) return NextResponse.json({ success: false, error: "Cliente não encontrado" }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/agencia/clientes/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar cliente" }, { status: 500 });
  }
}

// PUT /api/agencia/clientes/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json() as Record<string, unknown>;
    const allowed = ["name", "niche", "cnpj", "briefing", "responsible", "status", "monthly_value", "start_date", "contract_id"];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const { error } = await supabaseAdmin.from("agency_clients").update(update).eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/agencia/clientes/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao atualizar cliente" }, { status: 500 });
  }
}

// DELETE /api/agencia/clientes/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session?.isAdmin) return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { error } = await supabaseAdmin.from("agency_clients").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/agencia/clientes/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao deletar cliente" }, { status: 500 });
  }
}
