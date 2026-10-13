"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Search, Filter, MessageSquare, Users, Activity,
  Clock, Bot, UserCheck, ChevronRight, X, Phone,
  Star, Zap, AlertTriangle, RefreshCw,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConvItem {
  lead_id:       string;
  name:          string;
  phone:         string;
  status:        string;
  score:         number | null;
  source:        string | null;
  sdr_agent:     string | null;
  last_message:  string;
  direction:     "in" | "out";
  sender_name?:  string;
  timestamp:     string;
  mode:          "auto" | "human";
  message_count: number;
}

interface Message {
  id:          string;
  lead_id:     string;
  phone:       string;
  direction:   "in" | "out";
  content:     string;
  timestamp:   string;
  sender_name?: string;
}

interface LeadDetail {
  id:          string;
  name:        string;
  phone:       string;
  status:      string;
  score:       number | null;
  source:      string | null;
  sdr_agent:   string | null;
  product:     string | null;
  mode:        "auto" | "human";
  human_until: string | null;
}

interface Stats {
  total:          number;
  active_today:   number;
  messages_today: number;
  sdr_counts:     Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SDR_AGENTS = ["ALEX", "MAX", "LEO", "ANA", "VERA", "REX"];

const STATUS_LABELS: Record<string, string> = {
  novo:        "Novo",
  contato:     "Contato",
  qualificado: "Qualificado",
  proposta:    "Proposta",
  fechado:     "Fechado",
  perdido:     "Perdido",
};

const STATUS_COLORS: Record<string, string> = {
  novo:        "#3b82f6",
  contato:     "#f59e0b",
  qualificado: "#8b5cf6",
  proposta:    "#6366f1",
  fechado:     "#22c55e",
  perdido:     "#6b7280",
};

const SDR_COLORS: Record<string, string> = {
  ALEX: "#3b82f6",
  MAX:  "#f59e0b",
  LEO:  "#ef4444",
  ANA:  "#ec4899",
  VERA: "#8b5cf6",
  REX:  "#22c55e",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}min`;
  if (h < 24) return `${h}h`;
  if (d < 7)  return `${d}d`;
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Hoje, ${formatTime(ts)}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Ontem, ${formatTime(ts)}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const cards = [
    { icon: MessageSquare, label: "Total conversas",   value: stats?.total ?? 0,          color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
    { icon: Activity,      label: "Ativas hoje",       value: stats?.active_today ?? 0,    color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
    { icon: Zap,           label: "Mensagens hoje",    value: stats?.messages_today ?? 0,  color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
    { icon: Users,         label: "SDRs ativos",       value: Object.keys(stats?.sdr_counts ?? {}).length, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
      {cards.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} style={{
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={16} color={color} />
          </div>
          <div>
            {loading ? (
              <div className="skeleton" style={{ height: 22, width: 48, borderRadius: 6, marginBottom: 4 }} />
            ) : (
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
            )}
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Conversation List Item ────────────────────────────────────────────────────

function ConvListItem({
  conv, selected, onClick,
}: {
  conv: ConvItem;
  selected: boolean;
  onClick: () => void;
}) {
  const sdrColor = conv.sdr_agent ? (SDR_COLORS[conv.sdr_agent] ?? "#6b7280") : "#6b7280";
  const statusColor = STATUS_COLORS[conv.status] ?? "#6b7280";
  const preview = conv.direction === "out"
    ? `${conv.sender_name ?? "IA"}: ${conv.last_message}`
    : conv.last_message;

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        background: selected ? "var(--accent-light)" : "transparent",
        border: selected ? "1px solid var(--accent-border)" : "1px solid transparent",
        borderRadius: "var(--radius)", cursor: "pointer", width: "100%", textAlign: "left",
        transition: "all var(--transition)",
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
        background: conv.mode === "human" ? "var(--accent)" : sdrColor,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700,
      }}>
        {initials(conv.name)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
            {conv.name || conv.phone}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, marginLeft: 4 }}>
            {timeLabel(conv.timestamp)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          {conv.sdr_agent && (
            <span style={{ fontSize: 9, fontWeight: 700, color: sdrColor, background: `${sdrColor}18`, padding: "1px 5px", borderRadius: 99, flexShrink: 0 }}>
              {conv.sdr_agent}
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 600, color: statusColor, background: `${statusColor}18`, padding: "1px 5px", borderRadius: 99, flexShrink: 0 }}>
            {STATUS_LABELS[conv.status] ?? conv.status}
          </span>
          {conv.mode === "human" && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", background: "var(--accent-light)", padding: "1px 5px", borderRadius: 99, flexShrink: 0 }}>
              Humano
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {truncate(preview, 50)}
        </div>
      </div>
    </button>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────────

function MsgBubble({ msg }: { msg: Message }) {
  const isOut   = msg.direction === "out";
  const isIA    = isOut && (!msg.sender_name || msg.sender_name === "IA" || msg.sender_name === "Sistema" || SDR_AGENTS.some(a => msg.sender_name?.toUpperCase().includes(a)));

  return (
    <div style={{
      display: "flex", justifyContent: isOut ? "flex-end" : "flex-start",
      marginBottom: 6, padding: "0 4px",
    }}>
      <div style={{ maxWidth: "72%", minWidth: 60 }}>
        {/* Sender label */}
        {msg.sender_name && (
          <div style={{
            fontSize: 10, fontWeight: 700, marginBottom: 3,
            color: isIA ? "#22c55e" : "var(--accent)",
            textAlign: isOut ? "right" : "left",
            paddingLeft: isOut ? 0 : 4, paddingRight: isOut ? 4 : 0,
          }}>
            {isIA ? `🤖 ${msg.sender_name}` : `👤 ${msg.sender_name}`}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          background: isOut
            ? (isIA ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.15)")
            : "var(--bg-elevated)",
          border: isOut
            ? (isIA ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(124,58,237,0.3)")
            : "1px solid var(--border)",
          borderRadius: isOut ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          padding: "8px 12px",
        }}>
          <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {msg.content}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: isOut ? "right" : "left" }}>
            {formatTime(msg.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Detail Panel ────────────────────────────────────────────────────────

function ChatPanel({
  leadId, onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [lead,      setLead]      = useState<LeadDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [intervindo, setIntervindo] = useState(false);
  const [intervered, setIntervered] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`/api/supervisao/messages?lead_id=${leadId}`);
      const json = await res.json() as { success: boolean; messages?: Message[]; lead?: LeadDetail };
      if (json.success) {
        setMessages(json.messages ?? []);
        setLead(json.lead ?? null);
        if (json.lead?.mode === "human") setIntervered(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setLead(null);
    setIntervered(false);
    fetchData();
  }, [leadId, fetchData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleIntervir() {
    setIntervindo(true);
    try {
      const res  = await fetch("/api/supervisao/intervir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) {
        setIntervered(true);
        setLead(prev => prev ? { ...prev, mode: "human" } : prev);
      }
    } finally {
      setIntervindo(false);
    }
  }

  const statusColor = lead ? (STATUS_COLORS[lead.status] ?? "#6b7280") : "#6b7280";
  const sdrColor    = lead?.sdr_agent ? (SDR_COLORS[lead.sdr_agent] ?? "#6b7280") : "#6b7280";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-surface)" }}>

      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            {/* Avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: lead?.mode === "human" ? "var(--accent)" : (sdrColor),
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 700,
            }}>
              {initials(lead?.name ?? "?")}
            </div>

            {/* Info */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lead?.name ?? "Carregando..."}
              </div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 3 }}>
                {lead?.phone && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Phone size={10} /> {lead.phone}
                  </span>
                )}
                {lead?.sdr_agent && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: sdrColor, background: `${sdrColor}18`, padding: "1px 6px", borderRadius: 99 }}>
                    {lead.sdr_agent}
                  </span>
                )}
                {lead?.status && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: "1px 6px", borderRadius: 99 }}>
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                )}
                {lead?.score != null && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "1px 6px", borderRadius: 99, display: "flex", alignItems: "center", gap: 3 }}>
                    <Star size={9} fill="#f59e0b" /> {lead.score}
                  </span>
                )}
                {lead?.source && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-surface)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 99 }}>
                    {lead.source}
                  </span>
                )}
                {lead?.product && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    · {truncate(lead.product, 30)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!intervered ? (
              <button
                onClick={handleIntervir}
                disabled={intervindo}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                  borderRadius: "var(--radius)", border: "none",
                  background: intervindo ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  color: "#fff", fontSize: 12, fontWeight: 700, cursor: intervindo ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <UserCheck size={14} />
                {intervindo ? "Intervindo..." : "Intervir"}
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: "var(--radius)", background: "var(--accent-light)", border: "1px solid var(--accent-border)" }}>
                <AlertTriangle size={12} color="var(--accent)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>Modo humano ativo</span>
              </div>
            )}
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, display: "flex" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-end" : "flex-start" }}>
                <div className="skeleton" style={{ height: 48, width: "60%", borderRadius: 12 }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 0" }}>
            <div className="empty-state-icon"><MessageSquare size={28} /></div>
            <div className="empty-state-title">Nenhuma mensagem ainda</div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const prev = i > 0 ? messages[i - 1] : null;
              const showDate = !prev || new Date(msg.timestamp).toDateString() !== new Date(prev.timestamp).toDateString();
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: "center", margin: "12px 0 8px", fontSize: 11, color: "var(--text-muted)" }}>
                      {formatDate(msg.timestamp)}
                    </div>
                  )}
                  <MsgBubble msg={msg} />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SupervisaoPage() {
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [stats,         setStats]         = useState<Stats | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [filterSDR,     setFilterSDR]     = useState<string>("all");
  const [filterStatus,  setFilterStatus]  = useState<string>("all");
  const [refreshing,    setRefreshing]    = useState(false);

  async function fetchConversations(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res  = await fetch("/api/supervisao/conversations");
      const json = await res.json() as {
        success: boolean;
        data?: ConvItem[];
        stats?: Stats;
      };
      if (json.success) {
        setConversations(json.data ?? []);
        setStats(json.stats ?? null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchConversations();
    const iv = setInterval(() => fetchConversations(true), 30_000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Supabase realtime subscription
  useEffect(() => {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !key) return;

    const client = createClient(url, key);
    const channel = client
      .channel("supervisao_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => { fetchConversations(true); }
      )
      .subscribe();

    return () => { void client.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter
  const filtered = conversations.filter((c) => {
    if (filterSDR !== "all" && c.sdr_agent !== filterSDR) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.phone?.includes(q)) return false;
    }
    return true;
  });

  const selectedConv = conversations.find(c => c.lead_id === selectedId);

  return (
    <main className="page-container" style={{ padding: 0, height: "calc(100vh - 0px)", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{
        padding: "16px 24px 14px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px", margin: 0 }}>
              🎛️ Supervisão SDR
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>
              Monitore todas as conversas dos agentes IA em tempo real
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 99, padding: "4px 10px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
              Ao vivo
            </span>
            <button
              onClick={() => fetchConversations(true)}
              disabled={refreshing}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 8px", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              title="Atualizar"
            >
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatsBar stats={stats} loading={loading} />

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 150 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: 30, fontSize: 12, height: 34 }}
            />
          </div>

          {/* SDR filter */}
          <div style={{ position: "relative" }}>
            <Filter size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <select
              value={filterSDR}
              onChange={e => setFilterSDR(e.target.value)}
              className="input"
              style={{ paddingLeft: 26, fontSize: 12, height: 34, appearance: "none", paddingRight: 24, cursor: "pointer", minWidth: 120 }}
            >
              <option value="all">Todos SDRs</option>
              {SDR_AGENTS.map(a => (
                <option key={a} value={a}>{a} ({stats?.sdr_counts[a] ?? 0})</option>
              ))}
            </select>
            <ChevronRight size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: "var(--text-muted)", pointerEvents: "none" }} />
          </div>

          {/* Status filter */}
          <div style={{ position: "relative" }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="input"
              style={{ paddingLeft: 10, fontSize: 12, height: 34, appearance: "none", paddingRight: 24, cursor: "pointer", minWidth: 130 }}
            >
              <option value="all">Todos status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronRight size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: "var(--text-muted)", pointerEvents: "none" }} />
          </div>

          {/* Count */}
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {filtered.length} conversa{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Split Panel ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: conversation list */}
        <div style={{
          width: selectedId ? 300 : "100%",
          maxWidth: selectedId ? 300 : undefined,
          flexShrink: 0,
          borderRight: selectedId ? "1px solid var(--border)" : "none",
          overflowY: "auto",
          padding: "8px 8px",
          transition: "width 0.2s ease",
        }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px" }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton" style={{ height: 12, width: "70%", borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 10, width: "50%", borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 10, width: "90%", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: "48px 0" }}>
              <div className="empty-state-icon"><Bot size={28} /></div>
              <div className="empty-state-title">
                {search || filterSDR !== "all" || filterStatus !== "all"
                  ? "Nenhuma conversa encontrada"
                  : "Nenhuma conversa ainda"}
              </div>
              <div className="empty-state-text">
                {search || filterSDR !== "all" || filterStatus !== "all"
                  ? "Tente outros filtros."
                  : "As conversas aparecerão aqui quando leads enviarem mensagens."}
              </div>
            </div>
          ) : (
            <>
              {/* SDR count badges (when no SDR filter) */}
              {filterSDR === "all" && stats && !search && !selectedId && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 4px 8px" }}>
                  {SDR_AGENTS.filter(a => (stats.sdr_counts[a] ?? 0) > 0).map(a => (
                    <button
                      key={a}
                      onClick={() => setFilterSDR(a)}
                      style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                        background: `${SDR_COLORS[a]}18`, color: SDR_COLORS[a],
                        border: `1px solid ${SDR_COLORS[a]}30`, cursor: "pointer",
                      }}
                    >
                      {a} · {stats.sdr_counts[a]}
                    </button>
                  ))}
                </div>
              )}

              {filtered.map(conv => (
                <ConvListItem
                  key={conv.lead_id}
                  conv={conv}
                  selected={selectedId === conv.lead_id}
                  onClick={() => setSelectedId(conv.lead_id === selectedId ? null : conv.lead_id)}
                />
              ))}
            </>
          )}
        </div>

        {/* Right: chat detail */}
        {selectedId && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <ChatPanel
              leadId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}

        {/* Empty right panel hint */}
        {!selectedId && !loading && filtered.length > 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* intentionally empty when list is in full-width mode */}
          </div>
        )}
      </div>
    </main>
  );
}
