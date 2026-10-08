"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Plus, Search, DollarSign, Users, CheckCircle2,
  Clock, ArrowRight, X, Loader2, Building2, Calendar,
  TrendingUp, MoreHorizontal, Edit2, Trash2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgencyClient {
  id: string;
  name: string;
  niche: string;
  cnpj?: string;
  briefing?: string;
  responsible: string;
  status: "ativo" | "pausado" | "encerrado";
  monthly_value: number;
  start_date: string;
  lead_id?: string;
  tenant_id?: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  ativo:      "#22c55e",
  pausado:    "#f59e0b",
  encerrado:  "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  ativo:      "Ativo",
  pausado:    "Pausado",
  encerrado:  "Encerrado",
};

// ─── Modal Novo Cliente ───────────────────────────────────────────────────────

function NovoClienteModal({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: (c: AgencyClient) => void;
}) {
  const [form, setForm] = useState({ name: "", niche: "", cnpj: "", monthly_value: "", responsible: "", start_date: "", briefing: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name.trim()) { setErr("Nome é obrigatório"); return; }
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/agencia/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          niche: form.niche,
          cnpj: form.cnpj,
          monthly_value: Number(form.monthly_value.replace(/\D/g, "")) || 0,
          responsible: form.responsible,
          start_date: form.start_date || new Date().toISOString().slice(0, 10),
          briefing: form.briefing,
        }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      onSaved(j.data);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--bg-elevated)", borderRadius: 16, padding: 28, width: 480, maxWidth: "calc(100vw - 32px)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.4)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 9 }}>
            <Building2 size={18} color="#7c3aed" /> Novo Cliente
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
        </div>

        {[
          { label: "Nome *", key: "name" as const, placeholder: "Ex: Clínica Estética Silva" },
          { label: "Nicho / Segmento", key: "niche" as const, placeholder: "Ex: Estética, Saúde, E-commerce..." },
          { label: "CNPJ", key: "cnpj" as const, placeholder: "00.000.000/0001-00" },
          { label: "Valor mensal (R$)", key: "monthly_value" as const, placeholder: "Ex: 2500" },
          { label: "Responsável", key: "responsible" as const, placeholder: "Nome do responsável interno" },
          { label: "Data de início", key: "start_date" as const, placeholder: "", type: "date" },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
            <input
              type={type ?? "text"}
              value={form[key]}
              onChange={set(key)}
              placeholder={placeholder}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Briefing</label>
          <textarea
            value={form.briefing}
            onChange={set("briefing")}
            placeholder="Resumo do negócio, objetivos, tom de voz..."
            rows={3}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>

        {err && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{err}</div>}

        <button onClick={save} disabled={saving} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: saving ? "rgba(124,58,237,.4)" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : "Salvar cliente"}
        </button>
      </div>
    </div>
  );
}

// ─── Client Row ───────────────────────────────────────────────────────────────

