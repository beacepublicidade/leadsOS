export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/agencia/clientes
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    let q = db.collection("agency_clients").orderBy("created_at", "desc") as FirebaseFirestore.Query;

    if (!session.isAdmin && session.client_id) {
      q = q.where("tenant_id", "==", session.client_id);
    }

    const snap = await q.get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/agencia/clientes]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar clientes" }, { status: 500 });
  }
}

// POST /api/agencia/clientes
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json() as Record<string, unknown>;
    const name = (body.name as string | undefined)?.trim();

    if (!name) {
      return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 });
    }

    const doc = {
      name,
      niche:          (body.niche as string | undefined) ?? "",
      cnpj:           (body.cnpj as string | undefined) ?? "",
      briefing:       (body.briefing as string | undefined) ?? "",
      responsible:    (body.responsible as string | undefined) ?? session.email ?? "",
      status:         "ativo" as const,
      monthly_value:  Number(body.monthly_value) || 0,
      start_date:     (body.start_date as string | undefined) ?? new Date().toISOString().slice(0, 10),
      lead_id:        (body.lead_id as string | undefined) ?? null,
      contract_id:    null,
      tenant_id:      session.isAdmin ? null : (session.client_id ?? null),
      created_at:     new Date().toISOString(),
    };

    const ref = await getAdminDb().collection("agency_clients").add(doc);
    return NextResponse.json({ success: true, data: { id: ref.id, ...doc } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/agencia/clientes]", err);
    return NextResponse.json({ success: false, error: "Erro ao criar cliente" }, { status: 500 });
  }
}
