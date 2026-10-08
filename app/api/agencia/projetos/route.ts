export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/agencia/projetos?client_id=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const clientId = req.nextUrl.searchParams.get("client_id");
    const db = getAdminDb();
    let q = db.collection("agency_projects").orderBy("created_at", "desc") as FirebaseFirestore.Query;

    if (clientId) q = q.where("client_id", "==", clientId);

    const snap = await q.get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/agencia/projetos]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar projetos" }, { status: 500 });
  }
}

// POST /api/agencia/projetos
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json() as Record<string, unknown>;
    const client_id = body.client_id as string | undefined;
    const name = (body.name as string | undefined)?.trim();

    if (!client_id || !name) {
      return NextResponse.json({ success: false, error: "client_id e name são obrigatórios" }, { status: 400 });
    }

    const month = (body.month as string | undefined) ?? new Date().toISOString().slice(0, 7);

    const doc = {
      client_id,
      name,
      month,
      status:       (body.status as string | undefined) ?? "planejamento",
      tasks:        (body.tasks as unknown[]) ?? [],
      deliverables: (body.deliverables as unknown[]) ?? [],
      responsible:  (body.responsible as string | undefined) ?? session.email ?? "",
      deadline:     (body.deadline as string | undefined) ?? "",
      notes:        (body.notes as string | undefined) ?? "",
      created_at:   new Date().toISOString(),
    };

    const ref = await getAdminDb().collection("agency_projects").add(doc);
    return NextResponse.json({ success: true, data: { id: ref.id, ...doc } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/agencia/projetos]", err);
    return NextResponse.json({ success: false, error: "Erro ao criar projeto" }, { status: 500 });
  }
}
