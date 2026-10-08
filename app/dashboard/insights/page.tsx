"use client";

import { useState } from "react";

interface InsightSummary {
  byStatus:   Record<string, number>;
  bySource:   Record<string, number>;
  revenue:    number;
  avgScore:   number;
  totalLeads: number;
}

const STATUS_LABEL: Record<string, string> = {
  novo:     "Novo",
  contato:  "Contato",
  proposta: "Proposta",
  fechado:  "Fechado",
  perdido:  "Perdido",
};

export default function InsightsPage() {
  const [loading,  setLoading]  = useState(false);
  const [insights, setInsights] = useState<string>("");
  const [summary,  setSummary]  = useState<InsightSummary | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  async function generateInsights() {
    setLoading(true); setError(null); setInsights("");
    try {
      const res  = await fetch("/api/ai/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setInsights(json.insights);
      setSummary(json.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar insights.");
    } finally {
      setLoading(false);
    }
  }

  // Formata markdown simples (bullet points e negrito)
  function renderInsights(text: string) {
    return text.split("\n").map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
      const isBullet = line.trim().startsWith("-") || line.trim().startsWith("•") || /^\d+\./.test(line.trim());
      const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return (
        <div
          key={i}
          style={{
            padding: isBullet ? "4px 0 4px 16px" : "6px 0",
            borderLeft: isBullet ? "2px solid var(--accent)" : "none",
            marginLeft: isBullet ? 0 : 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-primary)",
          }}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">✨ Insights IA</h1>
          <p className="page-subtitle">Análise automática do pipeline com inteligência artificial</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={generateInsights}
          disabled={loading}
          style={{ minWidth: 160 }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              Analisando...
            </span>
          ) : insights ? "🔄 Atualizar análise" : "✨ Gerar Insights"}
        </button>
      </div>

      {/* Estado inicial */}
      {!loading && !insights && !error && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon">✨</div>
          <div className="empty-state-title">Análise inteligente do pipeline</div>
          <div className="empty-state-text" style={{ maxWidth: 400 }}>
            A IA analisa seus dados de leads, conversões e receita para gerar insights
            acionáveis e identificar os principais gargalos de vendas.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={generateInsights}>
            Gerar agora
          </button>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "var(--error-border)", background: "var(--error-light)", color: "var(--error)", marginTop: 16 }}>
          {error}
        </div>
      )}

      {/* Resumo numérico */}
      {summary && (
        <div className="stats-grid" style={{ marginTop: 20, marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-value">{summary.totalLeads}</div>
            <div className="stat-label">Leads analisados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--success)" }}>
              R$ {summary.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-label">Receita total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: summary.avgScore >= 60 ? "var(--success)" : summary.avgScore >= 35 ? "var(--warning)" : "var(--error)" }}>
              {summary.avgScore}/100
            </div>
            <div className="stat-label">Score médio</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--accent)" }}>
              {summary.byStatus.fechado ?? 0}
            </div>
            <div className="stat-label">Convertidos</div>
          </div>
        </div>
      )}

      {/* Funil rápido */}
      {summary && (
        <div className="flex gap-4" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: "1 1 240px" }}>
            <div className="card-header"><span className="card-title">Funil de status</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(summary.byStatus).map(([status, count]) => {
                const pct = summary.totalLeads ? Math.round((count / summary.totalLeads) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className="text-xs text-muted" style={{ width: 70, textAlign: "right", flexShrink: 0 }}>
                      {STATUS_LABEL[status] ?? status}
                    </span>
                    <div style={{ flex: 1, background: "var(--bg-surface)", borderRadius: 4, height: 18, border: "1px solid var(--border)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: "var(--accent)", height: "100%", minWidth: count > 0 ? 4 : 0, opacity: 0.8 }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ width: 30, flexShrink: 0 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ flex: "1 1 240px" }}>
            <div className="card-header"><span className="card-title">Origem dos leads</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(summary.bySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
                const pct = summary.totalLeads ? Math.round((count / summary.totalLeads) * 100) : 0;
                return (
                  <div key={source} className="flex items-center gap-2">
                    <span className="text-xs text-muted" style={{ width: 90, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={source}>
                      {source}
                    </span>
                    <div style={{ flex: 1, background: "var(--bg-surface)", borderRadius: 4, height: 18, border: "1px solid var(--border)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: "#06b6d4", height: "100%", minWidth: count > 0 ? 4 : 0, opacity: 0.8 }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ width: 30, flexShrink: 0 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Insights da IA */}
      {insights && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Análise da IA</span>
            <span className="badge badge-accent" style={{ fontSize: 10 }}>claude-3-haiku</span>
          </div>
          <div style={{ lineHeight: 1.7 }}>
            {renderInsights(insights)}
          </div>
        </div>
      )}
    </main>
  );
}
