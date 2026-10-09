export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH /api/leads/[id]/schedule — define ou remove agendamento do lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { scheduled_at } = body as { scheduled_at: string | null };

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from("leads")
      .update({ scheduled_at: scheduled_at ?? null })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json(
      { success: true, data: { id, scheduled_at } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PATCH /api/leads/[id]/schedule]", err);
    return NextResponse.json(
      { success: false, error: "Erro interno ao salvar agendamento" },
      { status: 500 }
    );
  }
}
