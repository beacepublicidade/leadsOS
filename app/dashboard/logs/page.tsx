"use client";

import { useEffect, useRef, useState } from "react";

interface Log {
  id:         string;
  lead_id:    string;
  type:       string;
  message:    string;
  created_at: string;
}

const TYPE_META: Record<string, string> = {
  notification:  "badge-accent",
  status_change: "badge-warning",
  followup:      "badge-default",
  automation:    "badge-success",
};

export default function LogsPage() {
  const [logs,        setLogs]        = useState<Log[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [leadFilter,  setLeadFilter]  = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchLogs(lead_id = leadFilter) {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (lead_id.trim()) params.set("lead_id", lead_id.trim());
      const res  = await fetch(`/api/logs${params.size ? `?${params}` : ""}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setLogs(json.logs ?? []);
    } catch {
      setError("Erro ao carregar logs.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(); }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchLogs(), 10_000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, leadFilter]);
  /* eslint-enable react-hooks/exhaustive-deps */

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    fetchLogs(leadFilter);
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Logs do sistema</h1>
          <p className="page-subtitle">{logs.length} entrada(s) · atualiza a cada 10s</p>
        </div>
        <div className="flex items-center gap-2">
          {autoRefresh && (
            <span className="badge badge-success" style={{ fontSize: 11 }}>● ao vivo</span>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            Auto-refresh
          </label>
          <button className="btn btn-secondary btn-sm" onClick={() => { setLoading(true); fetchLogs(); }}>
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtro */}
      <form onSubmit={handleFilterSubmit} className="flex gap-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Filtrar por lead_id..."
          value={leadFilter}
          onChange={(e) => setLeadFilter(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">Filtrar</button>
        {leadFilter && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setLeadFilter(""); setLoading(true); fetchLogs(""); }}
          >
            Limpar
          </button>
        )}
      </form>

      {/* Estados */}
      {error && (
        <p style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}
      {loading && (
        <div className="flex items-center gap-3" style={{ padding: "24px 0" }}>
          <div className="spinner" />
          <span className="text-secondary text-sm">Carregando logs...</span>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Nenhum log encontrado</div>
          <div className="empty-state-text">
            {leadFilter ? "Tente outro lead_id." : "Os logs de automação aparecerão aqui."}
          </div>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Tipo</th>
                <th style={{ width: 200 }}>Lead ID</th>
                <th>Mensagem</th>
                <th style={{ width: 160 }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className={`badge ${TYPE_META[log.type] ?? "badge-default"}`} style={{ fontSize: 10 }}>
                      {log.type}
                    </span>
                  </td>
                  <td>
                    {log.lead_id ? (
                      <a
                        href={`/dashboard/leads/${log.lead_id}`}
                        style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12, fontFamily: "monospace" }}
                      >
                        {log.lead_id}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{log.message}</td>
                  <td className="text-xs text-muted" style={{ whiteSpace: "nowrap" }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
