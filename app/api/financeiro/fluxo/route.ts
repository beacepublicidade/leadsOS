export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const tenantId = session.client_id ?? "default";
    const url      = new URL(req.url);
    const months   = parseInt(url.searchParams.get("months") ?? "6");

    const [{ data: charges }, { data: expenses }] = await Promise.all([
      supabaseAdmin
        .from("financial_charges")
        .select("amount, status, paid_at, due_date")
        .eq("tenant_id", tenantId),
      supabaseAdmin
        .from("financial_expenses")
        .select("amount, category, due_date")
        .eq("tenant_id", tenantId),
    ]);

    const allCharges  = charges  ?? [];
    const allExpenses = expenses ?? [];

    // Agregar por mês (últimos N meses)
    const now = new Date();
    const monthlyData: { month: string; entradas: number; saidas: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d        = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label    = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

      const entradas = allCharges
        .filter(c => c.status === "pago" && (c.paid_at ?? "").startsWith(monthKey))
        .reduce((s, c) => s + (c.amount ?? 0), 0);

      const saidas = allExpenses
        .filter(e => (e.due_date ?? "").startsWith(monthKey))
        .reduce((s, e) => s + (e.amount ?? 0), 0);

      monthlyData.push({ month: label, entradas, saidas });
    }

    // Despesas por categoria
    const categoryMap: Record<string, number> = {};
    allExpenses.forEach(e => {
      const cat = (e.category as string) || "geral";
      categoryMap[cat] = (categoryMap[cat] ?? 0) + (e.amount ?? 0);
    });
    const categories = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    return NextResponse.json({
      success: true,
      data: { monthly: monthlyData, categories },
    });
  } catch (err) {
    console.error("[GET /api/financeiro/fluxo]", err);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
