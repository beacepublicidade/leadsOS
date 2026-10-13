export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/supervisao/intervir
// Sets lead mode to 'human' so the AI SDR stops and human takes over
export async function POST(req: NextRequest) {
  try {
    const body    = await req.json() as { lead_id?: string };
    const lead_id = body.lead_id;

    if (!lead_id) {
      return NextResponse.json(
        { success: false, error: "lead_id é obrigatório." },
        { status: 400 }
      );
    }

    const humanUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +24h

    const { error } = await supabaseAdmin
      .from("leads")
      .update({ mode: "human", human_until: humanUntil })
      .eq("id", lead_id);

    if (error) throw error;

    return NextResponse.json({ success: true, human_until: humanUntil });
  } catch (err) {
    console.error("[POST /api/supervisao/intervir]", err);
    return NextResponse.json(
      { success: false, error: "Erro ao intervir na conversa." },
      { status: 500 }
    );
  }
}
