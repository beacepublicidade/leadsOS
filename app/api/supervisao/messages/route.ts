export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getConversation } from "@/services/conversationService";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/supervisao/messages?lead_id=X
// Returns full message history + lead info for a specific lead
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lead_id = searchParams.get("lead_id");

    if (!lead_id) {
      return NextResponse.json(
        { success: false, error: "lead_id é obrigatório." },
        { status: 400 }
      );
    }

    const [messages, { data: lead, error: leadError }] = await Promise.all([
      getConversation(lead_id),
      supabaseAdmin
        .from("leads")
        .select("id, name, phone, status, score, source, sdr_agent, mode, human_until, product, campaign_name")
        .eq("id", lead_id)
        .single(),
    ]);

    if (leadError) throw leadError;

    const mode       = (lead?.mode        as string | undefined) ?? "auto";
    const humanUntil = (lead?.human_until as string | undefined);
    const isHuman    = mode === "human" && humanUntil && new Date(humanUntil) > new Date();

    return NextResponse.json({
      success:  true,
      messages,
      lead: {
        id:         lead?.id,
        name:       lead?.name,
        phone:      lead?.phone,
        status:     lead?.status,
        score:      lead?.score,
        source:     lead?.source,
        sdr_agent:  lead?.sdr_agent,
        product:    lead?.product ?? lead?.campaign_name,
        mode:       isHuman ? "human" : "auto",
        human_until: humanUntil ?? null,
      },
    });
  } catch (err) {
    console.error("[GET /api/supervisao/messages]", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar mensagens." },
      { status: 500 }
    );
  }
}
