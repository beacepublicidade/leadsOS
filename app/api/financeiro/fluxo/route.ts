export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });

    const db = getAdminDb();
    const tenantId = session.client_id ?? "default";
    const url = new URL(req.url);
    const months = parseInt(url.searchParams.get("months") ?? "6");

    // Buscar cobranças e despesas
    const [chargesSnap, expensesSnap] = await Promise.all([
      db.collection("financial_charges").where("tenant_id", "==", tenantId).get(),
      db.collection("financial_expenses").where("tenant_id", "==", tenantId).get(),
    ]);

    const charges = chargesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const expenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Agregar por mês (últimos N meses)
    const now = new Date();
    const monthlyData: { month: string; entradas: number; saidas: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

      const entradas = charges
        .filter((c: Record<string, unknown>) => c.status === "pago" && (c.paid_at as string)?.startsWith(monthKey))
        .reduce((s: number, c: Record<string, unknown>) => s + ((c.amount as number) ?? 0), 0);

      const saidas = expenses
        .filter((e: Record<string, unknown>) => (e.due_date as string)?.startsWith(monthKey))
        .reduce((s: number, e: Record<string, unknown>) => s + ((e.amount as number) ?? 0), 0);

      monthlyData.push({ month: label, entradas, saidas });
    }

    // Despesas por categoria
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e: Record<string, unknown>) => {
      const cat = (e.category as string) || "geral";
      categoryMap[cat] = (categoryMap[cat] ?? 0) + ((e.amount as number) ?? 0);
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
