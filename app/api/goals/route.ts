export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin }     from "@/lib/supabase-admin";
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

    let query = supabaseAdmin.from("goals").select("*").eq("month", month).limit(1);
    if (client_id) query = query.eq("client_id", client_id);

    const { data, error } = await query;
    if (error) throw error;

    const goal = (data && data.length > 0) ? data[0] : null;

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

    let query = supabaseAdmin.from("goals").select("id").eq("month", month).limit(1);
    if (client_id) query = query.eq("client_id", client_id);

    const { data: existing } = await query;

    const data = {
      month,
      client_id,
      revenue_target: Number(body.revenue_target) || 0,
      deals_target:   Number(body.deals_target)   || 0,
      updated_at:     new Date().toISOString(),
      updated_by:     session?.email ?? "sistema",
    };

    if (!existing || existing.length === 0) {
      const { data: created, error } = await supabaseAdmin.from("goals").insert({ ...data, created_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, goal: created });
    } else {
      const { error } = await supabaseAdmin.from("goals").update(data).eq("id", existing[0].id);
      if (error) throw error;
      return NextResponse.json({ success: true, goal: { id: existing[0].id, ...data } });
    }
  } catch (err) {
    console.error("[POST /api/goals]", err);
    return NextResponse.json({ success: false, error: "Erro ao salvar meta." }, { status: 500 });
  }
}
