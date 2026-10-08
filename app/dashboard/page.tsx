"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Users, MessageSquare, FileText, Target, BarChart2,
  Sparkles, Monitor, TrendingUp, TrendingDown, AlertTriangle,
  Clock, CheckCircle2, XCircle, DollarSign, Zap, ArrowRight,
  Building2, UserCheck, Bell, Activity, Megaphone, Settings,
  Trophy, Pencil, X, Loader2, ThumbsUp, ThumbsDown, Lightbulb,
} from "lucide-react";
import confetti from "canvas-confetti";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserInfo {
  name?: string;
  email?: string;
  profile?: string;
  client_id?: string;
}

interface ReportData {
  total: number;
  this_month: number;
  last_month: number;
  month_delta: number | null;
  conversion_rate: number;
  avg_sla_minutes: number | null;
  by_status: { status: string; count: number }[];
  total_revenue: number;
  revenue_this_month: number;
  avg_ticket: number;
}

interface Proposal {
  id: string;
  lead_name?: string;
  amount?: number;
  status?: string;
  created_at?: string;
}

interface Client {
  id: string;
  name: string;
  niche: string;
}

interface Lead {
  id: string;
  name: string;
  source: string;
  status: string;
  created_at: string;
  score?: number;
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    ref.current = 0;
    setValue(0);
    if (target === 0) return;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      if (current !== ref.current) { ref.current = current; setValue(current); }
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)} dias`;
}

function sourceBadge(source: string) {
  if (source === "meta_ads")     return { cls: "badge badge-info",    label: "Meta" };
  if (source === "google_ads")   return { cls: "badge badge-error",   label: "Google" };
  if (source === "landing_page") return { cls: "badge badge-success", label: "LP" };
  if (source === "manual")       return { cls: "badge badge-accent",  label: "Manual" };
  return { cls: "badge badge-default", label: source || "—" };
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo", contato: "Contato", proposta: "Proposta",
  fechado: "Fechado", perdido: "Perdido",
};

const STATUS_COLORS: Record<string, string> = {
  novo:     "#3b82f6",
  contato:  "#f59e0b",
  proposta: "#8b5cf6",
  fechado:  "#22c55e",
  perdido:  "#6b7280",
};

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  awaiting_signature: "Aguardando assinatura",
  awaiting_payment:   "Aguardando pagamento",
  signed:             "Assinado",
  paid:               "Pago",
  sent:               "Enviado",
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, iconBg, iconColor, label, value, prefix = "", suffix = "",
  trend, trendLabel, loading,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: "up" | "down" | null;
  trendLabel?: string;
  loading?: boolean;
}) {
  const animated = useCountUp(loading ? 0 : value);
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: iconBg }}>
        <Icon size={18} color={iconColor} strokeWidth={2} />
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 32, width: "60%", borderRadius: 6, marginBottom: 6 }} />
      ) : (
        <div className="kpi-value">
          {prefix}{animated.toLocaleString("pt-BR")}{suffix}
        </div>
      )}
      <div className="kpi-label">{label}</div>
      {trendLabel && (
        <div
          className={`stat-change ${trend === "up" ? "up" : trend === "down" ? "down" : ""}`}
          style={{ marginTop: 8 }}
        >
          {trend === "up"   && <TrendingUp size={11} />}
          {trend === "down" && <TrendingDown size={11} />}
          {trendLabel}
        </div>
      )}
    </div>
  );
}

// ─── Funnel Step ─────────────────────────────────────────────────────────────

function FunnelStep({ label, count, max, color }: {
  label: string; count: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="funnel-step">
      <div style={{ width: 70, fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>{label}</div>
      <div className="funnel-bar-track">
        <div
          className="funnel-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div style={{ width: 32, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textAlign: "right", flexShrink: 0 }}>
        {count}
      </div>
      <div style={{ width: 36, fontSize: 11, color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
        {pct}%
      </div>
    </div>
  );
}

// ─── Alert Strip ─────────────────────────────────────────────────────────────

function AlertItem({ type, icon: Icon, text, href }: {
  type: "red" | "yellow" | "green" | "blue";
  icon: React.ElementType;
  text: string;
  href?: string;
}) {
  return (
    <div className={`alert-strip alert-${type}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {type === "green" && <span className="pulse-dot" />}
        <Icon size={15} strokeWidth={2} />
      </div>
      <span style={{ flex: 1, fontSize: 13 }}>{text}</span>
      {href && (
        <a href={href} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "inherit", opacity: 0.8, flexShrink: 0 }}>
          Ver <ArrowRight size={12} />
        </a>
      )}
    </div>
  );
}

// ─── Quick Access Button ──────────────────────────────────────────────────────

function QuickBtn({ icon: Icon, label, href, color }: {
  icon: React.ElementType; label: string; href: string; color: string;
}) {
  return (
    <a href={href} className="quick-btn">
      <div className="quick-btn-icon" style={{ color }}>
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <span>{label}</span>
    </a>
  );
}

// ─── Frases Motivacionais ─────────────────────────────────────────────────────

