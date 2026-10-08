"use client";

import { useEffect, useState } from "react";

interface Conversation {
  lead_id:      string;
  name:         string;
  phone:        string;
  last_message: string;
  direction:    "in" | "out";
  sender_name?: string;
  timestamp:    string;
  mode:         "auto" | "human";
}

export default function ConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");

  async function fetchConversations() {
    try {
      const res  = await fetch("/api/conversations");
      const json = await res.json();
      if (json.success) setConversations(json.data ?? []);
    } catch {
      console.error("Erro ao carregar conversas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  function timeLabel(ts: string) {
    const date = new Date(ts);
    const now  = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1)   return "agora";
    if (mins < 60)  return `${mins}min`;
    if (hrs  < 24)  return `${hrs}h`;
    if (days < 7)   return `${days}d`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  function messagePreview(conv: Conversation) {
    const prefix = conv.direction === "out" ? `${conv.sender_name ?? "Sistema"}: ` : "";
    const text   = conv.last_message ?? "";
    const full   = prefix + text;
    return full.length > 65 ? full.slice(0, 65) + "…" : full;
  }

  function initials(name: string) {
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }

  return (
    <main className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 Conversas</h1>
          <p className="page-subtitle">Atualiza a cada 60s · {conversations.length} conversa(s)</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-success" style={{ fontSize: 11 }}>
            ● ao vivo
          </span>
        </div>
      </div>

      {/* Busca */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", fontSize: 14 }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3" style={{ padding: "24px 0" }}>
          <div className="spinner" />
          <span className="text-secondary text-sm">Carregando conversas...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-title">
            {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
          </div>
          <div className="empty-state-text">
            {search ? "Tente buscar por outro nome ou número." : "As conversas aparecerão aqui quando leads enviarem mensagens."}
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.map((conv) => {
          const avatarBg = conv.mode === "human" ? "var(--accent)" : "#059669";
          return (
            <a
              key={conv.lead_id}
              href={`/dashboard/leads/${conv.lead_id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  transition: "border-color var(--transition), background var(--transition)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)";
                  (e.currentTarget as HTMLDivElement).style.background = "var(--bg-overlay)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLDivElement).style.background = "var(--bg-elevated)";
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: avatarBg,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700,
                }}>
                  {initials(conv.name || "?")}
                </div>

                {/* Conteúdo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                    <span className="font-semibold text-sm text-primary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.name || conv.phone}
                    </span>
                    <span className="text-xs text-muted" style={{ flexShrink: 0, marginLeft: 8 }}>
                      {timeLabel(conv.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {messagePreview(conv)}
                    </span>
                    <span className={`badge ${conv.mode === "human" ? "badge-accent" : "badge-success"}`} style={{ flexShrink: 0, fontSize: 10 }}>
                      {conv.mode === "human" ? "Humano" : "IA"}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </main>
  );
}