function ClientRow({ client, onView, onDelete }: {
  client: AgencyClient;
  onView: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = STATUS_COLORS[client.status] ?? "#6b7280";

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)", cursor: "pointer", transition: "border-color .15s", position: "relative" }}
      onClick={onView}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-border)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {/* Avatar */}
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(124,58,237,.12)", border: "1px solid rgba(124,58,237,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#7c3aed", flexShrink: 0 }}>
        {client.name[0]?.toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{client.niche || "—"} · {client.responsible || "—"}</div>
      </div>

      {/* MRR */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>{fmtBRL(client.monthly_value)}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>mensais</div>
      </div>

      {/* Status */}
      <div style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: `${color}18`, color, flexShrink: 0 }}>
        {STATUS_LABELS[client.status] ?? client.status}
      </div>

      {/* Date */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
        <Calendar size={11} /> {fmtDate(client.start_date)}
      </div>

      {/* Menu */}
      <div style={{ position: "relative", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setMenuOpen(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", borderRadius: 6 }}>
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div style={{ position: "absolute", right: 0, top: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 4px", zIndex: 10, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
            <button onClick={() => { setMenuOpen(false); onView(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: 13, borderRadius: 6 }}>
              <Edit2 size={13} /> Ver detalhes
            </button>
            <button onClick={() => { setMenuOpen(false); onDelete(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, borderRadius: 6 }}>
              <Trash2 size={13} /> Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgenciaPage() {
  const router = useRouter();
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativo" | "pausado" | "encerrado">("todos");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/agencia/clientes")
      .then(r => r.json())
      .then(j => { if (j.success) setClients(j.data ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.niche ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "todos" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const active = clients.filter(c => c.status === "ativo");
  const mrr = active.reduce((s, c) => s + (c.monthly_value || 0), 0);

  async function deleteClient(id: string) {
    if (!confirm("Excluir este cliente permanentemente?")) return;
    await fetch(`/api/agencia/clientes/${id}`, { method: "DELETE" });
    setClients(prev => prev.filter(c => c.id !== id));
  }

  return (
    <main className="page-container">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124,58,237,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase size={18} color="#7c3aed" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px", margin: 0 }}>Módulo Agência</h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Gerencie clientes, projetos e entregáveis da agência.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          <Plus size={15} /> Novo Cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { icon: Users,       bg: "rgba(124,58,237,.12)", color: "#7c3aed", label: "Clientes ativos",   value: loading ? "—" : String(active.length) },
          { icon: DollarSign,  bg: "rgba(34,197,94,.12)",  color: "#22c55e", label: "MRR total",         value: loading ? "—" : fmtBRL(mrr) },
          { icon: TrendingUp,  bg: "rgba(59,130,246,.12)", color: "#3b82f6", label: "Total de clientes", value: loading ? "—" : String(clients.length) },
          { icon: Clock,       bg: "rgba(245,158,11,.12)", color: "#f59e0b", label: "Pausados / Encerrados", value: loading ? "—" : String(clients.filter(c => c.status !== "ativo").length) },
        ].map(({ icon: Icon, bg, color, label, value }) => (
          <div key={label} className="kpi-card">
            <div className="kpi-icon" style={{ background: bg }}>
              <Icon size={18} color={color} strokeWidth={2} />
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente ou nicho..."
            style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        {(["todos", "ativo", "pausado", "encerrado"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${filter === s ? "var(--accent-border)" : "var(--border)"}`, background: filter === s ? "var(--accent-light)" : "transparent", color: filter === s ? "var(--accent)" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
            {s === "todos" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Client List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: "60px 0" }}>
          <div className="empty-state-icon"><Building2 size={32} /></div>
          <div className="empty-state-title">{search || filter !== "todos" ? "Nenhum resultado" : "Nenhum cliente ainda"}</div>
          <div className="empty-state-description">
            {search || filter !== "todos" ? "Tente ajustar os filtros." : "Clique em \"Novo Cliente\" para começar."}
          </div>
          {!search && filter === "todos" && (
            <button onClick={() => setShowModal(true)} style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Plus size={14} /> Novo Cliente
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(client => (
            <ClientRow
              key={client.id}
              client={client}
              onView={() => router.push(`/dashboard/agencia/${client.id}`)}
              onDelete={() => deleteClient(client.id)}
            />
          ))}
        </div>
      )}

      {/* CTA: Projetos overview */}
      {!loading && filtered.length > 0 && (
        <div className="card" style={{ marginTop: 24, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={18} color="#7c3aed" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Gerencie projetos e entregáveis</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Clique em um cliente para ver seus projetos mensais.</div>
            </div>
          </div>
          <ArrowRight size={18} color="var(--text-muted)" />
        </div>
      )}

      {showModal && (
        <NovoClienteModal
          onClose={() => setShowModal(false)}
          onSaved={c => setClients(prev => [c, ...prev])}
        />
      )}
    </main>
  );
}
