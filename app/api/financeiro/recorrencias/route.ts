export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";
import { getNextChargeDate } from "@/services/financialService";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";
    const snap = await db.collection("financial_recurrences")
      .where("tenant_id", "==", tenantId)
      .orderBy("created_at", "desc")
      .get();

    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/financeiro/recorrencias]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { client_id, client_name, description, amount, day_of_month, payment_type } = body as {
      client_id: string; client_name?: string; description: string;
      amount: number; day_of_month: number; payment_type?: string;
    };

    if (!client_id || !description || !amount || !day_of_month) {
      return NextResponse.json({ success: false, error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";

    const recurrenceData = {
      client_id,
      client_name: client_name ?? "",
      description,
      amount,
      day_of_month: Math.min(Math.max(day_of_month, 1), 28),
      payment_type: payment_type || "pix",
      status: "ativa",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: "",
      next_charge_date: getNextChargeDate(day_of_month),
      auto_nfse: false,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    };

    const docRef = await db.collection("financial_recurrences").add(recurrenceData);
    return NextResponse.json({ success: true, data: { id: docRef.id, ...recurrenceData } });
  } catch (err) {
    console.error("[POST /api/financeiro/recorrencias]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