const FRASES = [
  "Cada não te aproxima do próximo sim. Continue.",
  "O vendedor que mais liga é o que mais fecha. Vai lá.",
  "Consistência bate talento quando o talento não é consistente.",
  "Não é quem começa bem — é quem termina bem. Foca.",
  "Uma ligação a mais pode ser o deal do mês.",
  "Dificuldade é o preço do crescimento. Vale a pena.",
  "O cliente que está te ignorando precisa de mais 3 follow-ups.",
  "Resultados extraordinários exigem ações extraordinárias.",
  "Teu melhor mês ainda está por vir. Faz acontecer.",
  "A proposta não enviada nunca fecha. Envia hoje.",
  "Vender é servir — e servir bem é o maior diferencial.",
  "Cada dia é uma nova chance de bater a meta.",
  "Quem cuida do pipeline nunca fica sem trabalho.",
  "Foco no processo. O resultado vem.",
  "O melhor momento para agir foi ontem. O segundo melhor é agora.",
  "Seu cliente está esperando por você. Não o faça esperar mais.",
  "Meta é um compromisso com você mesmo. Honre-o.",
  "Uma conversa sincera vale mais que mil emails.",
  "Persistência é o que separa os bons dos grandes.",
  "Hoje é um bom dia para fechar negócio.",
  "Não venda produto — resolva problemas. Aí sim.",
  "Cada objeção é uma pergunta disfarçada. Responde ela.",
  "O pipeline cheio é a melhor sensação do comercial.",
  "Quem conhece o cliente de verdade nunca perde pra concorrência.",
  "Fé no trabalho. O mês fecha bem.",
  "Um passo de cada vez leva ao topo.",
  "Seja o vendedor que você gostaria de ter como cliente.",
  "Energia boa atrai resultado bom. Carrega essa energia hoje.",
  "O mercado está cheio de oportunidade para quem busca.",
  "Não espere a semana ideal — faça essa semana ser ideal.",
];

function motivationalPhrase(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return FRASES[dayOfYear % FRASES.length];
}

