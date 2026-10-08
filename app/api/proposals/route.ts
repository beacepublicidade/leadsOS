export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
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

    const leadDoc = await getAdminDb().collection("leads").doc(lead_id).get();
    if (!leadDoc.exists) return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    const lead = { id: leadDoc.id, ...leadDoc.data() } as Record<string, unknown>;

    const now        = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + valid_days);

    const proposalNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const proposalRef = await getAdminDb().collection("proposals").add({
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
    });

    await getAdminDb().collection("leads").doc(lead_id).update({
      status:            "proposta",
      status_changed_at: now.toISOString(),
      last_proposal_id:  proposalRef.id,
    });

    logAction({
      lead_id,
      type:       "notification",
      message:    `Proposta ${proposalNumber} criada. Valor: R$ ${amount}. Aguardando envio manual.`,
      created_at: now.toISOString(),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: { proposal_id: proposalRef.id, proposal_number: proposalNumber },
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

    const snap = await getAdminDb()
      .collection("proposals")
      .where("lead_id", "==", lead_id)
      .get();

    const proposals = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => ((b as Record<string, string>).created_at ?? "").localeCompare((a as Record<string, string>).created_at ?? ""));

    return NextResponse.json({ success: true, data: proposals });
  } catch (err) {
    console.error("[GET /api/proposals]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar propostas." }, { status: 500 });
  }
}
