export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/agencia/projetos/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const snap = await getAdminDb().collection("agency_projects").doc(params.id).get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Projeto não encontrado" }, { status: 404 });

    return NextResponse.json({ success: true, data: { id: snap.id, ...snap.data() } });
  } catch (err) {
    console.error("[GET /api/agencia/projetos/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar projeto" }, { status: 500 });
  }
}

// PUT /api/agencia/projetos/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json() as Record<string, unknown>;
    const allowed = ["name", "month", "status", "tasks", "deliverables", "responsible", "deadline", "notes"];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    await getAdminDb().collection("agency_projects").doc(params.id).update(update);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/agencia/projetos/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao atualizar projeto" }, { status: 500 });
  }
}

// DELETE /api/agencia/projetos/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser(req);
    if (!session?.isAdmin) return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    await getAdminDb().collection("agency_projects").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/agencia/projetos/[id]]", err);
    return NextResponse.json({ success: false, error: "Erro ao deletar projeto" }, { status: 500 });
  }
}
