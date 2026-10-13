export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// GET /api/supervisao/conversations
// Returns all leads with conversations, sorted by most recent message
// Includes per-SDR counts for the stats bar
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    // Fetch all leads that have at least one message
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from("leads")
      .select("id, name, phone, status, score, source, sdr_agent, client_id, last_message_content, last_message_direction, last_message_sender, last_message_timestamp, mode, human_until, created_at")
      .not("last_message_timestamp", "is", null)
      .order("last_message_timestamp", { ascending: false })
      .limit(200);

    if (leadsError) throw leadsError;

    // RBAC: non-admin only sees their client's leads
    const filtered = (leads ?? []).filter((lead) => {
      if (!session?.isAdmin && session?.client_id) {
        return lead.client_id === session.client_id;
      }
      return true;
    });

    // Count messages per lead for stats
    const leadIds = filtered.map((l) => l.id);

    let messageCounts: Record<string, number> = {};
    if (leadIds.length > 0) {
      const { data: counts } = await supabaseAdmin
        .from("messages")
        .select("lead_id")
        .in("lead_id", leadIds.slice(0, 100));

      if (counts) {
        for (const row of counts) {
          const id = row.lead_id as string;
          messageCounts[id] = (messageCounts[id] ?? 0) + 1;
        }
      }
    }

    // Today's message count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayMessages } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    const { count: todayActiveCount } = await supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("last_message_timestamp", "is", null)
      .gte("last_message_timestamp", todayStart.toISOString());

    // Per-SDR counts
    const sdrCounts: Record<string, number> = {};
    for (const lead of filtered) {
      const sdr = (lead.sdr_agent as string | null) ?? "—";
      sdrCounts[sdr] = (sdrCounts[sdr] ?? 0) + 1;
    }

    const conversations = filtered.map((lead) => {
      const mode       = (lead.mode        as string | undefined) ?? "auto";
      const humanUntil = (lead.human_until as string | undefined);
      const isHuman    = mode === "human" && humanUntil && new Date(humanUntil) > new Date();

      return {
        lead_id:       lead.id,
        name:          lead.name                  as string,
        phone:         lead.phone                 as string,
        status:        lead.status                as string ?? "novo",
        score:         lead.score                 as number | null,
        source:        lead.source                as string | null,
        sdr_agent:     lead.sdr_agent             as string | null,
        last_message:  lead.last_message_content  as string ?? "",
        direction:     lead.last_message_direction as string ?? "in",
        sender_name:   lead.last_message_sender   as string | undefined,
        timestamp:     lead.last_message_timestamp as string,
        mode:          isHuman ? "human" : "auto",
        message_count: messageCounts[lead.id] ?? 0,
      };
    });

    return NextResponse.json({
      success:     true,
      data:        conversations,
      stats: {
        total:          filtered.length,
        active_today:   todayActiveCount ?? 0,
        messages_today: todayMessages   ?? 0,
        sdr_counts:     sdrCounts,
      },
    });
  } catch (err) {
    console.error("[GET /api/supervisao/conversations]", err);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar conversas." },
      { status: 500 }
    );
  }
}
