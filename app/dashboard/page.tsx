"use client";

import { useEffect, useState } from "react";

interface Client {
  id:              string;
  name:            string;
  niche:           string;
  whatsapp_number: string;
}

interface Lead {
  id:                string;
  name:              string;
  email:             string;
  phone:             string;
  campaign_name:     string;
  adset_name:        string;
  ad_name:           string;
  created_at:        string;
  status:            string;
  source:            string;
  first_response_at?: string;
  scheduled_at?:      string;
  score?:             number;
}

function scoreDisplay(score?: number): { label: string; color: string } {
  if (score === undefined || score === null) return { label: "—", color: "#888" };
  const color = score >= 70 ? "green" : score >= 40 ? "#b8860b" : "red";
  return { label: `${score}`, color };
}

function slaDisplay(lead: Lead): { label: string; color: string } {
  if (!lead.first_response_at || !lead.created_at) return { label: "Aguardando", color: "#888" };
  const diffMs  = new Date(lead.first_response_at).getTime() - new Date(lead.created_at).getTime();
  const minutes = Math.round(diffMs / 60000);
  const label   = `${minutes} min`;
  const color   = minutes <= 10 ? "green" : "red";
  return { label, color };
}

export default function DashboardPage() {
  const PIPELINE_STATUSES = ["novo", "contato", "proposta", "fechado", "perdido"] as const;

  const [clients,    setClients]    = useState<Client[]>([]);
  const [clientId,   setClientId]   = useState("");

  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [start, setStart]       = useState("");
  const [end, setEnd]           = useState("");
  const [updatingId,   setUpdatingId]   = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterSource,   setFilterSource]   = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");

  async function handleScheduleChange(id: string, scheduled_at: string) {
    setSchedulingId(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, scheduled_at } : l));

    try {
      const res  = await fetch(`/api/leads/${id}/schedule`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scheduled_at: scheduled_at || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (err) {
      console.error(err);
      await fetchLeads(start, end, clientId);
    } finally {
      setSchedulingId(null);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));

    try {
      const res  = await fetch(`/api/leads/${id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (err) {
      console.error(err);
      // Reverte em caso de erro
      await fetchLeads(start, end, clientId);
    } finally {
      setUpdatingId(null);
    }
  }

  async function fetchClients() {
    try {
      const res  = await fetch("/api/clients");
      const json = await res.json();
      setClients(json.data ?? []);
    } catch {
      console.error("Erro ao carregar clientes.");
    }
  }

  async function fetchLeads(startDate = start, endDate = end, cid = clientId) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start",     startDate);
      if (endDate)   params.set("end",       endDate);
      if (cid)       params.set("client_id", cid);

      const url = `/api/leads${params.size ? `?${params}` : ""}`;
      const res  = await fetch(url);
      const json = await res.json();
      setLeads(json.leads ?? []);
    } catch {
      setError("Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }

  // fetchLeads/fetchClients intentionally excluded — runs only on mount
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    async function init() {
      // Fetch auth user and set their client_id as the default filter
      try {
        const res  = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success && json.user?.client_id) {
          setClientId(json.user.client_id);
          await fetchClients();
          fetchLeads("", "", json.user.client_id);
          return;
        }
      } catch {
        // continue without client filter
      }
      await fetchClients();
      fetchLeads();
    }
    init();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const CSV_FIELDS = ["name", "email", "phone", "source", "campaign_name", "status", "created_at"] as const;

  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const rows = visibleLeads.map((l) =>
      CSV_FIELDS.map((f) => `"${String(l[f] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [CSV_FIELDS.join(","), ...rows].join("\n");
    downloadFile(csv, `leads_${todayStr()}.csv`, "text/csv;charset=utf-8;");
  }

  function exportJSON() {
    const data = visibleLeads.map((l) =>
      Object.fromEntries(CSV_FIELDS.map((f) => [f, l[f] ?? ""]))
    );
    downloadFile(JSON.stringify(data, null, 2), `leads_${todayStr()}.json`, "application/json");
  }

  // Derived filter options from loaded data
  const uniqueSources   = Array.from(new Set(leads.map((l) => l.source).filter(Boolean))).sort();
  const uniqueCampaigns = Array.from(new Set(leads.map((l) => l.campaign_name).filter(Boolean))).sort();

  const searchTerm = search.toLowerCase().trim();
  const visibleLeads = leads.filter((l) => {
    if (searchTerm && ![l.name, l.email, l.phone].some((f) => f?.toLowerCase().includes(searchTerm))) return false;
    if (filterStatus   && l.status        !== filterStatus)   return false;
    if (filterSource   && l.source        !== filterSource)   return false;
    if (filterCampaign && l.campaign_name !== filterCampaign) return false;
    return true;
  });

  const hasActiveFilters = search || filterStatus || filterSource || filterCampaign;

  function clearFilters() {
    setSearch(""); setFilterStatus(""); setFilterSource(""); setFilterCampaign("");
  }

  if (loading) return <p style={{ padding: "2rem" }}>Carregando leads...</p>;
  if (error)   return <p style={{ padding: "2rem", color: "red" }}>{error}</p>;

  function handleClientChange(id: string) {
    setClientId(id);
    setStart(""); setEnd("");
    fetchLeads("", "", id);
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
        <h1 style={{ margin: 0 }}>LeadsOS — Dashboard</h1>
        <div style={{ display: "flex", gap: "1rem", fontSize: ".9rem", alignItems: "center" }}>
          <a href="/dashboard/clients">Clientes</a>
          <a href="/dashboard/users">Usuários</a>
          <a href="/dashboard/templates">Templates</a>
          <a href="/dashboard/logs">Logs</a>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            style={{ background: "none", border: "1px solid #ccc", borderRadius: 4, padding: ".25rem .75rem", cursor: "pointer", fontSize: ".9rem" }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Seletor de cliente */}
      <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <label style={{ fontWeight: "bold", fontSize: ".9rem" }}>Cliente:</label>
        <select
          value={clientId}
          onChange={(e) => handleClientChange(e.target.value)}
          style={{ padding: ".35rem .6rem", minWidth: 200 }}
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.niche}</option>
          ))}
        </select>
        {clientId && (
          <button onClick={() => handleClientChange("")}>Limpar</button>
        )}
      </div>

      {/* Metrics cards */}
      {(() => {
        const count = (s: string) => visibleLeads.filter((l) => l.status === s).length;
        const cards = [
          { label: "Total",      value: visibleLeads.length           },
          { label: "Novos",      value: count("novo")                 },
          { label: "Em contato", value: count("contato")              },
          { label: "Propostas",  value: count("proposta")             },
          { label: "Fechados",   value: count("fechado")              },
        ];
        return (
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {cards.map(({ label, value }) => (
              <div key={label} style={cardStyle}>
                <div style={{ fontSize: "1.6rem", fontWeight: "bold" }}>{value}</div>
                <div style={{ fontSize: ".8rem", color: "#666", marginTop: ".15rem" }}>{label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: ".75rem", flexWrap: "wrap" }}>
        <p style={{ margin: 0 }}>{visibleLeads.length} de {leads.length} lead(s)</p>
        <button onClick={exportCSV}  disabled={visibleLeads.length === 0}>Exportar CSV</button>
        <button onClick={exportJSON} disabled={visibleLeads.length === 0}>Exportar JSON</button>
      </div>

      {/* Busca + Filtros client-side */}
      <div style={{ marginBottom: ".75rem" }}>
        <input
          type="text"
          placeholder="Buscar por nome, email ou telefone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: ".4rem .6rem", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ display: "flex", gap: ".75rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">Todas as origens</option>
          {uniqueSources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)}>
          <option value="">Todas as campanhas</option>
          {uniqueCampaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {hasActiveFilters && <button onClick={clearFilters}>Limpar filtros</button>}
      </div>

      {/* Filtro por data */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: ".85rem", marginBottom: ".25rem" }}>De</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{ padding: ".35rem .5rem" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: ".85rem", marginBottom: ".25rem" }}>Até</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={{ padding: ".35rem .5rem" }}
          />
        </div>
        <button onClick={() => fetchLeads(start, end, clientId)}>Filtrar</button>
        {(start || end) && (
          <button onClick={() => { setStart(""); setEnd(""); fetchLeads("", "", clientId); }}>
            Limpar
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 800 }}>
          <thead style={{ background: "#f0f0f0" }}>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Campanha</th>
              <th>Adset</th>
              <th>Anúncio</th>
              <th>Data</th>
              <th>Score</th>
              <th>Tempo de resposta</th>
              <th>Agendamento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleLeads.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: "1.5rem", color: "#888" }}>
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
            {visibleLeads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td>{lead.email}</td>
                <td>{lead.phone}</td>
                <td>{lead.campaign_name}</td>
                <td>{lead.adset_name}</td>
                <td>{lead.ad_name}</td>
                <td>{lead.created_at ? new Date(lead.created_at).toLocaleString("pt-BR") : "—"}</td>
                <td style={{ color: scoreDisplay(lead.score).color, fontWeight: "bold", textAlign: "center" }}>
                  {scoreDisplay(lead.score).label}
                </td>
                <td style={{ color: slaDisplay(lead).color, fontWeight: "bold" }}>
                  {slaDisplay(lead).label}
                </td>
                <td>
                  <input
                    type="datetime-local"
                    value={lead.scheduled_at ? lead.scheduled_at.slice(0, 16) : ""}
                    disabled={schedulingId === lead.id}
                    onChange={(e) => handleScheduleChange(lead.id, e.target.value)}
                    style={{ opacity: schedulingId === lead.id ? 0.5 : 1, fontSize: ".85rem" }}
                  />
                </td>
                <td>
                  <select
                    value={lead.status}
                    disabled={updatingId === lead.id}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    style={{ opacity: updatingId === lead.id ? 0.5 : 1 }}
                  >
                    {PIPELINE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 6,
  padding: ".75rem 1.25rem",
  minWidth: 100,
  textAlign: "center",
  background: "#fff",
};
