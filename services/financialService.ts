// services/financialService.ts — Lógica de cobranças, recorrências e KPIs financeiros

import { supabaseAdmin } from "@/lib/supabase-admin";

export interface ChargeData {
  id?: string;
  client_id: string;
  client_name?: string;
  description: string;
  amount: number;
  status: "pendente" | "pago" | "vencido" | "cancelado";
  payment_type: "pix" | "boleto";
  cora_id?: string;
  pix_code?: string;
  boleto_url?: string;
  due_date: string;
  paid_at?: string;
  nfse_id?: string;
  recurrence_id?: string;
  tenant_id: string;
  created_at?: string;
}

export interface RecurrenceData {
  id?: string;
  client_id: string;
  client_name?: string;
  description: string;
  amount: number;
  day_of_month: number;
  payment_type: "pix" | "boleto";
  status: "ativa" | "pausada" | "encerrada";
  start_date: string;
  end_date?: string;
  next_charge_date: string;
  auto_nfse?: boolean;
  tenant_id: string;
  created_at?: string;
}

export interface FinancialKPIs {
  receita_mes: number;
  a_receber: number;
  inadimplencia: number;
  despesas_mes: number;
  lucro_liquido: number;
}

export async function getFinancialKPIs(tenantId: string): Promise<FinancialKPIs> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [{ data: charges }, { data: expenses }] = await Promise.all([
    supabaseAdmin
      .from("financial_charges")
      .select("amount, status, paid_at, due_date")
      .eq("tenant_id", tenantId),
    supabaseAdmin
      .from("financial_expenses")
      .select("amount, due_date")
      .eq("tenant_id", tenantId)
      .gte("due_date", startOfMonth)
      .lte("due_date", endOfMonth),
  ]);

  const allCharges = charges ?? [];

  const receitaMes = allCharges
    .filter(c => c.status === "pago" && c.paid_at && c.paid_at >= startOfMonth && c.paid_at <= endOfMonth)
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  const aReceber = allCharges
    .filter(c => c.status === "pendente")
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  const inadimplencia = allCharges
    .filter(c => c.status === "vencido" || (c.status === "pendente" && c.due_date < now.toISOString().slice(0, 10)))
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  const despesasMes = (expenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);

  return {
    receita_mes:   receitaMes,
    a_receber:     aReceber,
    inadimplencia,
    despesas_mes:  despesasMes,
    lucro_liquido: receitaMes - despesasMes,
  };
}

export function getNextChargeDate(dayOfMonth: number, fromDate?: string): string {
  const base = fromDate ? new Date(fromDate) : new Date();
  let year  = base.getFullYear();
  let month = base.getMonth() + 1;

  if (base.getDate() >= dayOfMonth) {
    month++;
    if (month > 12) { month = 1; year++; }
  }

  const maxDay = new Date(year, month, 0).getDate();
  const day    = Math.min(dayOfMonth, maxDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
