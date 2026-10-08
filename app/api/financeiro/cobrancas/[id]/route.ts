export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const doc = await db.collection("financial_charges").doc(params.id).get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "Cobrança não encontrada" }, { status: 404 });

    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("[GET /api/financeiro/cobrancas/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const db = getAdminDb();
    const ref = db.collection("financial_charges").doc(params.id);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "Cobrança não encontrada" }, { status: 404 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) update.status = body.status;
    if (body.paid_at) update.paid_at = body.paid_at;
    if (body.nfse_id) update.nfse_id = body.nfse_id;
    if (body.pix_code) update.pix_code = body.pix_code;
    if (body.boleto_url) update.boleto_url = body.boleto_url;

    await ref.update(update);
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

    const db = getAdminDb();
    await db.collection("financial_charges").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/financeiro/cobrancas/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
