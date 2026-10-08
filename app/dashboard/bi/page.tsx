"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const MapChart = dynamic(() => import("./MapChart"), { ssr: false });

// ── Color system (V4 white theme) ────────────────────────────────────────
const C = {
  bg:        "#f5f5f5",
  card:      "#ffffff",
  border:    "#e5e7eb",
  text:      "#111827",
  textSec:   "#374151",
  textMuted: "#9ca3af",
  accent:    "#dc2626",
  accentLt:  "#fee2e2",
  shadow:    "0 1px 4px rgba(0,0,0,0.08)",
  shadowMd:  "0 2px 12px rgba(0,0,0,0.10)",
};

// ── Types ─────────────────────────────────────────────────────────────────
interface ReportData {
  total: number; this_month: number; last_month: number; month_delta: number | null;
  conversion_rate: number; avg_sla_minutes: number | null;
  leads_by_day:      { date: string; count: number }[];
  by_status:         { status: string; count: number }[];
  by_source:         { source: string; count: number }[];
  top_campaigns:     { campaign: string; count: number }[];
  dropoff:           { stage: string; count: number; next_count: number | null; conversion_rate: number | null }[];
  sla_by_source:     { source: string; avg_minutes: number }[];
  avg_time_in_stage: { status: string; avg_days: number }[];
  total_revenue: number; avg_ticket: number;
  revenue_this_month: number; revenue_last_month: number;
}

interface LeadRow {
  id: string; name: string; phone: string; email: string;
  status: string; source: string; campaign_name: string;
  created_at: string; score: number;
}

interface Client { id: string; name: string; niche: string; }

type TabId = "geral" | "meta" | "google" | "cidades" | "vendas" | "produtos" | "agentes";

// ── Constants ─────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string }> = {
  novo:     { label: "Novo",     color: "#3b82f6" },
  contato:  { label: "Contato",  color: "#f59e0b" },
  proposta: { label: "Proposta", color: "#8b5cf6" },
  fechado:  { label: "Fechado",  color: "#10b981" },
  perdido:  { label: "Perdido",  color: "#6b7280" },
};

const SOURCE_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#f87171","#06b6d4","#fb923c"];

const SIDEBAR_TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "geral",    label: "Geral",      icon: "◉"  },
  { id: "meta",     label: "Meta Ads",   icon: "f"  },
  { id: "google",   label: "Google Ads", icon: "G"  },
  { id: "cidades",  label: "Cidades",    icon: "📍" },
  { id: "vendas",   label: "Vendas",     icon: "🛍" },
  { id: "produtos", label: "Produtos",   icon: "📦" },
  { id: "agentes",  label: "Agentes",    icon: "👤" },
];

// ── Mock data ─────────────────────────────────────────────────────────────
const MOCK_META = [
  { name: "Tráfego - SP",     invest: 4500, impres: 85000,  clicks: 2100, leads: 43, cpl: 104.65, roas: 5.2 },
  { name: "Retargeting",      invest: 1800, impres: 32000,  clicks: 980,  leads: 28, cpl: 64.28,  roas: 8.1 },
  { name: "Prospecting RJ",   invest: 3200, impres: 61000,  clicks: 1540, leads: 31, cpl: 103.22, roas: 4.7 },
  { name: "Lead Form Nac",    invest: 2600, impres: 48000,  clicks: 1220, leads: 52, cpl: 50.00,  roas: 6.8 },
  { name: "Story Ads",        invest: 1200, impres: 29000,  clicks: 610,  leads: 18, cpl: 66.66,  roas: 3.9 },
];

const MOCK_GOOGLE = [
  { name: "Search Branded",   invest: 2800, impres: 12000,  clicks: 1800, leads: 67, cpl: 41.79, roas: 9.2 },
  { name: "Search Genérico",  invest: 3600, impres: 45000,  clicks: 2400, leads: 48, cpl: 75.00, roas: 5.8 },
  { name: "Display Retarget", invest: 1100, impres: 95000,  clicks: 480,  leads: 12, cpl: 91.66, roas: 3.4 },
  { name: "Performance Max",  invest: 4200, impres: 78000,  clicks: 3100, leads: 74, cpl: 56.75, roas: 7.1 },
  { name: "YouTube Ads",      invest: 1900, impres: 142000, clicks: 890,  leads: 22, cpl: 86.36, roas: 4.5 },
];

const MOCK_CITIES = [
  { city: "são paulo",      count: 87 },
  { city: "rio de janeiro", count: 43 },
  { city: "belo horizonte", count: 31 },
  { city: "curitiba",       count: 28 },
  { city: "porto alegre",   count: 24 },
  { city: "fortaleza",      count: 19 },
  { city: "salvador",       count: 17 },
  { city: "campinas",       count: 15 },
  { city: "goiânia",        count: 13 },
  { city: "recife",         count: 11 },
];

