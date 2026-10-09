export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";
import { logAction } from "@/services/logsService";

// POST /api/proposals — cria proposta (sem Autentique, sem PDF automático)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const body = await req.json() as {
      lead_id:        string;
      service_title:  string;
      service_desc:   string;
      amount:         number;
      payment_terms?: string;
      notes?:         string;
      valid_days?:    number;
    };

    const { lead_id, service_title, service_desc, amount, payment_terms, notes, valid_days = 7 } = body;

    if (!lead_id || !service_title || !service_desc || !amount) {
      return NextResponse.json({ success: false, error: "Campos obrigatórios: lead_id, service_title, service_desc, amount" }, { status: 400 });
    }

    const { data: lead, error: leadError } = await supabaseAdmin.from("leads").select("*").eq("id", lead_id).single();
    if (leadError || !lead) return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });

    const now        = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + valid_days);

    const proposalNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const { data: proposal, error: propError } = await supabaseAdmin.from("proposals").insert({
      lead_id,
      proposal_number:  proposalNumber,
      service_title,
      service_desc,
      amount,
      payment_terms:    payment_terms ?? "",
      notes:            notes ?? "",
      status:           "pending_send",
      created_at:       now.toISOString(),
      valid_until:      validUntil.toISOString(),
      sent_at:          "",
      paid_at:          "",
      created_by:       session.email ?? "",
      client_id:        (lead.client_id as string) ?? "",
    }).select().single();
    if (propError) throw propError;

    await supabaseAdmin.from("leads").update({
      status:            "proposta",
      status_changed_at: now.toISOString(),
      last_proposal_id:  proposal.id,
    }).eq("id", lead_id);

    logAction({
      lead_id,
      type:       "notification",
      message:    `Proposta ${proposalNumber} criada. Valor: R$ ${amount}. Aguardando envio manual.`,
      created_at: now.toISOString(),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: { proposal_id: proposal.id, proposal_number: proposalNumber },
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/proposals]", err);
    return NextResponse.json({ success: false, error: "Erro ao criar proposta." }, { status: 500 });
  }
}

// GET /api/proposals?lead_id=xxx — lista propostas de um lead
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });

    const lead_id = req.nextUrl.searchParams.get("lead_id");
    if (!lead_id) return NextResponse.json({ success: false, error: "lead_id obrigatório." }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("proposals")
      .select("*")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/proposals]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar propostas." }, { status: 500 });
  }
}
