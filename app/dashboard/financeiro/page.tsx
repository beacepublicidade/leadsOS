"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, TrendingUp, AlertTriangle, Receipt, ArrowRight,
  CreditCard, RefreshCw, FileText, BarChart2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Charge {
  id: string;
  client_name: string;
  description: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at?: string;
  created_at: string;
}

interface FluxoData {
  monthly: { month: string; entradas: number; saidas: number }[];
}

export default function FinanceiroPage() {
  const router = useRouter();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [fluxo, setFluxo] = useState<FluxoData | null>(null);
  const [expenses, setExpenses] = useState<{ amount: number; due_date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/financeiro/cobrancas").then(r => r.json()),
      fetch("/api/financeiro/fluxo").then(r => r.json()),
      fetch("/api/financeiro/despesas").then(r => r.json()),
    ]).then(([ch, fl, ex]) => {
      if (ch.success) setCharges(ch.data);
      if (fl.success) setFluxo(fl.data);
      if (ex.success) setExpenses(ex.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const receitaMes = charges
    .filter(c => c.status === "pago" && c.paid_at && c.paid_at.startsWith(monthKey))
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  const aReceber = charges
    .filter(c => c.status === "pendente")
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  const inadimplencia = charges
    .filter(c => c.status === "pendente" && c.due_date < now.toISOString().slice(0, 10))
    .reduce((s, c) => s + (c.amount ?? 0), 0);

  const despesasMes = expenses
    .filter(e => e.due_date?.startsWith(monthKey))
    .reduce((s, e) => s + (e.amount ?? 0), 0);

  const lucro = receitaMes - despesasMes;

  // Próximos vencimentos (7 dias)
  const in7Days = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const proximosVencimentos = charges
    .filter(c => c.status === "pendente" && c.due_date >= now.toISOString().slice(0, 10) && c.due_date <= in7Days)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Cobranças, recorrências e fluxo de caixa</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 28, gridTemplateColumns: "repeat(5, 1fr)" }}>
        {[
          { icon: DollarSign, label: "Receita do mês", value: `R$ ${receitaMes.toLocaleString("pt-BR")}`, iconBg: "rgba(34,197,94,0.15)", iconColor: "#22c55e" },
          { icon: CreditCard, label: "A receber", value: `R$ ${aReceber.toLocaleString("pt-BR")}`, iconBg: "rgba(59,130,246,0.15)", iconColor: "#3b82f6" },
          { icon: AlertTriangle, label: "Inadimplência", value: `R$ ${inadimplencia.toLocaleString("pt-BR")}`, iconBg: "rgba(239,68,68,0.15)", iconColor: "#ef4444" },
          { icon: Receipt, label: "Despesas do mês", value: `R$ ${despesasMes.toLocaleString("pt-BR")}`, iconBg: "rgba(245,158,11,0.15)", iconColor: "#f59e0b" },
          { icon: TrendingUp, label: "Lucro líquido", value: `R$ ${lucro.toLocaleString("pt-BR")}`, iconBg: lucro >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", iconColor: lucro >= 0 ? "#22c55e" : "#ef4444" },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon" style={{ background: kpi.iconBg }}>
              <kpi.icon size={18} color={kpi.iconColor} strokeWidth={2} />
            </div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico Entradas vs Saídas */}
      {fluxo && fluxo.monthly.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Entradas vs Saídas - Últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fluxo.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#fafafa" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Cobranças recentes */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cobranças recentes</div>
            <a href="/dashboard/financeiro/contas-receber" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              Ver todas <ArrowRight size={12} />
            </a>
          </div>
          {charges.slice(0, 5).map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.client_name || c.description}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.due_date ? new Date(c.due_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
              </div>
              <span style={{
                padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                background: c.status === "pago" ? "var(--success-light)" : c.status === "vencido" ? "var(--error-light)" : "var(--warning-light)",
                color: c.status === "pago" ? "var(--success)" : c.status === "vencido" ? "var(--error)" : "var(--warning)",
              }}>
                {c.status}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>R$ {(c.amount ?? 0).toLocaleString("pt-BR")}</span>
            </div>
          ))}
          {charges.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>Nenhuma cobrança cadastrada</div>
          )}
        </div>

        {/* Próximos vencimentos */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Próximos vencimentos (7 dias)</div>
          </div>
          {proximosVencimentos.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>Nenhum vencimento nos próximos 7 dias</div>
          ) : proximosVencimentos.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={16} color="#f59e0b" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{c.client_name || c.description}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Vence {new Date(c.due_date + "T12:00:00").toLocaleDateString("pt-BR")}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)" }}>R$ {(c.amount ?? 0).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Contas a Receber", icon: CreditCard, href: "/dashboard/financeiro/contas-receber", color: "#3b82f6" },
          { label: "Recorrências", icon: RefreshCw, href: "/dashboard/financeiro/recorrencias", color: "#22c55e" },
          { label: "Notas Fiscais", icon: FileText, href: "/dashboard/financeiro/notas-fiscais", color: "#f59e0b" },
          { label: "Fluxo de Caixa", icon: BarChart2, href: "/dashboard/financeiro/fluxo-caixa", color: "#8b5cf6" },
        ].map((item, i) => (
          <button key={i} className="quick-btn" onClick={() => router.push(item.href)}>
            <div className="quick-btn-icon" style={{ color: item.color }}>
              <item.icon size={22} strokeWidth={1.8} />
            </div>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
