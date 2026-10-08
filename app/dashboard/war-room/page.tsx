"use client";

import { useEffect, useState, useCallback } from "react";

interface Metrics {
  leadsToday:       number;
  leadsInConvo:     number;
  leadsHot:         number;
  leadsTotal:       number;
  propOpen:         number;
  propSigned:       number;
  propPaid:         number;
  propPendingValue: number;
  revenueMonth:     number;
  revenueTotal:     number;
}

interface Activity {
  time:     string;
  type:     string;
  client?:  string;
  message:  string;
  icon:     string;
}

interface ClientStat {
  id:         string;
  name:       string;
  leads:      number;
  leadsToday: number;
  active:     number;
  revenue:    number;
}

interface WarRoomData {
  metrics:        Metrics;
  recentActivity: Activity[];
  clientStats:    ClientStat[];
  updatedAt:      string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff/60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
function clock() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function WarRoomPage() {
  const [data,      setData]      = useState<WarRoomData | null>(null);
  const [error,     setError]     = useState(false);
  const [time,      setTime]      = useState(clock());
  const [lastSync,  setLastSync]  = useState("—");
  const [pulse,     setPulse]     = useState(false);

  const fetch_data = useCallback(async () => {
    try {
      const p = new URLSearchParams(window.location.search);
      const token = p.get("token") ?? "";
      const url = token ? `/api/war-room?token=${token}` : "/api/war-room";
      const r = await fetch(url);
      const j = await r.json();
      if (j.success) {
        setData(j.data);
        setLastSync(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        setError(false);
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      } else { setError(true); }
    } catch { setError(true); }
  }, []);

  useEffect(() => {
    fetch_data();
    const interval = setInterval(fetch_data, 30000);
    const clockInterval = setInterval(() => setTime(clock()), 1000);
    return () => { clearInterval(interval); clearInterval(clockInterval); };
  }, [fetch_data]);

  const s = {
    page: {
      background: "#07070a",
      minHeight: "100vh",
      color: "#fff",
      fontFamily: "'Inter', sans-serif",
      padding: "0",
      overflow: "hidden",
    } as React.CSSProperties,
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 32px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(255,255,255,0.02)",
    } as React.CSSProperties,
    logo: { display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,
    logoBox: {
      width: 36, height: 36, background: "#7c3aed", borderRadius: 10,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, fontWeight: 900, color: "#fff",
    } as React.CSSProperties,
    logoText: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" } as React.CSSProperties,
    logoSub: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: -2 } as React.CSSProperties,
    live: {
      display: "flex", alignItems: "center", gap: 8,
      background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
      borderRadius: 99, padding: "6px 16px",
    } as React.CSSProperties,
    liveDot: {
      width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
      animation: "pulse-dot 2s infinite",
    } as React.CSSProperties,
    clockText: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
    syncText: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 8 } as React.CSSProperties,
    content: { padding: "24px 32px" } as React.CSSProperties,
    metricsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 16,
      marginBottom: 24,
    } as React.CSSProperties,
    metricCard: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: "20px 22px",
      transition: "border-color 0.3s",
    } as React.CSSProperties,
    metricValue: {
      fontSize: 36, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1, marginBottom: 6,
    } as React.CSSProperties,
    metricLabel: { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 } as React.CSSProperties,
    bottomGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
    } as React.CSSProperties,
    sectionCard: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14,
      overflow: "hidden",
    } as React.CSSProperties,
    sectionHeader: {
      padding: "14px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    } as React.CSSProperties,
    sectionTitle: { fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" } as React.CSSProperties,
    activityItem: {
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "11px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      transition: "background 0.15s",
    } as React.CSSProperties,
    activityIcon: {
      width: 30, height: 30, borderRadius: 8,
      background: "rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, flexShrink: 0,
    } as React.CSSProperties,
  };

  if (!data && !error) return (
    <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Carregando War Room...</div>
    </div>
  );

  const m = data?.metrics;

  const metricCards = [
    { label: "Leads Hoje",      value: m?.leadsToday ?? 0,    color: "#7c3aed", suffix: "" },
    { label: "Em Conversa",     value: m?.leadsInConvo ?? 0,  color: "#3b82f6", suffix: "" },
    { label: "Leads Quentes 🔥", value: m?.leadsHot ?? 0,     color: "#f59e0b", suffix: "" },
    { label: "Propostas Abertas", value: m?.propOpen ?? 0,    color: "#a78bfa", suffix: "" },
    { label: "Receita no Mês",  value: 0,                     color: "#22c55e", currency: m?.revenueMonth },
  ];

  return (
    <div style={s.page}>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeInRow { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .metric-card:hover { border-color: rgba(255,255,255,0.15) !important; }
        .activity-row:hover { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoBox}>L</div>
          <div>
            <div style={s.logoText}>LeadsOS — War Room</div>
            <div style={s.logoSub}>Departamento Comercial ao Vivo</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {error && (
            <span style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 99, padding: "4px 12px" }}>
              ⚠ Erro ao sincronizar
            </span>
          )}
          <div style={s.live}>
            <div style={{ ...s.liveDot, background: error ? "#ef4444" : "#22c55e" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: error ? "#ef4444" : "#22c55e" }}>AO VIVO</span>
          </div>
          <div>
            <div style={{ ...s.clockText, fontSize: 20, fontWeight: 700 }}>{time}</div>
            <div style={s.syncText}>Sync: {lastSync}</div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={s.content}>
        {/* Metrics Row */}
        <div style={s.metricsGrid}>
          {metricCards.map((mc, i) => (
            <div key={i} className="metric-card" style={{ ...s.metricCard, borderColor: pulse ? `${mc.color}44` : "rgba(255,255,255,0.08)" }}>
              <div style={{ ...s.metricValue, color: mc.color }}>
                {mc.currency !== undefined
                  ? fmt(mc.currency)
                  : mc.value.toLocaleString("pt-BR")}
              </div>
              <div style={s.metricLabel}>{mc.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Aguardando Assinatura", value: m?.propOpen ?? 0,        color: "#a78bfa", isMoney: false },
            { label: "Aguardando Pagamento",  value: m?.propSigned ?? 0,      color: "#f59e0b", isMoney: false },
            { label: "Pagos",                 value: m?.propPaid ?? 0,        color: "#22c55e", isMoney: false },
            { label: "Em Jogo (R$)",          value: m?.propPendingValue ?? 0, color: "#3b82f6", isMoney: true },
          ].map((item, i) => (
            <div key={i} style={{
              background: `${item.color}10`,
              border: `1px solid ${item.color}25`,
              borderRadius: 12, padding: "14px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>
                {item.isMoney ? fmt(item.value) : item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Activity + Clients */}
        <div style={s.bottomGrid}>
          {/* Feed de atividade */}
          <div style={s.sectionCard}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>📡 Atividade Recente</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{data?.recentActivity.length ?? 0} eventos</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {(data?.recentActivity ?? []).slice(0, 12).map((a, i) => (
                <div key={i} className="activity-row" style={{ ...s.activityItem, animationDelay: `${i * 0.05}s` }}>
                  <div style={s.activityIcon}>{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.message}
                    </div>
                    {a.client && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{a.client}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0, textAlign: "right" }}>
                    {timeAgo(a.time)}
                  </div>
                </div>
              ))}
              {(data?.recentActivity ?? []).length === 0 && (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                  Nenhuma atividade recente
                </div>
              )}
            </div>
          </div>

          {/* Por cliente */}
          <div style={s.sectionCard}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>🏢 Por Cliente / Negócio</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{data?.clientStats.length ?? 0} ativos</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {(data?.clientStats ?? []).map((c, i) => (
                <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `hsl(${(i * 47 + 200) % 360}, 60%, 25%)`,
                    border: `1px solid hsl(${(i * 47 + 200) % 360}, 60%, 35%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
                  }}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                      {c.leads} leads · {c.active} ativos · {c.leadsToday} hoje
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{fmt(c.revenue)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>receita</div>
                  </div>
                </div>
              ))}
              {(data?.clientStats ?? []).length === 0 && (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                  Nenhum cliente ativo
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          LeadsOS · Departamento Comercial Autônomo · Atualiza a cada 30 segundos
        </div>
      </div>
    </div>
  );
}
