export const dynamic = "force-dynamic";
// cache-bust: 2026-06-23T

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/internal/summary — resumo ao vivo para o DOMINUS
// Protegido por INTERNAL_API_KEY (shared secret entre LeadsOS e DOMINUS)
export async function GET(req: NextRequest) {
  const normalize = (s: string) => s.replace(/\\n/g, "").replace(/\n/g, "").trim();
  const key = req.headers.get("x-internal-key");
  if (!key || normalize(key) !== normalize(process.env.INTERNAL_API_KEY ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Busca todos os leads
    const { data: leads, error } = await supabaseAdmin.from("leads").select("*");
    if (error) throw error;

    const allLeads = (leads ?? []) as Record<string, unknown>[];
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const byStatus: Record<string, number> = {};
    let todayCount = 0;
    const recentLeads: { name: string; status: string; phone: string; created_at: string }[] = [];

    for (const lead of allLeads) {
      const status = (lead.status as string) ?? "novo";
      byStatus[status] = (byStatus[status] ?? 0) + 1;

      const createdAt = (lead.created_at as string) ?? "";
      if (createdAt.startsWith(today)) todayCount++;

      recentLeads.push({
        name:       (lead.name       as string) ?? "—",
        status,
        phone:      (lead.phone      as string) ?? "—",
        created_at: createdAt,
      });
    }

    // Últimos 5 leads por data de criação
    const last5 = recentLeads
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);

    // Últimas conversas abertas (leads com last_message_timestamp)
    const { data: convData, error: convError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .not("last_message_timestamp", "is", null)
      .order("last_message_timestamp", { ascending: false })
      .limit(5);

    if (convError) throw convError;

    const recentConversations = (convData ?? []).map((d) => ({
      name:      (d.name                  as string) ?? "—",
      status:    (d.status                as string) ?? "novo",
      last_msg:  (d.last_message_content  as string) ?? "",
      direction: (d.last_message_direction as string) ?? "in",
      timestamp: (d.last_message_timestamp as string) ?? "",
    }));

    return NextResponse.json({
      success: true,
      data: {
        total:               allLeads.length,
        today:               todayCount,
        by_status:           byStatus,
        last_leads:          last5,
        recent_conversations: recentConversations,
        generated_at:        new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[GET /api/internal/summary]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
