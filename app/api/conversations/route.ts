export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/conversations — lista conversas usando campos denormalizados no lead
// Custo: N leituras (N = número de leads com mensagens) em vez de 300 leituras por chamada
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    // Uma única query na tabela leads — só lê leads que já têm mensagens
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("*")
      .not("last_message_timestamp", "is", null)
      .order("last_message_timestamp", { ascending: false })
      .limit(100);

    if (error) throw error;

    const conversations = (data ?? [])
      .map((lead) => {
        // RBAC: não-admin só vê leads do próprio cliente
        if (!session?.isAdmin && session?.client_id) {
          if (lead.client_id !== session.client_id) return null;
        }

        const mode       = lead.mode        as string | undefined ?? "auto";
        const humanUntil = lead.human_until as string | undefined;
        const isHuman    = mode === "human" && humanUntil && new Date(humanUntil) > new Date();

        return {
          lead_id:      lead.id,
          name:         lead.name                  as string,
          phone:        lead.phone                 as string,
          last_message: lead.last_message_content  as string ?? "",
          direction:    lead.last_message_direction as string ?? "in",
          sender_name:  lead.last_message_sender   as string | undefined,
          timestamp:    lead.last_message_timestamp as string,
          mode:         isHuman ? "human" : "auto",
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data: conversations });
  } catch (err) {
    console.error("[GET /api/conversations]", err);
    return NextResponse.json({ success: false, error: "Erro ao buscar conversas." }, { status: 500 });
  }
}
