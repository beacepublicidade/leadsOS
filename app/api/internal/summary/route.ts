export const dynamic = "force-dynamic";
// cache-bust: 2026-06-23T

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// GET /api/internal/summary — resumo ao vivo para o DOMINUS
// Protegido por INTERNAL_API_KEY (shared secret entre LeadsOS e DOMINUS)
export async function GET(req: NextRequest) {
  const normalize = (s: string) => s.replace(/\\n/g, "").replace(/\n/g, "").trim();
  const key = req.headers.get("x-internal-key");
  if (!key || normalize(key) !== normalize(process.env.INTERNAL_API_KEY ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    // Busca todos os leads
    const leadsSnap = await db.collection("leads").get();
    const leads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const byStatus: Record<string, number> = {};
    let todayCount = 0;
    const recentLeads: { name: string; status: string; phone: string; created_at: string }[] = [];

    for (const lead of leads) {
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
    const convSnap = await db
      .collection("leads")
      .where("last_message_timestamp", "!=", null)
      .orderBy("last_message_timestamp", "desc")
      .limit(5)
      .get();

    const recentConversations = convSnap.docs.map((d) => {
      const data = d.data();
      return {
        name:      (data.name                  as string) ?? "—",
        status:    (data.status                as string) ?? "novo",
        last_msg:  (data.last_message_content  as string) ?? "",
        direction: (data.last_message_direction as string) ?? "in",
        timestamp: (data.last_message_timestamp as string) ?? "",
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        total:               leads.length,
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
