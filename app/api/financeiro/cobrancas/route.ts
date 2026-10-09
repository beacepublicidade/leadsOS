export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const tenantId = session.client_id ?? "default";
    const url      = new URL(req.url);
    const status   = url.searchParams.get("status");

    let query = supabaseAdmin
      .from("financial_charges")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/financeiro/cobrancas]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { client_id, client_name, description, amount, due_date, payment_type } = body as {
      client_id: string; client_name?: string; description: string;
      amount: number; due_date: string; payment_type: string;
    };

    if (!client_id || !description || !amount || !due_date) {
      return NextResponse.json({ success: false, error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const tenantId = session.client_id ?? "default";

    let coraId = "", pixCode = "", boletoUrl = "";
    try {
      const { createPixCharge } = await import("@/services/coraService");
      const charge = await createPixCharge({
        amount, description,
        payerName:  client_name ?? "Cliente",
        payerTaxId: "00000000000",
      });
      coraId    = charge.chargeId;
      pixCode   = charge.pixCode   ?? "";
      boletoUrl = charge.boletoUrl ?? "";
    } catch (coraErr) {
      console.warn("[POST /api/financeiro/cobrancas] Cora falhou, salvando sem integração:", coraErr);
    }

    const chargeData = {
      client_id,
      client_name:    client_name ?? "",
      description,
      amount,
      status:         "pendente",
      payment_type:   payment_type || "pix",
      cora_id:        coraId,
      pix_code:       pixCode,
      boleto_url:     boletoUrl,
      due_date,
      paid_at:        null,
      nfse_id:        "",
      recurrence_id:  body.recurrence_id ?? "",
      tenant_id:      tenantId,
      created_at:     new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("financial_charges")
      .insert(chargeData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[POST /api/financeiro/cobrancas]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
