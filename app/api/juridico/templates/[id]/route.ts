export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const doc = await db.collection("legal_templates").doc(params.id).get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "Template não encontrado" }, { status: 404 });

    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error("[GET /api/juridico/templates/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const db = getAdminDb();
    const ref = db.collection("legal_templates").doc(params.id);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ success: false, error: "Template não encontrado" }, { status: 404 });

    const extractedVars = body.content
      ? (body.content.match(/\{\{([^}]+)\}\}/g) ?? []).map((v: string) => v.replace(/\{\{|\}\}/g, "").trim())
      : undefined;

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name) update.name = body.name;
    if (body.type) update.type = body.type;
    if (body.content) {
      update.content = body.content;
      update.variables = extractedVars;
    }

    await ref.update(update);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/juridico/templates/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    await db.collection("legal_templates").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/juridico/templates/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
