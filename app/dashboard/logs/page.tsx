"use client";

import { useEffect, useRef, useState } from "react";

interface Log {
  id:         string;
  lead_id:    string;
  type:       string;
  message:    string;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  notification:  "#1a6fbf",
  status_change: "#7c3aed",
  followup:      "#b45309",
  automation:    "#16a34a",
};

export default function LogsPage() {
  const [logs, setLogs]           = useState<Log[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [leadFilter, setLeadFilter] = useState("");
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

  // Initial fetch — fetchLogs is intentionally excluded to run only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(); }, []);

  // Auto-refresh every 10s — fetchLogs intentionally omitted (leadFilter already in deps)
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
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 1100 }}>
      <h1>LeadsOS — Logs</h1>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <a href="/dashboard" style={{ fontSize: ".9rem" }}>← Dashboard</a>

        <form onSubmit={handleFilterSubmit} style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Filtrar por lead_id"
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            style={{ padding: ".35rem .6rem", width: 240 }}
          />
          <button type="submit">Filtrar</button>
          {leadFilter && (
            <button type="button" onClick={() => { setLeadFilter(""); setLoading(true); fetchLogs(""); }}>
              Limpar
            </button>
          )}
        </form>

        <button onClick={() => { setLoading(true); fetchLogs(); }}>Atualizar</button>

        <label style={{ display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".9rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh (10s)
        </label>

        <span style={{ marginLeft: "auto", fontSize: ".85rem", color: "#888" }}>
          {logs.length} log(s)
        </span>
      </div>

      {error   && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p style={{ color: "#888" }}>Carregando...</p>}

      {!loading && logs.length === 0 && (
        <p style={{ color: "#888" }}>Nenhum log encontrado.</p>
      )}

      {!loading && logs.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead style={{ background: "#f0f0f0" }}>
              <tr>
                <th style={{ width: 90  }}>Tipo</th>
                <th style={{ width: 200 }}>Lead ID</th>
                <th>Mensagem</th>
                <th style={{ width: 160 }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span style={{
                      background: TYPE_COLORS[log.type] ?? "#555",
                      color:      "#fff",
                      borderRadius: 4,
                      padding:    "2px 8px",
                      fontSize:   ".78rem",
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                    }}>
                      {log.type}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: ".8rem" }}>{log.lead_id || "—"}</code>
                  </td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{log.message}</td>
                  <td style={{ fontSize: ".85rem", color: "#555", whiteSpace: "nowrap" }}>
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