const MOCK_PRODUCTS = [
  { name: "Gestão Completa",  revenue: 84000, leads: 28, vendas: 14, ticket: 6000, conv: 50, color: "#dc2626" },
  { name: "Tráfego Pago",     revenue: 62000, leads: 45, vendas: 20, ticket: 3100, conv: 44, color: "#3b82f6" },
  { name: "Social Media Pro", revenue: 48000, leads: 32, vendas: 16, ticket: 3000, conv: 50, color: "#8b5cf6" },
  { name: "Consultoria IA",   revenue: 35000, leads: 18, vendas: 7,  ticket: 5000, conv: 39, color: "#10b981" },
  { name: "Branding & Design",revenue: 27000, leads: 22, vendas: 9,  ticket: 3000, conv: 41, color: "#f59e0b" },
];

const MOCK_AGENTS = [
  { name: "Robson",    leads: 45,  vendas: 18, fat: 54000, conv: 40, sla: 8,  city: "são paulo"      },
  { name: "Ana Paula", leads: 38,  vendas: 14, fat: 42000, conv: 37, sla: 12, city: "rio de janeiro" },
  { name: "Carlos",    leads: 52,  vendas: 16, fat: 48000, conv: 31, sla: 15, city: "belo horizonte" },
  { name: "Mariana",   leads: 29,  vendas: 12, fat: 36000, conv: 41, sla: 6,  city: "curitiba"       },
  { name: "IA SDR",    leads: 124, vendas: 8,  fat: 24000, conv: 6,  sla: 1,  city: "são paulo"      },
];

// ── Utilities ─────────────────────────────────────────────────────────────
// Safe number coerce — returns fallback if null/undefined/NaN
function num(v: number | null | undefined, fallback = 0): number {
  return (v == null || isNaN(v as number)) ? fallback : (v as number);
}

