export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb }     from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// GET /api/goals?month=YYYY-MM
export async function GET(req: NextRequest) {
  try {
    const session   = await getSessionUser(req);
    const client_id = session?.isAdmin
      ? (req.nextUrl.searchParams.get("client_id") || null)
      : (session?.client_id ?? null);
    const month = req.nextUrl.searchParams.get("month") || currentMonth();

    const db   = getAdminDb();
    let query: FirebaseFirestore.Query = db.collection("goals").where("month", "==", month);
    if (client_id) query = query.where("client_id", "==", client_id);

    const snap = await query.limit(1).get();
    const goal = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };

    return NextResponse.json({ success: true, goal });
  } catch (err) {
    console.error("[GET /api/goals]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar meta." }, { status: 500 });
  }
}

// POST /api/goals — cria ou atualiza meta do mês
export async function POST(req: NextRequest) {
  try {
    const session   = await getSessionUser(req);
    const body      = await req.json() as {
      month?:           string;
      revenue_target:   number;
      deals_target:     number;
      client_id?:       string;
    };

    const client_id = session?.isAdmin
      ? (body.client_id || null)
      : (session?.client_id ?? null);
    const month = body.month || currentMonth();

    const db   = getAdminDb();
    let query: FirebaseFirestore.Query = db.collection("goals").where("month", "==", month);
    if (client_id) query = query.where("client_id", "==", client_id);

    const snap = await query.limit(1).get();
    const data = {
      month,
      client_id,
      revenue_target: Number(body.revenue_target) || 0,
      deals_target:   Number(body.deals_target)   || 0,
      updated_at:     new Date().toISOString(),
      updated_by:     session?.email ?? "sistema",
    };

    if (snap.empty) {
      const ref = await db.collection("goals").add({ ...data, created_at: new Date().toISOString() });
      return NextResponse.json({ success: true, goal: { id: ref.id, ...data } });
    } else {
      await snap.docs[0].ref.update(data);
      return NextResponse.json({ success: true, goal: { id: snap.docs[0].id, ...data } });
    }
  } catch (err) {
    console.error("[POST /api/goals]", err);
    return NextResponse.json({ success: false, error: "Erro ao salvar meta." }, { status: 500 });
  }
}
