export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const doc = await db.collection("financial_recurrences").doc(params.id).get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "Recorrência não encontrada" }, { status: 404 });

    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("[GET /api/financeiro/recorrencias/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const db = getAdminDb();
    const ref = db.collection("financial_recurrences").doc(params.id);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "Recorrência não encontrada" }, { status: 404 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) update.status = body.status;
    if (body.next_charge_date) update.next_charge_date = body.next_charge_date;
    if (body.amount) update.amount = body.amount;
    if (body.description) update.description = body.description;
    if (body.end_date) update.end_date = body.end_date;
    if (body.auto_nfse !== undefined) update.auto_nfse = body.auto_nfse;

    await ref.update(update);
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

    const db = getAdminDb();
    await db.collection("financial_recurrences").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/financeiro/recorrencias/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
