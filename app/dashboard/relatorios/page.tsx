"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ReportData {
  total:                number;
  this_month:           number;
  last_month:           number;
  month_delta:          number | null;
  conversion_rate:      number;
  avg_sla_minutes:      number | null;
  leads_by_day:         { date: string; count: number }[];
  by_status:            { status: string; count: number }[];
  by_source:            { source: string; count: number }[];
  top_campaigns:        { campaign: string; count: number }[];
  dropoff:              { stage: string; count: number; next_count: number | null; conversion_rate: number | null }[];
  sla_by_source:        { source: string; avg_minutes: number }[];
  avg_time_in_stage:    { status: string; avg_days: number }[];
  total_revenue:        number;
  avg_ticket:           number;
  revenue_this_month:   number;
  revenue_last_month:   number;
}

interface Client { id: string; name: string; niche: string; }

const STATUS_META: Record<string, { label: string; color: string }> = {
  novo:     { label: "Novo",     color: "#60a5fa" },
  contato:  { label: "Contato",  color: "#f59e0b" },
  proposta: { label: "Proposta", color: "#a78bfa" },
  fechado:  { label: "Fechado",  color: "#34d399" },
  perdido:  { label: "Perdido",  color: "#6b7280" },
};

const SOURCE_COLORS = ["#60a5fa", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#06b6d4", "#fb923c"];

function slaLabel(mins: number | null) {
  if (mins === null) return "—";
  if (mins < 60)  return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function daysLabel(days: number) {
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days === 1) return "1 dia";
  return `${Math.round(days)}d`;
}

function fmtBRL(val: number) {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}k`;
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) return null;
  const up = delta >= 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: up ? "#34d399" : "#f87171", display: "inline-flex", alignItems: "center", gap: 2 }}>
      {up ? "↑" : "↓"} {Math.abs(delta)}%
    </span>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
}

function FunnelSVG({ data }: { data: { status: string; count: number }[] }) {
  const stages = ["novo", "contato", "proposta", "fechado"];
  const items = stages.map((s) => ({ ...STATUS_META[s], count: data.find((d) => d.status === s)?.count ?? 0 }));
  const maxCount = Math.max(...items.map((i) => i.count), 1);
  const W = 160;
  const H = 180;
  const stageH = H / items.length;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {items.map((item, i) => {
          const topW  = W * (item.count / maxCount);
          const nextCount = items[i + 1]?.count ?? 0;
          const botW  = i < items.length - 1 ? W * (nextCount / maxCount) : topW * 0.6;
          const topX  = (W - topW) / 2;
          const botX  = (W - botW) / 2;
          const y     = i * stageH;
          const pts   = `${topX},${y} ${topX + topW},${y} ${botX + botW},${y + stageH - 2} ${botX},${y + stageH - 2}`;
          return (
            <polygon key={i} points={pts} fill={item.color} opacity={0.85} />
          );
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{item.count.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const router = useRouter();
  const [data,      setData]      = useState<ReportData | null>(null);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [clientId,  setClientId]  = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  function handlePrint() { window.print(); }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((json) => {
      const user = json.user;
      if (user?.client_id && user?.profile !== "admin") router.replace("/dashboard");
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData(cid = clientId, sd = startDate, ed = endDate) {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (cid) params.set("client_id", cid);
      if (sd)  params.set("start_date", sd);
      if (ed)  params.set("end_date",   ed);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const [resR, resC] = await Promise.all([fetch(`/api/reports${qs}`), fetch("/api/clients")]);
      const [jsonR, jsonC] = await Promise.all([resR.json(), resC.json()]);
      if (!jsonR.success) throw new Error(jsonR.error);
      setData(jsonR.data);
      setClients(jsonC.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar relatório.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  const selectedClientName = clients.find((c) => c.id === clientId)?.name ?? "Todos os clientes";

  const kpiCards = data ? [
    { label: "Total de Leads",  value: data.total.toString(),                      sub: `mês: ${data.this_month}`,       delta: data.month_delta, color: "#60a5fa" },
    { label: "Este Mês",        value: data.this_month.toString(),                  sub: `anterior: ${data.last_month}`,  delta: data.month_delta, color: "#a78bfa" },
    { label: "Receita Total",   value: fmtBRL(data.total_revenue),                  sub: `mês: ${fmtBRL(data.revenue_this_month)}`,   delta: null,             color: "#34d399" },
    { label: "Conversão",       value: `${data.conversion_rate}%`,                  sub: "novo → fechado",                delta: null,             color: "#f59e0b" },
    { label: "SLA Médio",       value: slaLabel(data.avg_sla_minutes),               sub: "tempo resposta",                delta: null,             color: "#06b6d4" },
    { label: "Ticket Médio",    value: data.avg_ticket > 0 ? fmtBRL(data.avg_ticket) : "—", sub: "por proposta paga",    delta: null,             color: "#fb923c" },
  ] : [];

  return (
    <main className="page-container report-page">
      <style>{`
        .kpi-card { transition: transform 0.15s, box-shadow 0.15s; }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Print header */}
      <div className="print-header">
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>LeadsOS — Relatório Comercial</div>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>Cliente: {selectedClientName}{startDate && endDate ? ` · ${startDate} a ${endDate}` : ""}</div>
        <div style={{ fontSize: 12, color: "#888" }}>Gerado em {new Date().toLocaleString("pt-BR")}</div>
      </div>

      {/* ── HEADER ── */}
      <div className="no-print" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h1 className="page-title">Central Comercial</h1>
            <p className="page-subtitle">Performance · Conversão · Receita</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select className="select" style={{ width: "auto", minWidth: 160 }} value={clientId} onChange={(e) => { setClientId(e.target.value); fetchData(e.target.value); }}>
              <option value="">Todos os clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" className="input" style={{ width: "auto" }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>
            <input type="date" className="input" style={{ width: "auto" }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => fetchData(clientId, startDate, endDate)}>Filtrar</button>
            {(startDate || endDate) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(""); setEndDate(""); fetchData(clientId, "", ""); }}>Limpar</button>
            )}
            {data && (
              <button className="btn btn-secondary btn-sm" onClick={handlePrint}>⬇ PDF</button>
            )}
          </div>
        </div>

        {/* KPI Bar */}
        {data && (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {kpiCards.map(({ label, value, sub, delta, color }) => (
              <div
                key={label}
                className="kpi-card"
                style={{
                  flex: "0 0 auto",
                  minWidth: 140,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderTop: `3px solid ${color}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</span>
                  {delta !== null && <DeltaBadge delta={delta} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)", padding: "40px 0" }}>
          <div className="spinner" /> Carregando relatório...
        </div>
      )}
      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, color: "#f87171", marginBottom: 24 }}>{error}</div>
      )}

      {data && (
        <>
          {/* ── LINHA 1: AreaChart + BarChart status + Funil ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 260px", gap: 16, marginBottom: 20 }}>

            {/* Leads por período */}
            <div className="card">
              <div className="card-header"><span className="card-title">Leads por Período</span></div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.leads_by_day} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Leads" stroke="var(--accent)" strokeWidth={2} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Leads por status */}
            <div className="card">
              <div className="card-header"><span className="card-title">Por Status</span></div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.by_status.map((d) => ({ ...d, label: STATUS_META[d.status]?.label ?? d.status, color: STATUS_META[d.status]?.color ?? "#888" }))} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: "var(--text-muted)" }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                    {data.by_status.map((entry, i) => (
                      <Cell key={i} fill={STATUS_META[entry.status]?.color ?? "#888"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Funil visual */}
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <div className="card-header"><span className="card-title">Funil de Conversão</span></div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 8 }}>
                <FunnelSVG data={data.by_status} />
              </div>
            </div>
          </div>

          {/* ── LINHA 2: Drop-off + Donut origem ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

            {/* Drop-off */}
            <div className="card">
              <div className="card-header"><span className="card-title">Drop-off por Etapa</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                {data.dropoff.map((d, i) => {
                  const pct = d.conversion_rate ?? 0;
                  const barColor = pct >= 50 ? "#34d399" : pct >= 25 ? "#f59e0b" : "#f87171";
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{STATUS_META[d.stage]?.label ?? d.stage} → {d.next_count !== null ? `${d.next_count} leads` : "—"}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{d.conversion_rate !== null ? `${d.conversion_rate}%` : "—"}</span>
                      </div>
                      <div style={{ background: "var(--bg-surface)", borderRadius: 4, height: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                        <div style={{ width: `${pct}%`, background: barColor, height: "100%", borderRadius: 4, transition: "width 0.5s", minWidth: pct > 0 ? 4 : 0 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>% de leads que avançam para a próxima etapa</div>
              </div>
            </div>

            {/* Donut origem */}
            <div className="card">
              <div className="card-header"><span className="card-title">Origem dos Leads</span></div>
              {data.by_source.length > 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={data.by_source.map((d) => ({ name: d.source, value: d.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {data.by_source.map((_, i) => (
                          <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    {data.by_source.map((d, i) => {
                      const total = data.by_source.reduce((s, x) => s + x.count, 0);
                      const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: SOURCE_COLORS[i % SOURCE_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.source}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 12 }}>Sem dados de origem</div>
              )}
            </div>
          </div>

          {/* ── LINHA 3: Top campanhas + SLA + Tempo no estágio ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

            {/* Top campanhas */}
            <div className="card">
              <div className="card-header"><span className="card-title">Top Campanhas</span></div>
              {data.top_campaigns.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.top_campaigns.slice(0, 8).map((d) => ({ ...d, label: d.campaign.length > 30 ? d.campaign.slice(0, 28) + "…" : d.campaign }))} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 9, fill: "var(--text-muted)" }} />
                    <YAxis dataKey="label" type="category" tick={{ fontSize: 9, fill: "var(--text-secondary)" }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Leads" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 12 }}>Sem dados de campanha</div>
              )}
            </div>

            {/* SLA + Tempo no estágio */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.sla_by_source.length > 0 && (
                <div className="card" style={{ flex: 1 }}>
                  <div className="card-header"><span className="card-title">SLA por Canal</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {data.sla_by_source.map((d, i) => {
                      const color = d.avg_minutes <= 10 ? "#34d399" : d.avg_minutes <= 60 ? "#f59e0b" : "#f87171";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.source}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>{slaLabel(d.avg_minutes)}</span>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Verde ≤10min · Amarelo ≤1h · Vermelho &gt;1h</div>
                  </div>
                </div>
              )}

              <div className="card" style={{ flex: 1 }}>
                <div className="card-header"><span className="card-title">Tempo no Estágio</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.avg_time_in_stage.map((d, i) => {
                    const color = d.avg_days <= 1 ? "#34d399" : d.avg_days <= 5 ? "#f59e0b" : "#f87171";
                    const meta  = STATUS_META[d.status];
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: meta?.color ?? "#888" }} />
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{meta?.label ?? d.status}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{daysLabel(d.avg_days)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── LINHA 4: Receita ── */}
          {(data.total_revenue > 0 || data.revenue_this_month > 0) && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><span className="card-title">Receita</span></div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Receita Total",     value: data.total_revenue,          sub: "propostas pagas" },
                  { label: "Este Mês",          value: data.revenue_this_month,     sub: "mês corrente" },
                  { label: "Mês Anterior",      value: data.revenue_last_month,     sub: "comparativo" },
                  { label: "Ticket Médio",      value: data.avg_ticket,             sub: "por proposta" },
                ].map(({ label, value, sub }) => (
                  <div key={label} style={{ flex: "1 1 140px", textAlign: "center", padding: "12px 0" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#34d399" }}>
                      {value > 0 ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600, marginTop: 4 }}>{label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DETALHES COLAPSÁVEIS ── */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
            <button
              onClick={() => setShowDetail(!showDetail)}
              style={{ width: "100%", padding: "12px 20px", background: "var(--bg-overlay)", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}
            >
              Ver dados completos
              <span style={{ fontSize: 11 }}>{showDetail ? "▲" : "▼"}</span>
            </button>
            {showDetail && (
              <div className="table-container" style={{ borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Métrica</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Total de leads", data.total],
                      ["Este mês", data.this_month],
                      ["Mês anterior", data.last_month],
                      ["Variação mês", data.month_delta !== null ? `${data.month_delta}%` : "—"],
                      ["Taxa de conversão", `${data.conversion_rate}%`],
                      ["SLA médio", slaLabel(data.avg_sla_minutes)],
                      ["Receita total", `R$ ${data.total_revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
                      ["Receita este mês", `R$ ${data.revenue_this_month.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
                      ["Ticket médio", data.avg_ticket > 0 ? `R$ ${data.avg_ticket.toLocaleString("pt-BR")}` : "—"],
                    ].map(([label, value]) => (
                      <tr key={label as string}>
                        <td className="text-secondary">{label}</td>
                        <td className="font-medium text-primary">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
