"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

interface FluxoData {
  monthly: { month: string; entradas: number; saidas: number }[];
  categories: { name: string; value: number }[];
}

const PIE_COLORS = ["#7c3aed", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4"];

const CATEGORY_LABELS: Record<string, string> = {
  geral: "Geral",
  marketing: "Marketing",
  infraestrutura: "Infraestrutura",
  pessoal: "Pessoal",
  impostos: "Impostos",
  ferramentas: "Ferramentas",
  escritorio: "Escritório",
};

export default function FluxoCaixaPage() {
  const [data, setData] = useState<FluxoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6");

  useEffect(() => {
    fetch(`/api/financeiro/fluxo?months=${period}`)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;

  const balanceData = (data?.monthly ?? []).map((m, i, arr) => {
    const prevBalance = i > 0
      ? arr.slice(0, i).reduce((s, x) => s + x.entradas - x.saidas, 0)
      : 0;
    return { month: m.month, saldo: prevBalance + m.entradas - m.saidas };
  });

  return (
    <div style={{ padding: "24px 32px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fluxo de Caixa</h1>
          <p className="page-subtitle">Visão financeira consolidada</p>
        </div>
        <select className="select" value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 180 }}>
          <option value="3">Últimos 3 meses</option>
          <option value="6">Últimos 6 meses</option>
          <option value="12">Último ano</option>
        </select>
      </div>

      {/* Entradas vs Saídas */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Entradas vs Saídas</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.monthly ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Saldo acumulado */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Saldo Acumulado</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#7c3aed" strokeWidth={2} dot={{ fill: "#7c3aed", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Despesas por categoria */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Despesas por Categoria</div>
          {(data?.categories ?? []).length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
              Nenhuma despesa categorizada ainda
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data?.categories ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${CATEGORY_LABELS[name ?? ""] ?? name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {(data?.categories ?? []).map((_entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabela resumo */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Resumo por Período</div>
        <div className="table-container" style={{ border: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Entradas</th>
                <th>Saídas</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {(data?.monthly ?? []).map(m => {
                const result = m.entradas - m.saidas;
                return (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 600 }}>{m.month}</td>
                    <td style={{ color: "var(--success)" }}>R$ {m.entradas.toLocaleString("pt-BR")}</td>
                    <td style={{ color: "var(--error)" }}>R$ {m.saidas.toLocaleString("pt-BR")}</td>
                    <td style={{ fontWeight: 700, color: result >= 0 ? "var(--success)" : "var(--error)" }}>
                      {result >= 0 ? "+" : ""}R$ {result.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
