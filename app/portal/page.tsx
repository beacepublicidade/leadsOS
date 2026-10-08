"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface LeadRow {
  id:         string;
  name:       string;
  status:     string;
  source:     string;
  score:      number;
  created_at: string;
}

interface PortalData {
  client: {
    name:        string;
    niche:       string;
    brand_color?: string;
    lp_logo_url?: string;
  };
  stats: {
    total:          number;
    byStatus:       Record<string, number>;
    closedThisMonth: number;
    totalRevenue:   number;
    avgScore:       number;
  };
  recent: LeadRow[];
}

const STATUS_LABEL: Record<string, string> = {
  novo:                "Novo",
  contato:             "Contato",
  proposta:            "Proposta",
  aguardando_assinatura: "Aguard. Assinatura",
  fechado:             "Fechado",
  perdido:             "Perdido",
};

const STATUS_COLOR: Record<string, string> = {
  novo:     "#3b82f6",
  contato:  "#f59e0b",
  proposta: "#8b5cf6",
  fechado:  "#22c55e",
  perdido:  "#ef4444",
};

const FUNNEL_ORDER = ["novo", "contato", "proposta", "fechado"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function PortalContent() {
  const params = useSearchParams();
  const token  = params.get("t");

  const [data,    setData]    = useState<PortalData | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError("Link inválido."); setLoading(false); return; }
    fetch(`/api/portal?t=${token}`)
      .then(r => r.json())
      .then(j => {
        if (!j.success) throw new Error(j.error ?? "Erro ao carregar.");
        setData(j as PortalData & { success: boolean });
      })
      .catch(e => setError(e instanceof Error ? e.message : "Erro."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#09090b", color: "#a1a1aa", fontSize: 14 }}>
      Carregando...
    </div>
  );

  if (error || !data) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#09090b", color: "#a1a1aa", fontSize: 14, gap: 8 }}>
      <span style={{ fontSize: 32 }}>🔒</span>
      <p>{error ?? "Link inválido ou expirado."}</p>
    </div>
  );

  const accent = data.client.brand_color ?? "#7c3aed";
  const { stats, recent } = data;
  const funnelMax = Math.max(...FUNNEL_ORDER.map(s => stats.byStatus[s] ?? 0), 1);

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "'Inter', sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 14, background: "#111113" }}>
        {data.client.lp_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.client.lp_logo_url} alt="Logo" style={{ height: 36, objectFit: "contain", borderRadius: 6 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {data.client.name[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.2px" }}>{data.client.name}</div>
          <div style={{ fontSize: 11, color: "#71717a" }}>{data.client.niche} — Painel de Leads</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#52525b" }}>
          Atualizado em {new Date().toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total de Leads",     value: stats.total,                      color: accent },
            { label: "Fechados este mês",  value: stats.closedThisMonth,            color: "#22c55e" },
            { label: "Receita gerada",     value: fmtBRL(stats.totalRevenue),       color: "#22c55e" },
            { label: "Score médio",        value: stats.avgScore ? `${stats.avgScore}/100` : "—", color: accent },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>

          {/* Funil */}
          <div style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "#fafafa" }}>Funil de vendas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FUNNEL_ORDER.map(status => {
                const count = stats.byStatus[status] ?? 0;
                const pct   = Math.round((count / funnelMax) * 100);
                return (
                  <div key={status}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: "#a1a1aa" }}>{STATUS_LABEL[status] ?? status}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: STATUS_COLOR[status] ?? accent, borderRadius: 4, transition: "width .4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status breakdown */}
          <div style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "#fafafa" }}>Distribuição por status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(stats.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const pct = Math.round((count / (stats.total || 1)) * 100);
                  return (
                    <div key={status} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[status] ?? "#71717a", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: "#a1a1aa" }}>{STATUS_LABEL[status] ?? status}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{count}</span>
                      <span style={{ fontSize: 11, color: "#52525b", width: 32, textAlign: "right" }}>{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Leads recentes */}
        <div style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 13, fontWeight: 600 }}>
            Leads recentes
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
              <thead>
                <tr style={{ background: "#0e0e10" }}>
                  {["Nome", "Status", "Origem", "Score", "Data"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#52525b", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "#52525b" }}>Nenhum lead ainda.</td></tr>
                )}
                {recent.map(lead => (
                  <tr key={lead.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{lead.name}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${STATUS_COLOR[lead.status] ?? "#71717a"}1a`, color: STATUS_COLOR[lead.status] ?? "#a1a1aa" }}>
                        {STATUS_LABEL[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#71717a", fontSize: 12 }}>{lead.source || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {lead.score > 0 ? (
                        <span style={{ color: lead.score >= 70 ? "#22c55e" : lead.score >= 40 ? "#f59e0b" : "#a1a1aa", fontWeight: 600 }}>
                          {lead.score}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#52525b", fontSize: 12 }}>{fmtDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "#3f3f46" }}>
          Powered by LeadsOS · Departamento Comercial IA
        </p>
      </main>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#09090b", color: "#a1a1aa", fontSize: 14 }}>
        Carregando...
      </div>
    }>
      <PortalContent />
    </Suspense>
  );
}