function fireConfetti() {
  const end = Date.now() + 2_000;
  const colors = ["#7c3aed", "#4f46e5", "#f59e0b", "#10b981", "#f43f5e"];
  (function frame() {
    confetti({ particleCount: 5, angle: 60,  spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ─── Goal Types ──────────────────────────────────────────────────────────────

interface Goal {
  id?:             string;
  month:           string;
  revenue_target:  number;
  deals_target:    number;
  client_id?:      string | null;
}

// ─── GoalProgressCard ────────────────────────────────────────────────────────

function GoalProgressCard({
  goal, revenueActual, dealsActual, canEdit, onEdit,
}: {
  goal: Goal | null;
  revenueActual: number;
  dealsActual:   number;
  canEdit:       boolean;
  onEdit:        () => void;
}) {
  const revTarget   = goal?.revenue_target ?? 0;
  const dealTarget  = goal?.deals_target   ?? 0;
  const revPct      = revTarget  > 0 ? Math.min((revenueActual  / revTarget)  * 100, 100) : 0;
  const dealPct     = dealTarget > 0 ? Math.min((dealsActual    / dealTarget) * 100, 100) : 0;
  const overallPct  = revTarget > 0 ? revPct : dealPct;
  const goalHit     = overallPct >= 100;

  const fired = useRef(false);
  useEffect(() => {
    if (goalHit && !fired.current) {
      fired.current = true;
      fireConfetti();
    }
  }, [goalHit]);

  if (!goal) {
    return (
      <div className="card" style={{ padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="card-title" style={{ marginBottom: 4 }}>Meta do mês</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Nenhuma meta definida para este mês.</div>
        </div>
        {canEdit && (
          <button onClick={onEdit} style={editBtnStyle}>
            <Pencil size={13} /> Definir meta
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: goalHit ? "rgba(16,185,129,.15)" : "rgba(124,58,237,.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Trophy size={18} color={goalHit ? "#10b981" : "#7c3aed"} />
          </div>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>
              {goalHit ? "🎯 Meta batida!" : "Meta do mês"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {goal.month} · {Math.round(overallPct)}% concluída
            </div>
          </div>
        </div>
        {canEdit && (
          <button onClick={onEdit} style={editBtnStyle}>
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      {/* Faturamento */}
      {revTarget > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Faturamento</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              {formatCurrency(revenueActual)} / {formatCurrency(revTarget)}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99, transition: "width 1s ease",
              width: `${revPct}%`,
              background: revPct >= 100 ? "#10b981" : revPct >= 70 ? "#f59e0b" : "#7c3aed",
            }} />
          </div>
          {revPct < 100 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
              Faltam {formatCurrency(revTarget - revenueActual)}
            </div>
          )}
        </div>
      )}

      {/* Deals */}
      {dealTarget > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Deals fechados</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              {dealsActual} / {dealTarget}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99, transition: "width 1s ease",
              width: `${dealPct}%`,
              background: dealPct >= 100 ? "#10b981" : dealPct >= 70 ? "#f59e0b" : "#4f46e5",
            }} />
          </div>
          {dealPct < 100 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
              Faltam {dealTarget - dealsActual} deal{dealTarget - dealsActual !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const editBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "transparent",
  color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer",
};

// ─── MetaModal ───────────────────────────────────────────────────────────────

function MetaModal({ onClose, onSaved, clientId }: {
  onClose:  () => void;
  onSaved:  (g: Goal) => void;
  clientId: string | null;
}) {
  const [rev,   setRev]   = useState("");
  const [deals, setDeals] = useState("");
  const [saving, setSaving] = useState(false);
  const [err,   setErr]   = useState("");

  async function save() {
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/goals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          revenue_target: Number(rev.replace(/\D/g, "")) || 0,
          deals_target:   Number(deals) || 0,
          client_id:      clientId,
        }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      onSaved(j.goal);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-elevated)", borderRadius: 16, padding: 28, width: 380,
        border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.5)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Trophy size={18} color="#7c3aed" /> Definir Meta do Mês
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={modalLabelStyle}>Meta de faturamento (R$)</label>
          <input
            value={rev}
            onChange={e => setRev(e.target.value.replace(/\D/g, ""))}
            placeholder="Ex: 50000"
            style={modalInputStyle}
            inputMode="numeric"
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={modalLabelStyle}>Meta de deals fechados</label>
          <input
            value={deals}
            onChange={e => setDeals(e.target.value.replace(/\D/g, ""))}
            placeholder="Ex: 10"
            style={modalInputStyle}
            inputMode="numeric"
          />
        </div>

        {err && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{err}</div>}

        <button onClick={save} disabled={saving} style={{
          width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
          background: saving ? "rgba(124,58,237,.4)" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {saving ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : "Salvar meta"}
        </button>
      </div>
    </div>
  );
}

const modalLabelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--text-secondary)", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.05em",
};
const modalInputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-surface)",
  color: "var(--text-primary)", fontSize: 13, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

// ─── DiagnosticoPanel ────────────────────────────────────────────────────────

function DiagnosticoPanel({ clientId }: { clientId: string | null }) {
  const [loading, setLoading]   = useState(false);
  const [result,  setResult]    = useState<{
    summary: string; wins: string[]; gaps: string[]; actions: string[];
    mood: string; stats: { total: number; fechados: number; revenue: number };
  } | null>(null);
  const [err, setErr] = useState("");

  async function run() {
    setLoading(true); setErr(""); setResult(null);
    try {
      const r = await fetch("/api/ai/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      setResult(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro no diagnóstico");
    } finally {
      setLoading(false);
    }
  }

  const moodColor: Record<string, string> = {
    excellent: "#10b981", good: "#3b82f6", average: "#f59e0b", tough: "#ef4444",
  };
  const moodLabel: Record<string, string> = {
    excellent: "Excelente", good: "Bom", average: "Regular", tough: "Desafiador",
  };

  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: result ? 16 : 0, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124,58,237,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} color="#7c3aed" />
          </div>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>Diagnóstico do mês</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>IA analisa o que funcionou e o que melhorar</div>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: loading ? "rgba(124,58,237,.3)" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Analisando...</> : <><Zap size={14} /> Gerar diagnóstico</>}
        </button>
      </div>

      {err && <div style={{ fontSize: 13, color: "#ef4444", marginTop: 10 }}>{err}</div>}

      {result && (
        <div style={{ marginTop: 4 }}>
          {/* Summary */}
          <div style={{
            padding: "12px 14px", borderRadius: 10, marginBottom: 14,
            background: `${moodColor[result.mood] ?? "#7c3aed"}18`,
            border: `1px solid ${moodColor[result.mood] ?? "#7c3aed"}40`,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: moodColor[result.mood], flexShrink: 0, marginTop: 5 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: moodColor[result.mood], marginBottom: 3, textTransform: "uppercase" }}>
                {moodLabel[result.mood] ?? result.mood}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{result.summary}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {/* Wins */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <ThumbsUp size={12} /> O que funcionou
              </div>
              {result.wins.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 0", borderBottom: "1px solid var(--border)", lineHeight: 1.4 }}>
                  {w}
                </div>
              ))}
            </div>
            {/* Gaps */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <ThumbsDown size={12} /> O que travou
              </div>
              {result.gaps.map((g, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 0", borderBottom: "1px solid var(--border)", lineHeight: 1.4 }}>
                  {g}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <Lightbulb size={12} /> Ações para o próximo mês
            </div>
            {result.actions.map((a, i) => (
              <div key={i} style={{
                fontSize: 12, color: "var(--text-primary)", padding: "8px 10px", borderRadius: 8,
                background: "rgba(245,158,11,.08)", marginBottom: 6, lineHeight: 1.4,
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span style={{ fontWeight: 700, color: "#f59e0b" }}>{i + 1}.</span> {a}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FraseCard ───────────────────────────────────────────────────────────────

function FraseCard() {
  return (
    <div style={{
      padding: "14px 18px",
      background: "linear-gradient(135deg,rgba(124,58,237,.08),rgba(79,70,229,.05))",
      border: "1px solid rgba(124,58,237,.2)",
      borderRadius: 12,
      display: "flex", alignItems: "flex-start", gap: 12,
      marginBottom: 20,
    }}>
      <Zap size={16} color="#7c3aed" style={{ marginTop: 2, flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.6 }}>
        &ldquo;{motivationalPhrase()}&rdquo;
      </p>
    </div>
  );
}

// ─── Forecast + Ranking ──────────────────────────────────────────────────────

interface ForecastData {
  weighted:      number;
  committed:     number;
  closedRevenue: number;
  closedCount:   number;
  ranking:       { name: string; closed: number; revenue: number }[];
}

function ForecastCard({ data, loading }: { data: ForecastData | null; loading: boolean }) {
  const medals = ["🥇", "🥈", "🥉", "4.", "5."];

  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TrendingUp size={18} color="#22c55e" />
        </div>
        <div>
          <div className="card-title" style={{ marginBottom: 2 }}>Revenue Forecast</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Pipeline ponderado por probabilidade de fechamento</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 22, borderRadius: 6 }} />)}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Forecast (weighted)", value: data?.weighted ?? 0, color: "#7c3aed" },
              { label: "Em proposta",         value: data?.committed ?? 0, color: "#f59e0b" },
              { label: "Fechado no mês",      value: data?.closedRevenue ?? 0, color: "#22c55e" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "12px 14px", borderRadius: 10, background: `${color}10`, border: `1px solid ${color}25` }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color }}>{formatCurrency(value)}</div>
              </div>
            ))}
          </div>

          {/* Ranking */}
          {(data?.ranking ?? []).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Ranking do mês
              </div>
              {(data?.ranking ?? []).map((r, i) => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < (data?.ranking ?? []).length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 16, width: 24, flexShrink: 0 }}>{medals[i]}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>{r.closed} deal{r.closed !== 1 ? "s" : ""}</span>
                  {r.revenue > 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginLeft: 8 }}>{formatCurrency(r.revenue)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {(data?.ranking ?? []).length === 0 && (
            <div style={{ textAlign: "center", padding: "12px 0", fontSize: 13, color: "var(--text-muted)" }}>
              Nenhum deal fechado este mês ainda.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── HOME ADMIN ───────────────────────────────────────────────────────────────

function HomeAdmin({ user }: { user: UserInfo }) {
  const [report,    setReport]    = useState<ReportData | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [goal,      setGoal]      = useState<Goal | null>(null);
  const [showMeta,  setShowMeta]  = useState(false);
  const [forecast,  setForecast]  = useState<ForecastData | null>(null);
  const [loadingFC, setLoadingFC] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/proposals/all").then(r => r.json()),
      fetch("/api/clients").then(r => r.json()),
      fetch("/api/leads?limit=6").then(r => r.json()),
      fetch("/api/goals").then(r => r.json()),
    ]).then(([rep, prop, cli, lea, gol]) => {
      if (rep.success)  setReport(rep.data);
      setProposals((prop.proposals ?? prop.data ?? []).filter((p: Proposal) =>
        ["awaiting_signature", "awaiting_payment", "sent"].includes(p.status ?? "")
      ).slice(0, 5));
      setClients(cli.data ?? []);
      setLeads((lea.leads ?? []).slice(0, 6));
      if (gol.success && gol.goal) setGoal(gol.goal);
    }).catch(console.error).finally(() => setLoading(false));

    fetch("/api/forecast").then(r => r.json()).then(j => {
      if (j.success) setForecast(j);
    }).catch(console.error).finally(() => setLoadingFC(false));
  }, []);

  const total       = report?.total ?? 0;
  const thisMonth   = report?.this_month ?? 0;
  const revenue     = report?.revenue_this_month ?? 0;
  const conversion  = report?.conversion_rate ?? 0;
  const byStatus    = report?.by_status ?? [];
  const maxCount    = Math.max(...byStatus.map(s => s.count), 1);

  const stagnant    = leads.filter(l => {
    if (!l.created_at) return false;
    const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
    return days >= 7 && l.status !== "fechado" && l.status !== "perdido";
  });

  const delta = report?.month_delta;
  const trend = delta === null || delta === undefined ? null : delta >= 0 ? "up" : "down";

  return (
    <main className="page-container">

      {/* ── Welcome ── */}
      <div className="gradient-border-card welcome-bg" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, textTransform: "capitalize" }}>
              {formatDate()}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", marginBottom: 6 }}>
              {greeting()}, {user.name ?? "Admin"} 👋
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Aqui está o panorama completo do seu comercial IA hoje.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--success-light)", border: "1px solid var(--success-border)", borderRadius: "var(--radius-full)", padding: "6px 14px" }}>
            <span className="pulse-dot" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--success)" }}>Sistema operando</span>
          </div>
        </div>
      </div>

      {/* ── Frase do dia ── */}
      <FraseCard />

      {/* ── KPIs ── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <KpiCard
          icon={Users}
          iconBg="rgba(59,130,246,0.15)"
          iconColor="#3b82f6"
          label="Total de Leads"
          value={total}
          loading={loading}
          trend={trend}
          trendLabel={delta !== null && delta !== undefined ? `${delta >= 0 ? "+" : ""}${delta}% vs mês anterior` : undefined}
        />
        <KpiCard
          icon={Activity}
          iconBg="rgba(124,58,237,0.15)"
          iconColor="#7c3aed"
          label="Leads este mês"
          value={thisMonth}
          loading={loading}
        />
        <KpiCard
          icon={DollarSign}
          iconBg="rgba(34,197,94,0.15)"
          iconColor="#22c55e"
          label="Receita do mês"
          value={revenue}
          prefix="R$ "
          loading={loading}
        />
        <KpiCard
          icon={CheckCircle2}
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#f59e0b"
          label="Conversão"
          value={conversion}
          suffix="%"
          loading={loading}
        />
      </div>

      {/* ── Meta + Diagnóstico ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <GoalProgressCard
          goal={goal}
          revenueActual={revenue}
          dealsActual={byStatus.find(b => b.status === "fechado")?.count ?? 0}
          canEdit={true}
          onEdit={() => setShowMeta(true)}
        />
        <DiagnosticoPanel clientId={null} />
      </div>
      {showMeta && (
        <MetaModal
          clientId={null}
          onClose={() => setShowMeta(false)}
          onSaved={(g) => { setGoal(g); setShowMeta(false); }}
        />
      )}

      {/* ── Forecast + Ranking ── */}
      <div style={{ marginBottom: 24 }}>
        <ForecastCard data={forecast} loading={loadingFC} />
      </div>

      {/* ── Middle ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Funil */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Funil do pipeline</div>
              <div className="card-description">Distribuição de leads por etapa</div>
            </div>
            <a href="/dashboard/relatorios" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              Relatório <ArrowRight size={12} />
            </a>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 28, borderRadius: 6 }} />)}
            </div>
          ) : byStatus.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <div className="empty-state-icon"><Users size={28} /></div>
              <div className="empty-state-title">Sem dados</div>
            </div>
          ) : (
            <div>
              {["novo","contato","proposta","fechado","perdido"].map(st => {
                const entry = byStatus.find(b => b.status === st);
                return (
                  <FunnelStep
                    key={st}
                    label={STATUS_LABELS[st] ?? st}
                    count={entry?.count ?? 0}
                    max={maxCount}
                    color={STATUS_COLORS[st] ?? "#7c3aed"}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Atividade recente */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Atividade recente</div>
              <div className="card-description">Últimos leads capturados</div>
            </div>
            <a href="/dashboard/leads" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              Ver todos <ArrowRight size={12} />
            </a>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 6 }} />)}
            </div>
          ) : leads.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <div className="empty-state-icon"><Users size={28} /></div>
              <div className="empty-state-title">Nenhum lead ainda</div>
            </div>
          ) : (
            leads.map(lead => {
              const src = sourceBadge(lead.source);
              return (
                <a key={lead.id} href={`/dashboard/leads/${lead.id}`} className="activity-item" style={{ textDecoration: "none" }}>
                  <div className="activity-avatar">
                    {lead.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.name}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                      <span className={src.cls}>{src.label}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(lead.created_at)}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-full)",
                      background: `${STATUS_COLORS[lead.status] ?? "#6b7280"}20`,
                      color: STATUS_COLORS[lead.status] ?? "#6b7280",
                      flexShrink: 0,
                    }}
                  >
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </div>
                </a>
              );
            })
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Propostas abertas */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Propostas em aberto</div>
              <div className="card-description">Aguardando ação do cliente</div>
            </div>
            <a href="/dashboard/propostas" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              Ver todas <ArrowRight size={12} />
            </a>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 6 }} />)}
            </div>
          ) : proposals.length === 0 ? (
            <div className="empty-state" style={{ padding: "28px 0" }}>
              <div className="empty-state-icon"><FileText size={24} /></div>
              <div className="empty-state-title">Nenhuma proposta pendente</div>
            </div>
          ) : (
            proposals.map(p => (
              <div key={p.id} className="activity-item">
                <div className="kpi-icon" style={{ background: "rgba(124,58,237,0.1)", width: 34, height: 34, marginBottom: 0, flexShrink: 0 }}>
                  <FileText size={15} color="#7c3aed" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.lead_name ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    {PROPOSAL_STATUS_LABELS[p.status ?? ""] ?? p.status}
                  </div>
                </div>
                {p.amount != null && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", flexShrink: 0 }}>
                    {formatCurrency(p.amount)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Clientes ativos */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Clientes ativos</div>
              <div className="card-description">{clients.length} empresa{clients.length !== 1 ? "s" : ""} usando o sistema</div>
            </div>
            <a href="/dashboard/clients" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              Gerenciar <ArrowRight size={12} />
            </a>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 6 }} />)}
            </div>
          ) : clients.slice(0, 5).map(c => (
            <div key={c.id} className="activity-item">
              <div className="activity-avatar" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", borderColor: "rgba(59,130,246,0.25)" }}>
                {c.name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.niche}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alertas ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {!loading && stagnant.length > 0 && (
          <AlertItem
            type="red"
            icon={AlertTriangle}
            text={`${stagnant.length} lead${stagnant.length > 1 ? "s parados" : " parado"} há mais de 7 dias sem atualização`}
            href="/dashboard/leads"
          />
        )}
        {!loading && proposals.length > 0 && (
          <AlertItem
            type="yellow"
            icon={Clock}
            text={`${proposals.length} proposta${proposals.length > 1 ? "s aguardando" : " aguardando"} resposta do cliente`}
            href="/dashboard/propostas"
          />
        )}
        {!loading && (
          <AlertItem
            type="green"
            icon={Activity}
            text="LeadsOS operando normalmente — SDR IA e follow-ups ativos"
          />
        )}
      </div>

      {/* ── Quick Access ── */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          Acesso rápido
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
          <QuickBtn icon={Users}         label="Leads"       href="/dashboard/leads"        color="#3b82f6" />
          <QuickBtn icon={MessageSquare} label="Conversas"   href="/dashboard/conversas"    color="#22c55e" />
          <QuickBtn icon={FileText}      label="Propostas"   href="/dashboard/propostas"    color="#7c3aed" />
          <QuickBtn icon={Megaphone}     label="Campanhas"   href="/dashboard/campanhas"    color="#f43f5e" />
          <QuickBtn icon={Target}        label="Prospecção"  href="/dashboard/prospecao"    color="#f59e0b" />
          <QuickBtn icon={BarChart2}     label="Relatórios"  href="/dashboard/relatorios"   color="#3b82f6" />
          <QuickBtn icon={Sparkles}      label="Insights IA" href="/dashboard/insights"     color="#8b5cf6" />
          <QuickBtn icon={Monitor}       label="War Room"    href="/dashboard/war-room"     color="#ef4444" />
          <QuickBtn icon={Building2}     label="Clientes"    href="/dashboard/clients"      color="#f59e0b" />
          <QuickBtn icon={Settings}      label="Config."     href="/dashboard/configuracoes" color="#6b7280" />
        </div>
      </div>

    </main>
  );
}

// ─── HOME GESTOR ──────────────────────────────────────────────────────────────

function HomeGestor({ user }: { user: UserInfo }) {
  const [report,    setReport]    = useState<ReportData | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [clientName, setClientName] = useState("");
  const [goal,      setGoal]      = useState<Goal | null>(null);
  const [showMeta,  setShowMeta]  = useState(false);
  const [forecast,  setForecast]  = useState<ForecastData | null>(null);
  const [loadingFC, setLoadingFC] = useState(true);

  useEffect(() => {
    const cid = user.client_id ?? "";
    const qs  = cid ? `?client_id=${cid}` : "";
    Promise.all([
      fetch(`/api/reports${qs}`).then(r => r.json()),
      fetch(`/api/proposals/all${qs}`).then(r => r.json()),
      fetch(`/api/leads${qs}&limit=6`).then(r => r.json()),
      cid ? fetch(`/api/clients`).then(r => r.json()) : Promise.resolve({ data: [] }),
      fetch(`/api/goals${qs}`).then(r => r.json()),
    ]).then(([rep, prop, lea, cli, gol]) => {
      if (rep.success) setReport(rep.data);
      setProposals((prop.proposals ?? prop.data ?? []).filter((p: Proposal) =>
        ["awaiting_signature", "awaiting_payment", "sent"].includes(p.status ?? "")
      ).slice(0, 4));
      setLeads((lea.leads ?? []).slice(0, 6));
      const found = (cli.data ?? []).find((c: Client) => c.id === cid);
      if (found) setClientName(found.name);
      if (gol.success && gol.goal) setGoal(gol.goal);
    }).catch(console.error).finally(() => setLoading(false));

    fetch(`/api/forecast${qs}`).then(r => r.json()).then(j => {
      if (j.success) setForecast(j);
    }).catch(console.error).finally(() => setLoadingFC(false));
  }, [user.client_id]);

  const total      = report?.total ?? 0;
  const thisMonth  = report?.this_month ?? 0;
  const revenue    = report?.revenue_this_month ?? 0;
  const conversion = report?.conversion_rate ?? 0;
  const byStatus   = report?.by_status ?? [];
  const maxCount   = Math.max(...byStatus.map(s => s.count), 1);
  const delta      = report?.month_delta;
  const trend      = delta === null || delta === undefined ? null : delta >= 0 ? "up" : "down";

  const stagnant = leads.filter(l => {
    if (!l.created_at) return false;
    const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
    return days >= 7 && l.status !== "fechado" && l.status !== "perdido";
  });

  return (
    <main className="page-container">

      {/* ── Welcome ── */}
      <div className="gradient-border-card welcome-bg" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, textTransform: "capitalize" }}>
              {formatDate()}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", marginBottom: 6 }}>
              {greeting()}, {clientName || user.name || "Gestor"} 👋
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Seu pipeline comercial em tempo real.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--success-light)", border: "1px solid var(--success-border)", borderRadius: "var(--radius-full)", padding: "6px 14px" }}>
            <span className="pulse-dot" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--success)" }}>Ao vivo</span>
          </div>
        </div>
      </div>

      {/* ── Frase do dia ── */}
      <FraseCard />

      {/* ── KPIs ── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <KpiCard icon={Users}        iconBg="rgba(59,130,246,0.15)"  iconColor="#3b82f6" label="Total de Leads"   value={total}      loading={loading} trend={trend} trendLabel={delta !== null && delta !== undefined ? `${delta >= 0 ? "+" : ""}${delta}% vs mês passado` : undefined} />
        <KpiCard icon={Activity}     iconBg="rgba(124,58,237,0.15)" iconColor="#7c3aed" label="Leads este mês"  value={thisMonth}  loading={loading} />
        <KpiCard icon={DollarSign}   iconBg="rgba(34,197,94,0.15)"  iconColor="#22c55e" label="Receita do mês"  value={revenue}    prefix="R$ " loading={loading} />
        <KpiCard icon={CheckCircle2} iconBg="rgba(245,158,11,0.15)" iconColor="#f59e0b" label="Conversão"       value={conversion} suffix="%" loading={loading} />
      </div>

      {/* ── Meta + Diagnóstico ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <GoalProgressCard
          goal={goal}
          revenueActual={revenue}
          dealsActual={byStatus.find(b => b.status === "fechado")?.count ?? 0}
          canEdit={true}
          onEdit={() => setShowMeta(true)}
        />
        <DiagnosticoPanel clientId={user.client_id ?? null} />
      </div>
      {showMeta && (
        <MetaModal
          clientId={user.client_id ?? null}
          onClose={() => setShowMeta(false)}
          onSaved={(g) => { setGoal(g); setShowMeta(false); }}
        />
      )}

      {/* ── Forecast + Ranking ── */}
      <div style={{ marginBottom: 24 }}>
        <ForecastCard data={forecast} loading={loadingFC} />
      </div>

      {/* ── Middle ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Funil do pipeline</div>
              <div className="card-description">Distribuição por etapa</div>
            </div>
            <a href="/dashboard/relatorios" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              Relatório <ArrowRight size={12} />
            </a>
          </div>
          {loading
            ? [1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 28, borderRadius: 6, marginBottom: 8 }} />)
            : ["novo","contato","proposta","fechado","perdido"].map(st => {
                const entry = byStatus.find(b => b.status === st);
                return <FunnelStep key={st} label={STATUS_LABELS[st] ?? st} count={entry?.count ?? 0} max={maxCount} color={STATUS_COLORS[st] ?? "#7c3aed"} />;
              })
          }
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Leads recentes</div>
              <div className="card-description">Últimas capturas</div>
            </div>
            <a href="/dashboard/leads" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              Ver todos <ArrowRight size={12} />
            </a>
          </div>
          {loading
            ? [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 6, marginBottom: 8 }} />)
            : leads.length === 0
              ? <div className="empty-state" style={{ padding: "28px 0" }}><div className="empty-state-icon"><Users size={24} /></div><div className="empty-state-title">Sem leads ainda</div></div>
              : leads.map(lead => {
                  const src = sourceBadge(lead.source);
                  return (
                    <a key={lead.id} href={`/dashboard/leads/${lead.id}`} className="activity-item" style={{ textDecoration: "none" }}>
                      <div className="activity-avatar">{lead.name?.[0]?.toUpperCase() ?? "?"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                          <span className={src.cls}>{src.label}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(lead.created_at)}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-full)", background: `${STATUS_COLORS[lead.status] ?? "#6b7280"}20`, color: STATUS_COLORS[lead.status] ?? "#6b7280", flexShrink: 0 }}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </div>
                    </a>
                  );
                })
          }
        </div>
      </div>

      {/* ── Propostas + Alertas ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Propostas em aberto</div></div>
            <a href="/dashboard/propostas" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>Ver <ArrowRight size={12} /></a>
          </div>
          {loading
            ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 6, marginBottom: 8 }} />)
            : proposals.length === 0
              ? <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-state-icon"><FileText size={22} /></div><div className="empty-state-title">Nenhuma pendente</div></div>
              : proposals.map(p => (
                  <div key={p.id} className="activity-item">
                    <div className="kpi-icon" style={{ background: "rgba(124,58,237,0.1)", width: 34, height: 34, marginBottom: 0, flexShrink: 0 }}><FileText size={15} color="#7c3aed" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.lead_name ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{PROPOSAL_STATUS_LABELS[p.status ?? ""] ?? p.status}</div>
                    </div>
                    {p.amount != null && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", flexShrink: 0 }}>{formatCurrency(p.amount)}</div>}
                  </div>
                ))
          }
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Alertas</div>
          {!loading && stagnant.length > 0 && (
            <AlertItem type="red" icon={AlertTriangle} text={`${stagnant.length} lead${stagnant.length > 1 ? "s parados" : " parado"} há +7 dias`} href="/dashboard/leads" />
          )}
          {!loading && proposals.length > 0 && (
            <AlertItem type="yellow" icon={Clock} text={`${proposals.length} proposta${proposals.length > 1 ? "s aguardando" : " aguardando"} retorno`} href="/dashboard/propostas" />
          )}
          <AlertItem type="green" icon={Activity} text="SDR IA e follow-ups operando" />
        </div>
      </div>

      {/* ── Quick Access ── */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Acesso rápido</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
          <QuickBtn icon={Users}         label="Leads"       href="/dashboard/leads"       color="#3b82f6" />
          <QuickBtn icon={MessageSquare} label="Conversas"   href="/dashboard/conversas"   color="#22c55e" />
          <QuickBtn icon={FileText}      label="Propostas"   href="/dashboard/propostas"   color="#7c3aed" />
          <QuickBtn icon={Megaphone}     label="Campanhas"   href="/dashboard/campanhas"   color="#f43f5e" />
          <QuickBtn icon={Target}        label="Prospecção"  href="/dashboard/prospecao"   color="#f59e0b" />
          <QuickBtn icon={Monitor}       label="War Room"    href="/dashboard/war-room"    color="#ef4444" />
          <QuickBtn icon={BarChart2}     label="Relatórios"  href="/dashboard/relatorios"  color="#3b82f6" />
          <QuickBtn icon={Sparkles}      label="Insights IA" href="/dashboard/insights"    color="#8b5cf6" />
        </div>
      </div>

    </main>
  );
}

