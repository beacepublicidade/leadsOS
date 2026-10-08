export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";
    const snap = await db.collection("financial_expenses")
      .where("tenant_id", "==", tenantId)
      .orderBy("due_date", "desc")
      .get();

    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/financeiro/despesas]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { description, amount, category, due_date, client_id } = body as {
      description: string; amount: number; category: string; due_date: string; client_id?: string;
    };

    if (!description || !amount || !due_date) {
      return NextResponse.json({ success: false, error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";

    const expenseData = {
      description,
      amount,
      category: category || "geral",
      due_date,
      paid: false,
      paid_at: "",
      client_id: client_id ?? "",
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    };

    const docRef = await db.collection("financial_expenses").add(expenseData);
    return NextResponse.json({ success: true, data: { id: docRef.id, ...expenseData } });
  } catch (err) {
    console.error("[POST /api/financeiro/despesas]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
