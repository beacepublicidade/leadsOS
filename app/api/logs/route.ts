export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/logs?lead_id=<id>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lead_id = searchParams.get("lead_id");

    let query = supabaseAdmin
      .from("logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (lead_id) {
      query = query.eq("lead_id", lead_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, logs: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/logs]", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar logs" },
      { status: 500 }
    );
  }
}
