export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const doc = await db.collection("legal_contracts").doc(params.id).get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "Contrato não encontrado" }, { status: 404 });

    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
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
    const db = getAdminDb();
    const ref = db.collection("legal_contracts").doc(params.id);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "Contrato não encontrado" }, { status: 404 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) update.status = body.status;
    if (body.sign_link) update.sign_link = body.sign_link;
    if (body.pdf_url) update.pdf_url = body.pdf_url;
    if (body.signed_at) update.signed_at = body.signed_at;
    if (body.autentique_id) update.autentique_id = body.autentique_id;

    await ref.update(update);
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

    const db = getAdminDb();
    await db.collection("legal_contracts").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/juridico/contratos/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
