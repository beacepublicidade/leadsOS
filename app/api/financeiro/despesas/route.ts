export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const tenantId = session.client_id ?? "default";

    const { data, error } = await supabaseAdmin
      .from("financial_expenses")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("due_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/financeiro/despesas]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { description, amount, category, due_date, client_id } = body as {
      description: string; amount: number; category: string; due_date: string; client_id?: string;
    };

    if (!description || !amount || !due_date) {
      return NextResponse.json({ success: false, error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const tenantId = session.client_id ?? "default";

    const expenseData = {
      description,
      amount,
      category:   category || "geral",
      due_date,
      paid:       false,
      paid_at:    null,
      client_id:  client_id ?? "",
      tenant_id:  tenantId,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("financial_expenses")
      .insert(expenseData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[POST /api/financeiro/despesas]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
