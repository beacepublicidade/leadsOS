export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyNaiaKey } from "@/lib/naiaAuth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[NAIA GET /api/naia/leads/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await verifyNaiaKey(req);
    if (!session) return NextResponse.json({ success: false, error: "API key inválida" }, { status: 401 });

    if (!session.permissions.includes("leads:write")) {
      return NextResponse.json({ success: false, error: "Permissão negada" }, { status: 403 });
    }

    const body = await req.json();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) update.status = body.status;
    if (body.notes  !== undefined) update.notes  = body.notes;
    if (body.score  !== undefined) update.score  = body.score;

    const { data, error } = await supabaseAdmin
      .from("leads")
      .update(update)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      // PGRST116 = no rows matched → lead não encontrado
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
      }
      console.error("[NAIA PUT /api/naia/leads/:id] Supabase error:", error);
      return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[NAIA PUT /api/naia/leads/:id]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