function fmtBRL(v: number | null | undefined): string {
  const x = num(v);
  if (x >= 1_000_000) return `R$ ${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000)     return `R$ ${(x / 1_000).toFixed(0)}k`;
  return `R$ ${x.toLocaleString("pt-BR")}`;
}

function slaFmt(m: number | null | undefined): string {
  if (m == null) return "—";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch { return "—"; }
}

// ── Micro-components ──────────────────────────────────────────────────────
interface TItem { color: string; name: string; value: number; }

function V4Tooltip({ active, payload, label }: { active?: boolean; payload?: TItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: C.shadowMd }}>
      {label && <div style={{ color: C.textMuted, marginBottom: 4, fontSize: 11 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("pt-BR") : p.value}
        </div>
      ))}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) return null;
  const up = delta >= 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: up ? "#10b981" : "#ef4444", display: "inline-flex", alignItems: "center", gap: 2 }}>
      {up ? "↑" : "↓"} {Math.abs(delta)}%
    </span>
  );
}

function KpiCard({ label, value, sub, delta, color }: { label: string; value: string; sub: string; delta?: number | null; color: string }) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 150, background: C.card, border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, borderRadius: 10, padding: "16px 18px", boxShadow: C.shadow }}>
      <div style={{ fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.1, marginBottom: 6 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>{sub}</span>
        {delta !== undefined && delta !== null && <DeltaBadge delta={delta} />}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "#6b7280" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: m.color + "22", color: m.color, border: `1px solid ${m.color}44`, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {m.label}
    </span>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, boxShadow: C.shadow, ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

// ── Funnel ─────────────────────────────────────────────────────────────────
function FunnelVisual({ data }: { data: { status: string; count: number }[] }) {
  const stages = ["novo","contato","proposta","fechado"];
  const items = stages.map((s) => ({ ...STATUS_META[s], count: data.find((d) => d.status === s)?.count ?? 0 }));
  const maxCount = Math.max(...items.map((it) => it.count), 1);
  const W = 150, H = 180, stageH = H / items.length;
  const total = items[0]?.count ?? 0, opps = (items[1]?.count ?? 0) + (items[2]?.count ?? 0), closed = items[3]?.count ?? 0;
  const loRate = total > 0 ? Math.round((opps / total) * 100) : 0;
  const ovRate = opps > 0 ? Math.round((closed / opps) * 100) : 0;
  const convRate = total > 0 ? Math.round((closed / total) * 100) : 0;
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
        {items.map((item, i) => {
          const topW = W * (item.count / maxCount);
          const nextCount = items[i + 1]?.count ?? 0;
          const botW = i < items.length - 1 ? W * (nextCount / maxCount) : topW * 0.55;
          const topX = (W - topW) / 2, botX = (W - botW) / 2;
          const y = i * stageH;
          const pts = `${topX},${y} ${topX + topW},${y} ${botX + botW},${y + stageH - 2} ${botX},${y + stageH - 2}`;
          return <polygon key={i} points={pts} fill={item.color} opacity={0.85} />;
        })}
      </svg>
      <div style={{ flex: 1 }}>
        {items.map((item, i) => (
          <div key={i} style={{ height: stageH, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, lineHeight: 1 }}>{item.count.toLocaleString("pt-BR")}</div>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
          </div>
        ))}
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
          {[{ label: "L→O", value: `${loRate}%` }, { label: "O→V", value: `${ovRate}%` }, { label: "Conv", value: `${convRate}%` }, { label: "CPL", value: "—" }].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Campaign table with red total row ─────────────────────────────────────
function CampaignTable({ rows, columns, totalRow }: {
  rows: Record<string, string | number>[];
  columns: { key: string; label: string; align?: "right" | "left" }[];
  totalRow?: Record<string, string | number>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            {columns.map((col) => (
              <th key={col.key} style={{ padding: "8px 10px", textAlign: col.align ?? "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "#f9fafb")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: "9px 10px", textAlign: col.align ?? "left", color: col.key === columns[0].key ? C.textSec : C.textMuted, fontWeight: col.key === columns[0].key ? 600 : 400, whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {totalRow && (
            <tr style={{ background: "#fee2e2", borderTop: `2px solid #fca5a5` }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: "9px 10px", textAlign: col.align ?? "left", color: C.accent, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {totalRow[col.key]}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function BiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("geral");
  const [data,      setData]      = useState<ReportData | null>(null);
  const [leads,     setLeads]     = useState<LeadRow[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [clientId,  setClientId]  = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  async function fetchData(cid = clientId, sd = startDate, ed = endDate) {
    setLoading(true); setError(null);
    try {
      const rp = new URLSearchParams(), lp = new URLSearchParams();
      if (cid) { rp.set("client_id", cid); lp.set("client_id", cid); }
      if (sd)  { rp.set("start_date", sd); lp.set("start", sd); }
      if (ed)  { rp.set("end_date", ed);   lp.set("end", ed); }
      const rqs = rp.toString() ? `?${rp}` : "", lqs = lp.toString() ? `?${lp}` : "";
      const [resR, resL, resC] = await Promise.all([fetch(`/api/reports${rqs}`), fetch(`/api/leads${lqs}`), fetch("/api/clients")]);
      const [jsonR, jsonL, jsonC] = await Promise.all([resR.json(), resL.json(), resC.json()]);
      if (!jsonR.success) throw new Error(jsonR.error ?? "Erro ao carregar relatório.");
      setData(jsonR.data as ReportData);
      setLeads((jsonL.leads ?? []) as LeadRow[]);
      setClients((jsonC.data ?? []) as Client[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statusCount = (s: string) => data?.by_status.find((b) => b.status === s)?.count ?? 0;
  const opps   = statusCount("contato") + statusCount("proposta");
  const closed = statusCount("fechado");

  // ── renderGeral ─────────────────────────────────────────────────────────
  function renderGeral() {
    if (!data) return null;
    const kpis = [
      { label: "Leads Totais",   value: num(data.total).toLocaleString("pt-BR"),  sub: `mês: ${num(data.this_month)}`,             delta: data.month_delta, color: "#3b82f6" },
      { label: "Oportunidades",  value: opps.toLocaleString("pt-BR"),             sub: "em pipeline",                              delta: null,             color: "#8b5cf6" },
      { label: "Vendas",         value: closed.toLocaleString("pt-BR"),           sub: "leads fechados",                           delta: null,             color: "#10b981" },
      { label: "Faturamento",    value: fmtBRL(data.total_revenue),               sub: `mês: ${fmtBRL(data.revenue_this_month)}`,  delta: null,             color: "#10b981" },
      { label: "Ticket Médio",   value: num(data.avg_ticket) > 0 ? fmtBRL(data.avg_ticket) : "—", sub: "por venda",               delta: null,             color: "#f59e0b" },
      { label: "Conversão",      value: `${num(data.conversion_rate)}%`,          sub: "novo → fechado",                           delta: null,             color: C.accent  },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 220px", gap: 16 }}>
          <Card>
            <CardHeader title="Atividade por Período" sub="leads por dia" />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.leads_by_day ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: C.textMuted }} allowDecimals={false} />
                <Tooltip content={<V4Tooltip />} />
                <Area type="monotone" dataKey="count" name="Leads" stroke={C.accent} strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardHeader title="Leads por Status" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(data.by_status ?? []).map((d) => ({ label: STATUS_META[d.status]?.label ?? d.status, count: d.count, status: d.status }))} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 12, fill: C.textSec }} width={62} />
                <Tooltip content={<V4Tooltip />} />
                <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                  {(data.by_status ?? []).map((entry, i) => <Cell key={i} fill={STATUS_META[entry.status]?.color ?? "#888"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card style={{ display: "flex", flexDirection: "column" }}>
            <CardHeader title="Ticket Médio" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>{data.avg_ticket > 0 ? fmtBRL(data.avg_ticket) : "—"}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>por proposta fechada</div>
              {data.revenue_this_month > 0 && data.revenue_last_month > 0 && (
                <DeltaBadge delta={Math.round(((data.revenue_this_month - data.revenue_last_month) / data.revenue_last_month) * 100)} />
              )}
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={data.leads_by_day} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
          <Card>
            <CardHeader title="Leads Recentes" action={<a href="/dashboard/leads" style={{ fontSize: 11, color: C.accent, textDecoration: "none" }}>Ver todos →</a>} />
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Nome","Telefone","Origem","Campanha","Status","Data"].map((h) => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 8).length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: C.textMuted, padding: "24px 0" }}>Nenhum lead encontrado</td></tr>
                ) : leads.slice(0, 8).map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 8px", fontWeight: 600, color: C.text, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name || "—"}</td>
                    <td style={{ padding: "8px 8px", color: C.textSec, fontFamily: "monospace", fontSize: 11 }}>{lead.phone || "—"}</td>
                    <td style={{ padding: "8px 8px", color: C.textMuted, fontSize: 11 }}>{lead.source || "—"}</td>
                    <td style={{ padding: "8px 8px", color: C.textMuted, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>{lead.campaign_name || "—"}</td>
                    <td style={{ padding: "8px 8px" }}><StatusBadge status={lead.status || "novo"} /></td>
                    <td style={{ padding: "8px 8px", color: C.textMuted, fontSize: 11 }}>{fmtDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <CardHeader title="Funil de Conversão" />
            <FunnelVisual data={data.by_status} />
          </Card>
        </div>
      </div>
    );
  }

  // ── renderMeta ───────────────────────────────────────────────────────────
  function renderMeta() {
    const inv = MOCK_META.reduce((s, r) => s + r.invest, 0);
    const totalLeads = MOCK_META.reduce((s, r) => s + r.leads, 0);
    const totalClicks = MOCK_META.reduce((s, r) => s + r.clicks, 0);
    const totalImpres = MOCK_META.reduce((s, r) => s + r.impres, 0);
    const avgCpl = totalLeads > 0 ? inv / totalLeads : 0;
    const avgRoas = inv > 0 ? (totalLeads * (data?.avg_ticket ?? 3000)) / inv : 0;
    const cols = [
      { key: "name",   label: "Campanha" },
      { key: "invest", label: "Invest.",    align: "right" as const },
      { key: "impres", label: "Impressões", align: "right" as const },
      { key: "clicks", label: "Cliques",    align: "right" as const },
      { key: "leads",  label: "Leads",      align: "right" as const },
      { key: "cpl",    label: "CPL",        align: "right" as const },
      { key: "roas",   label: "ROAS",       align: "right" as const },
    ];
    const rows = MOCK_META.map((r) => ({ name: r.name, invest: `R$ ${r.invest.toLocaleString("pt-BR")}`, impres: r.impres.toLocaleString("pt-BR"), clicks: r.clicks.toLocaleString("pt-BR"), leads: r.leads, cpl: `R$ ${r.cpl.toFixed(2)}`, roas: `${r.roas.toFixed(1)}x` }));
    const totalRow = { name: "TOTAL", invest: `R$ ${inv.toLocaleString("pt-BR")}`, impres: totalImpres.toLocaleString("pt-BR"), clicks: totalClicks.toLocaleString("pt-BR"), leads: totalLeads, cpl: `R$ ${avgCpl.toFixed(2)}`, roas: `${avgRoas.toFixed(1)}x` };
    const kpis = [
      { label: "Investimento",   value: fmtBRL(inv),                                sub: "total gasto",           color: "#1877F2" },
      { label: "Leads Gerados",  value: totalLeads.toString(),                       sub: "via Meta Ads",          color: C.accent  },
      { label: "CPL Médio",      value: `R$ ${avgCpl.toFixed(0)}`,                  sub: "custo por lead",        color: "#f59e0b" },
      { label: "ROAS",           value: `${avgRoas.toFixed(1)}x`,                   sub: "retorno s/ invest.",     color: "#10b981" },
      { label: "Cliques",        value: totalClicks.toLocaleString("pt-BR"),        sub: "total de cliques",      color: "#8b5cf6" },
      { label: "CTR",            value: `${((totalClicks/totalImpres)*100).toFixed(2)}%`, sub: "taxa de clique",  color: "#06b6d4" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <Card>
            <CardHeader title="Performance por Campanha" sub="dados mockados — conecte Meta Ads em Configurações → Integrações" />
            <CampaignTable rows={rows} columns={cols} totalRow={totalRow} />
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <CardHeader title="Leads por Campanha" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MOCK_META.map((r) => ({ name: r.name.slice(0,16), leads: r.leads }))} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.textSec }} width={95} />
                  <Tooltip content={<V4Tooltip />} />
                  <Bar dataKey="leads" name="Leads" fill="#1877F2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardHeader title="CPL por Campanha" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={MOCK_META.map((r) => ({ name: r.name.slice(0,14), cpl: r.cpl }))} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={(v: number) => `R$${v.toFixed(0)}`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.textSec }} width={95} />
                  <Tooltip content={<V4Tooltip />} />
                  <Bar dataKey="cpl" name="CPL (R$)" fill={C.accent} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── renderGoogle ─────────────────────────────────────────────────────────
  function renderGoogle() {
    const inv = MOCK_GOOGLE.reduce((s, r) => s + r.invest, 0);
    const totalLeads = MOCK_GOOGLE.reduce((s, r) => s + r.leads, 0);
    const totalClicks = MOCK_GOOGLE.reduce((s, r) => s + r.clicks, 0);
    const totalImpres = MOCK_GOOGLE.reduce((s, r) => s + r.impres, 0);
    const avgCpl = totalLeads > 0 ? inv / totalLeads : 0;
    const avgRoas = inv > 0 ? (totalLeads * (data?.avg_ticket ?? 3000)) / inv : 0;
    const cols = [
      { key: "name",   label: "Campanha" },
      { key: "invest", label: "Invest.",    align: "right" as const },
      { key: "impres", label: "Impressões", align: "right" as const },
      { key: "clicks", label: "Cliques",    align: "right" as const },
      { key: "leads",  label: "Leads",      align: "right" as const },
      { key: "cpl",    label: "CPL",        align: "right" as const },
      { key: "roas",   label: "ROAS",       align: "right" as const },
    ];
    const rows = MOCK_GOOGLE.map((r) => ({ name: r.name, invest: `R$ ${r.invest.toLocaleString("pt-BR")}`, impres: r.impres.toLocaleString("pt-BR"), clicks: r.clicks.toLocaleString("pt-BR"), leads: r.leads, cpl: `R$ ${r.cpl.toFixed(2)}`, roas: `${r.roas.toFixed(1)}x` }));
    const totalRow = { name: "TOTAL", invest: `R$ ${inv.toLocaleString("pt-BR")}`, impres: totalImpres.toLocaleString("pt-BR"), clicks: totalClicks.toLocaleString("pt-BR"), leads: totalLeads, cpl: `R$ ${avgCpl.toFixed(2)}`, roas: `${avgRoas.toFixed(1)}x` };
    const kpis = [
      { label: "Investimento",  value: fmtBRL(inv),                                    sub: "total gasto",          color: "#EA4335" },
      { label: "Leads Gerados", value: totalLeads.toString(),                           sub: "via Google Ads",       color: C.accent  },
      { label: "CPL Médio",     value: `R$ ${avgCpl.toFixed(0)}`,                      sub: "custo por lead",       color: "#f59e0b" },
      { label: "ROAS",          value: `${avgRoas.toFixed(1)}x`,                       sub: "retorno s/ invest.",    color: "#10b981" },
      { label: "Cliques",       value: totalClicks.toLocaleString("pt-BR"),            sub: "total de cliques",     color: "#4285F4" },
      { label: "CTR",           value: `${((totalClicks/totalImpres)*100).toFixed(2)}%`, sub: "taxa de clique",     color: "#34A853" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <Card>
            <CardHeader title="Performance por Campanha" sub="dados mockados — conecte Google Ads em Configurações → Integrações" />
            <CampaignTable rows={rows} columns={cols} totalRow={totalRow} />
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <CardHeader title="Leads por Campanha" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MOCK_GOOGLE.map((r) => ({ name: r.name.slice(0,16), leads: r.leads }))} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.textSec }} width={95} />
                  <Tooltip content={<V4Tooltip />} />
                  <Bar dataKey="leads" name="Leads" fill="#EA4335" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardHeader title="ROAS por Campanha" />
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={MOCK_GOOGLE.map((r) => ({ name: r.name.slice(0,14), roas: r.roas }))} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.textSec }} width={95} />
                  <Tooltip content={<V4Tooltip />} />
                  <Bar dataKey="roas" name="ROAS" fill="#34A853" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── renderCidades ────────────────────────────────────────────────────────
  function renderCidades() {
    const cityMap: Record<string, number> = {};
    leads.forEach((lead) => {
      const raw = (lead as unknown as { city?: string }).city ?? "";
      if (raw) { const key = raw.toLowerCase().trim(); cityMap[key] = (cityMap[key] ?? 0) + 1; }
    });
    const citiesData = Object.keys(cityMap).length > 3
      ? Object.entries(cityMap).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count)
      : MOCK_CITIES;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 440 }}>
              <MapChart cities={citiesData} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Ranking de Cidades" sub="leads por cidade" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {citiesData.slice(0, 10).map((c, i) => {
                const maxC = citiesData[0].count;
                const pct = Math.round((c.count / maxC) * 100);
                const cityLabel = c.city.split(" ").map((w: string) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: C.textSec, fontWeight: i < 3 ? 700 : 400 }}>{i + 1}. {cityLabel}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{c.count}</span>
                    </div>
                    <div style={{ background: "#f3f4f6", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: i === 0 ? C.accent : "#93c5fd", height: "100%", borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        <Card>
          <CardHeader title="Leads por Canal por Cidade" sub="Meta Ads vs Google Ads vs Direto (dados mockados)" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={citiesData.slice(0, 8).map((c) => ({ city: c.city.length > 10 ? c.city.slice(0,10)+"…" : c.city, meta: Math.round(c.count * 0.55), google: Math.round(c.count * 0.30), direto: Math.round(c.count * 0.15) }))} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="city" tick={{ fontSize: 11, fill: C.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: C.textMuted }} allowDecimals={false} />
              <Tooltip content={<V4Tooltip />} />
              <Bar dataKey="meta"   name="Meta Ads"   fill="#1877F2" stackId="a" />
              <Bar dataKey="google" name="Google Ads" fill="#EA4335" stackId="a" />
              <Bar dataKey="direto" name="Direto"     fill="#10b981" stackId="a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  }

  // ── renderVendas ─────────────────────────────────────────────────────────
  function renderVendas() {
    if (!data) return null;
    const campaignTotal = (data.top_campaigns ?? []).reduce((s, c) => s + c.count, 0) || 1;
    const kpis = [
      { label: "Faturamento",   value: fmtBRL(data.total_revenue),                    sub: `mês: ${fmtBRL(data.revenue_this_month)}`, color: "#10b981" },
      { label: "Leads",         value: num(data.total).toLocaleString("pt-BR"),       sub: `mês: ${num(data.this_month)}`,             color: "#3b82f6" },
      { label: "Oportunidades", value: opps.toLocaleString("pt-BR"),                  sub: "em negociação",                            color: "#8b5cf6" },
      { label: "Vendas",        value: closed.toLocaleString("pt-BR"),     sub: `conv: ${num(data.conversion_rate)}%`,      color: "#f59e0b" },
    ];
    const cols = [
      { key: "campanha", label: "Campanha" },
      { key: "leads",    label: "Leads",   align: "right" as const },
      { key: "pct",      label: "%",       align: "right" as const },
      { key: "invest",   label: "Invest.", align: "right" as const },
      { key: "cpl",      label: "CPL",     align: "right" as const },
      { key: "roas",     label: "ROAS",    align: "right" as const },
    ];
    const tc = data.top_campaigns ?? [];
    const campRows = tc.slice(0, 8).map((c) => ({ campanha: c.campaign, leads: c.count, pct: `${Math.round((c.count / campaignTotal) * 100)}%`, invest: "—", cpl: "—", roas: "—" }));
    const totalRow = { campanha: "TOTAL", leads: num(data.total), pct: "100%", invest: "—", cpl: "—", roas: "—" };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 16 }}>
          <Card>
            <CardHeader title="Leads por Campanha" sub={`top ${Math.min(tc.length, 10)}`} />
            {(data.top_campaigns ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tc.slice(0,10).map((d) => ({ label: d.campaign.length > 25 ? d.campaign.slice(0,23)+"…" : d.campaign, count: d.count }))} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: C.textSec }} width={110} />
                  <Tooltip content={<V4Tooltip />} />
                  <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                    {data.top_campaigns.slice(0,10).map((_, i) => <Cell key={i} fill={`hsl(${220+i*10},70%,${60-i*2}%)`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 12 }}>Sem dados de campanha</div>}
          </Card>
          <Card>
            <CardHeader title="Campanhas" />
            <CampaignTable rows={campRows} columns={cols} totalRow={totalRow} />
          </Card>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Card>
            <CardHeader title="Ranking por Origem" />
            {(data.by_source ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(data.by_source ?? []).map((d) => ({ label: d.source, count: d.count }))} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: C.textSec }} width={70} />
                  <Tooltip content={<V4Tooltip />} />
                  <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                    {data.by_source.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontSize: 12 }}>Sem dados</div>}
          </Card>
          <Card>
            <CardHeader title="Origem dos Leads" />
            {(data.by_source ?? []).length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={(data.by_source ?? []).map((d) => ({ name: d.source, value: d.count }))} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                      {data.by_source.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<V4Tooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
                  {data.by_source.slice(0,5).map((d, i) => {
                    const t = data.by_source.reduce((s, x) => s + x.count, 0);
                    const pct = t > 0 ? Math.round((d.count / t) * 100) : 0;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: SOURCE_COLORS[i % SOURCE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: C.textSec, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.source}</span>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontSize: 12 }}>Sem dados</div>}
          </Card>
          <Card>
            <CardHeader title="Leads por Dia" />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.leads_by_day} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={(v: string) => v.slice(8)} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: C.textMuted }} allowDecimals={false} />
                <Tooltip content={<V4Tooltip />} />
                <Area type="monotone" dataKey="count" name="Leads" stroke="#3b82f6" strokeWidth={1.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  }

  // ── renderProdutos ───────────────────────────────────────────────────────
  function renderProdutos() {
    const totalRev = MOCK_PRODUCTS.reduce((s, p) => s + p.revenue, 0);
    const totalVendas = MOCK_PRODUCTS.reduce((s, p) => s + p.vendas, 0);
    const totalLeads = MOCK_PRODUCTS.reduce((s, p) => s + p.leads, 0);
    const kpis = [
      { label: "Receita Total",  value: fmtBRL(totalRev),                              sub: "todos os produtos",   color: "#10b981" },
      { label: "Produto Top",    value: MOCK_PRODUCTS[0].name,                          sub: fmtBRL(MOCK_PRODUCTS[0].revenue), color: C.accent },
      { label: "Vendas",         value: totalVendas.toString(),                         sub: "pacotes fechados",    color: "#3b82f6" },
      { label: "Ticket Médio",   value: fmtBRL(Math.round(totalRev / totalVendas)),    sub: "por produto",         color: "#f59e0b" },
    ];
    const cols = [
      { key: "name",    label: "Produto" },
      { key: "vendas",  label: "Vendas",    align: "right" as const },
      { key: "leads",   label: "Leads",     align: "right" as const },
      { key: "conv",    label: "Conv%",     align: "right" as const },
      { key: "ticket",  label: "Ticket",    align: "right" as const },
      { key: "revenue", label: "Receita",   align: "right" as const },
    ];
    const rows = MOCK_PRODUCTS.map((p) => ({ name: p.name, vendas: p.vendas, leads: p.leads, conv: `${p.conv}%`, ticket: fmtBRL(p.ticket), revenue: fmtBRL(p.revenue) }));
    const totalRow = { name: "TOTAL", vendas: totalVendas, leads: totalLeads, conv: `${Math.round((totalVendas / totalLeads) * 100)}%`, ticket: fmtBRL(Math.round(totalRev / totalVendas)), revenue: fmtBRL(totalRev) };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <CardHeader title="Receita por Produto" />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MOCK_PRODUCTS.map((p) => ({ name: p.name, receita: p.revenue }))} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={(v: number) => fmtBRL(v)} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: C.textSec }} width={110} />
                <Tooltip content={<V4Tooltip />} />
                <Bar dataKey="receita" name="Receita" radius={[0, 4, 4, 0]}>
                  {MOCK_PRODUCTS.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardHeader title="Participação na Receita" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={MOCK_PRODUCTS.map((p) => ({ name: p.name, value: p.revenue }))} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {MOCK_PRODUCTS.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip content={<V4Tooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5 }}>
                {MOCK_PRODUCTS.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.textSec, flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{Math.round((p.revenue / totalRev) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
        <Card>
          <CardHeader title="Ranking de Produtos" sub="cadastre serviços em Configurações para dados reais" />
          <CampaignTable rows={rows} columns={cols} totalRow={totalRow} />
        </Card>
        <Card>
          <CardHeader title="Conversão por Produto" sub="% de leads que fecharam" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MOCK_PRODUCTS.map((p) => ({ name: p.name, conv: p.conv }))} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: C.textMuted }} unit="%" />
              <Tooltip content={<V4Tooltip />} />
              <Bar dataKey="conv" name="Conversão %" radius={[4,4,0,0]}>
                {MOCK_PRODUCTS.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  }

  // ── renderAgentes ────────────────────────────────────────────────────────
  function renderAgentes() {
    if (!data) return null;
    const maxFat = Math.max(...MOCK_AGENTS.map((a) => a.fat), 1);
    const agentCities = MOCK_AGENTS.map((a) => ({ city: a.city, count: a.vendas }));
    const kpis = [
      { label: "Faturamento",  value: fmtBRL(data.total_revenue),                 sub: `mês: ${fmtBRL(data.revenue_this_month)}`, color: "#10b981" },
      { label: "Vendas",       value: closed.toLocaleString("pt-BR"),             sub: "leads fechados",                         color: "#f59e0b" },
      { label: "SLA Médio",    value: slaFmt(data.avg_sla_minutes),               sub: "tempo de resposta",                      color: "#3b82f6" },
      { label: "Conversão",    value: `${num(data.conversion_rate)}%`,            sub: "novo → fechado",                         color: "#8b5cf6" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <CardHeader title="Ranking de Agentes" sub="por faturamento gerado" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...MOCK_AGENTS].sort((a, b) => b.fat - a.fat).map((agent, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: i === 0 ? C.accent : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: i === 0 ? "#fff" : C.textMuted, flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{agent.name}</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>{agent.leads} leads · {agent.vendas} vendas · {agent.conv}% conv</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981" }}>{fmtBRL(agent.fat)}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>SLA: {agent.sla}min</div>
                    </div>
                  </div>
                  <div style={{ background: "#e5e7eb", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((agent.fat / maxFat) * 100)}%`, background: i === 0 ? C.accent : "#93c5fd", height: "100%", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Vendas por Região</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>localização dos agentes</div>
            </div>
            <div style={{ flex: 1, minHeight: 300 }}>
              <MapChart cities={agentCities} />
            </div>
          </Card>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "60fr 40fr", gap: 16 }}>
          <Card>
            <CardHeader title="Performance por Período" sub="leads ativos" />
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.leads_by_day ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: C.textMuted }} allowDecimals={false} />
                <Tooltip content={<V4Tooltip />} />
                <Area type="monotone" dataKey="count" name="Leads" stroke="#8b5cf6" strokeWidth={2} fill="url(#g3)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardHeader title="Ciclo por Origem" />
            {(data.by_source ?? []).length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={(data.by_source ?? []).map((d) => ({ name: d.source, value: d.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {data.by_source.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<V4Tooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {(data.sla_by_source ?? []).length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>SLA por canal</div>
                    {(data.sla_by_source ?? []).slice(0,4).map((d, i) => {
                      const color = d.avg_minutes <= 10 ? "#10b981" : d.avg_minutes <= 60 ? "#f59e0b" : "#ef4444";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", background: "#f9fafb", borderRadius: 6, border: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 11, color: C.textSec }}>{d.source}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{slaFmt(d.avg_minutes)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontSize: 12 }}>Sem dados</div>}
          </Card>
        </div>
      </div>
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: C.bg }}>

      {/* Left icon sidebar */}
      <div style={{ width: 64, flexShrink: 0, background: "#fff", borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, paddingBottom: 16, gap: 4, overflowY: "auto" }}>
        {/* Logo */}
        <div style={{ width: 36, height: 36, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 16, flexShrink: 0 }}>B</div>

        {/* Tab icons */}
        {SIDEBAR_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              title={tab.label}
              onClick={() => setActiveTab(tab.id)}
              style={{ width: 44, height: 44, background: active ? C.accentLt : "transparent", border: active ? `1px solid #fca5a5` : "1px solid transparent", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: tab.id === "meta" || tab.id === "google" ? 14 : 18, fontWeight: tab.id === "meta" || tab.id === "google" ? 900 : 400, color: active ? C.accent : C.textMuted, fontFamily: tab.id === "meta" ? "serif" : "inherit", transition: "all 0.15s", flexShrink: 0 }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {tab.icon}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Back */}
        <button
          title="Voltar ao Dashboard"
          onClick={() => router.push("/dashboard")}
          style={{ width: 44, height: 44, background: "transparent", border: "1px solid transparent", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: C.textMuted, transition: "all 0.15s" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f9fafb")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >←</button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Filter bar */}
        <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>FILTRO DE DADOS</span>
          <div style={{ width: 1, height: 20, background: C.border }} />
          <span style={{ fontSize: 11, color: C.textMuted }}>De</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 13, color: C.text, background: "#fff", outline: "none" }} />
          <span style={{ fontSize: 11, color: C.textMuted }}>Até</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 13, color: C.text, background: "#fff", outline: "none" }} />
          <button onClick={() => fetchData(clientId, startDate, endDate)} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Filtrar</button>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(""); setEndDate(""); fetchData(clientId, "", ""); }} style={{ background: "#f3f4f6", color: C.textSec, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer" }}>Limpar</button>
          )}
          <select value={clientId} onChange={(e) => { setClientId(e.target.value); fetchData(e.target.value, startDate, endDate); }} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 12, color: C.text, background: "#fff", minWidth: 150, outline: "none" }}>
            <option value="">Todos os clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{SIDEBAR_TABS.find((t) => t.id === activeTab)?.label}</div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.textSec, padding: "60px 0", justifyContent: "center" }}>
              <div style={{ width: 20, height: 20, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "bispin 0.8s linear infinite" }} />
              <span style={{ fontSize: 14 }}>Carregando dados...</span>
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: "14px 18px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: C.accent, fontSize: 13, marginBottom: 20 }}>⚠ {error}</div>
          )}
          {!loading && !error && (
            <>
              {activeTab === "geral"    && renderGeral()}
              {activeTab === "meta"     && renderMeta()}
              {activeTab === "google"   && renderGoogle()}
              {activeTab === "cidades"  && renderCidades()}
              {activeTab === "vendas"   && renderVendas()}
              {activeTab === "produtos" && renderProdutos()}
              {activeTab === "agentes"  && renderAgentes()}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes bispin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