// ─── HOME VENDEDOR ────────────────────────────────────────────────────────────

function HomeVendedor({ user }: { user: UserInfo }) {
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [goal,    setGoal]    = useState<Goal | null>(null);

  useEffect(() => {
    const cid = user.client_id ?? "";
    const qs  = cid ? `?client_id=${cid}&limit=20` : "?limit=20";
    const gqs = cid ? `?client_id=${cid}` : "";
    Promise.all([
      fetch(`/api/leads${qs}`).then(r => r.json()),
      fetch(`/api/goals${gqs}`).then(r => r.json()),
    ]).then(([j, gol]) => {
      setLeads(j.leads ?? []);
      if (gol.success && gol.goal) setGoal(gol.goal);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user.client_id]);

  const active    = leads.filter(l => l.status !== "fechado" && l.status !== "perdido");
  const pending   = leads.filter(l => l.status === "contato" || l.status === "proposta");
  const closed    = leads.filter(l => l.status === "fechado");
  const needsAction = leads.filter(l => {
    if (!l.created_at) return false;
    const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
    return days >= 3 && l.status !== "fechado" && l.status !== "perdido";
  }).slice(0, 5);

  return (
    <main className="page-container">

      {/* ── Welcome ── */}
      <div className="gradient-border-card welcome-bg" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", marginBottom: 6 }}>
          {greeting()}, {user.name ?? "Vendedor"} 👋
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Veja suas pendências e acompanhe seus leads abaixo.
        </p>
      </div>

      {/* ── Frase do dia ── */}
      <FraseCard />

      {/* ── KPIs ── */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <KpiCard icon={Users}        iconBg="rgba(59,130,246,0.15)"  iconColor="#3b82f6" label="Leads ativos"     value={active.length}  loading={loading} />
        <KpiCard icon={MessageSquare} iconBg="rgba(245,158,11,0.15)" iconColor="#f59e0b" label="Em negociação"    value={pending.length} loading={loading} />
        <KpiCard icon={CheckCircle2} iconBg="rgba(34,197,94,0.15)"  iconColor="#22c55e" label="Fechados"          value={closed.length}  loading={loading} />
        <KpiCard icon={Bell}         iconBg="rgba(239,68,68,0.15)"   iconColor="#ef4444" label="Precisam atenção" value={needsAction.length} loading={loading} />
      </div>

      {/* ── Meta do mês ── */}
      {goal && (
        <div style={{ marginBottom: 24 }}>
          <GoalProgressCard
            goal={goal}
            revenueActual={0}
            dealsActual={closed.length}
            canEdit={false}
            onEdit={() => {}}
          />
        </div>
      )}

      {/* ── Precisa de atenção ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Precisam de atenção</div>
              <div className="card-description">Leads sem atualização recente</div>
            </div>
          </div>
          {loading
            ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 6, marginBottom: 8 }} />)
            : needsAction.length === 0
              ? <div className="empty-state" style={{ padding: "28px 0" }}><div className="empty-state-icon"><CheckCircle2 size={22} /></div><div className="empty-state-title">Tudo em dia!</div></div>
              : needsAction.map(lead => {
                  const src = sourceBadge(lead.source);
                  return (
                    <a key={lead.id} href={`/dashboard/leads/${lead.id}`} className="activity-item" style={{ textDecoration: "none" }}>
                      <div className="activity-avatar">{lead.name?.[0]?.toUpperCase() ?? "?"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                          <span className={src.cls}>{src.label}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(lead.created_at)}</span>
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" />
                    </a>
                  );
                })
          }
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Leads recentes</div>
              <div className="card-description">Últimas capturas</div>
            </div>
            <a href="/dashboard/leads" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              Ver todos <ArrowRight size={12} />
            </a>
          </div>
          {loading
            ? [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 6, marginBottom: 8 }} />)
            : leads.slice(0,5).map(lead => {
                const src = sourceBadge(lead.source);
                return (
                  <a key={lead.id} href={`/dashboard/leads/${lead.id}`} className="activity-item" style={{ textDecoration: "none" }}>
                    <div className="activity-avatar">{lead.name?.[0]?.toUpperCase() ?? "?"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        <span className={src.cls}>{src.label}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(lead.created_at)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-full)", background: `${STATUS_COLORS[lead.status] ?? "#6b7280"}20`, color: STATUS_COLORS[lead.status] ?? "#6b7280", flexShrink: 0 }}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </div>
                  </a>
                );
              })
          }
        </div>
      </div>

      {/* ── Quick Access ── */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Acesso rápido</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
          <QuickBtn icon={Users}         label="Leads"       href="/dashboard/leads"      color="#3b82f6" />
          <QuickBtn icon={MessageSquare} label="Conversas"   href="/dashboard/conversas"  color="#22c55e" />
          <QuickBtn icon={FileText}      label="Propostas"   href="/dashboard/propostas"  color="#7c3aed" />
          <QuickBtn icon={Megaphone}     label="Campanhas"   href="/dashboard/campanhas"  color="#f43f5e" />
          <QuickBtn icon={Target}        label="Prospecção"  href="/dashboard/prospecao"  color="#f59e0b" />
          <QuickBtn icon={Sparkles}      label="Insights IA" href="/dashboard/insights"   color="#8b5cf6" />
        </div>
      </div>

    </main>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router  = useRouter();
  const [user,  setUser]  = useState<UserInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(j => {
      if (!j.success) { router.replace("/login"); return; }
      setUser(j.user);
    }).catch(() => router.replace("/login")).finally(() => setReady(true));
  }, [router]);

  if (!ready) {
    return (
      <div className="page-container flex items-center gap-3" style={{ paddingTop: 64 }}>
        <div className="spinner" />
        <span className="text-secondary">Carregando...</span>
      </div>
    );
  }

  if (!user) return null;

  const profile = user.profile ?? "vendedor";

  if (profile === "admin" || (!user.client_id && profile !== "vendedor")) {
    return <HomeAdmin user={user} />;
  }
  if (profile === "vendedor") {
    return <HomeVendedor user={user} />;
  }
  return <HomeGestor user={user} />;
}
