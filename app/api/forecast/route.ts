export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb }     from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

// Probabilidade de fechamento por estágio (weighted pipeline)
const STAGE_PROBABILITY: Record<string, number> = {
  novo:     0.10,
  contato:  0.25,
  proposta: 0.60,
  fechado:  1.00,
  perdido:  0.00,
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const session   = await getSessionUser(req);
    const client_id = session?.isAdmin
      ? (req.nextUrl.searchParams.get("client_id") || null)
      : (session?.client_id ?? null);

    const db    = getAdminDb();
    const month = currentMonth();
    const [year, mon] = month.split("-").map(Number);
    const startOf = new Date(year, mon - 1, 1).toISOString();
    const endOf   = new Date(year, mon, 1).toISOString();

    // Busca todos os leads ativos (exceto perdido)
    let query: FirebaseFirestore.Query = db.collection("leads")
      .where("status", "in", ["novo", "contato", "proposta", "fechado"]);
    if (client_id) query = query.where("client_id", "==", client_id);
    const snap = await query.limit(500).get();

    const leads = snap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>));

    // ── Weighted pipeline (todos ativos com deal_value) ──────────────────────
    let weighted = 0;
    let committed = 0; // só "proposta"
    let closedRevenue = 0;
    let closedCount = 0;

    for (const l of leads) {
      const val   = Number(l.deal_value) || 0;
      const stage = String(l.status ?? "novo");
      const prob  = STAGE_PROBABILITY[stage] ?? 0;

      if (val > 0) weighted += val * prob;

      if (stage === "proposta" && val > 0) committed += val;

      // Fechados NO MÊS ATUAL
      if (stage === "fechado") {
        const changedAt = String(l.status_changed_at ?? l.created_at ?? "");
        if (changedAt >= startOf && changedAt < endOf) {
          closedRevenue += val;
          closedCount++;
        }
      }
    }

    // ── Ranking por vendedor (assigned_to) ───────────────────────────────────
    const rankMap: Record<string, { name: string; closed: number; revenue: number }> = {};

    for (const l of leads) {
      if (String(l.status) !== "fechado") continue;
      const changedAt = String(l.status_changed_at ?? l.created_at ?? "");
      if (changedAt < startOf || changedAt >= endOf) continue;

      const key  = String(l.assigned_to ?? "Sem responsável");
      if (!rankMap[key]) rankMap[key] = { name: key, closed: 0, revenue: 0 };
      rankMap[key].closed++;
      rankMap[key].revenue += Number(l.deal_value) || 0;
    }

    const ranking = Object.values(rankMap)
      .sort((a, b) => b.closed - a.closed || b.revenue - a.revenue)
      .slice(0, 5);

    // ── Pipeline por estágio (para o funil de valor) ─────────────────────────
    const byStage: Record<string, { count: number; value: number }> = {};
    for (const l of leads) {
      const stage = String(l.status ?? "novo");
      if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
      byStage[stage].count++;
      byStage[stage].value += Number(l.deal_value) || 0;
    }

    return NextResponse.json({
      success: true,
      month,
      weighted:      Math.round(weighted),
      committed:     Math.round(committed),
      closedRevenue: Math.round(closedRevenue),
      closedCount,
      ranking,
      byStage,
    });
  } catch (err) {
    console.error("[GET /api/forecast]", err);
    return NextResponse.json({ success: false, error: "Erro ao calcular forecast." }, { status: 500 });
  }
}
