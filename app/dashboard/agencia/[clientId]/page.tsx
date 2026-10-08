"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Plus, Loader2, X, Edit2, CheckSquare,
  Square, Clock, CheckCircle2, AlertCircle, Calendar, DollarSign,
  Briefcase, FileText, Users, MoreHorizontal, Trash2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgencyTask {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee?: string;
  due_date?: string;
}

interface Deliverable {
  id: string;
  title: string;
  status: "pendente" | "em_producao" | "aguardando_aprovacao" | "aprovado";
  file_url?: string;
  approved_at?: string;
}

interface AgencyProject {
  id: string;
  client_id: string;
  name: string;
  month: string;
  status: "planejamento" | "execucao" | "revisao" | "entregue";
  tasks: AgencyTask[];
  deliverables: Deliverable[];
  responsible: string;
  deadline: string;
  notes?: string;
  created_at: string;
}

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
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const PROJ_STATUS_COLORS: Record<string, string> = {
  planejamento: "#3b82f6",
  execucao:     "#f59e0b",
  revisao:      "#8b5cf6",
  entregue:     "#22c55e",
};

const PROJ_STATUS_LABELS: Record<string, string> = {
  planejamento: "Planejamento",
  execucao:     "Em execução",
  revisao:      "Em revisão",
  entregue:     "Entregue",
};

const DELIV_STATUS_LABELS: Record<string, string> = {
  pendente:               "Pendente",
  em_producao:            "Em produção",
  aguardando_aprovacao:   "Aguardando aprovação",
  aprovado:               "Aprovado",
};

const DELIV_STATUS_COLORS: Record<string, string> = {
  pendente:               "#6b7280",
  em_producao:            "#f59e0b",
  aguardando_aprovacao:   "#8b5cf6",
  aprovado:               "#22c55e",
};

// ─── Modal Novo Projeto ───────────────────────────────────────────────────────

function NovoProjeto({ clientId, onClose, onSaved }: {
  clientId: string;
  onClose: () => void;
  onSaved: (p: AgencyProject) => void;
}) {
  const [form, setForm] = useState({ name: "", month: new Date().toISOString().slice(0, 7), responsible: "", deadline: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.name.trim()) { setErr("Nome do projeto é obrigatório"); return; }
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/agencia/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, ...form }),
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
      <div style={{ background: "var(--bg-elevated)", borderRadius: 16, padding: 28, width: 440, maxWidth: "calc(100vw - 32px)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 9 }}>
            <Briefcase size={17} color="#7c3aed" /> Novo Projeto
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
        </div>

        {[
          { label: "Nome do projeto *", key: "name" as const, placeholder: "Ex: Gestão Social Media — Outubro" },
          { label: "Mês", key: "month" as const, placeholder: "", type: "month" },
          { label: "Responsável", key: "responsible" as const, placeholder: "Quem vai executar?" },
          { label: "Prazo de entrega", key: "deadline" as const, placeholder: "", type: "date" },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
            <input type={type ?? "text"} value={form[key]} onChange={set(key)} placeholder={placeholder} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notas</label>
          <textarea value={form.notes} onChange={set("notes")} placeholder="Detalhes do escopo..." rows={2} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>

        {err && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{err}</div>}

        <button onClick={save} disabled={saving} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: saving ? "rgba(124,58,237,.4)" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : "Criar projeto"}
        </button>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onUpdate }: {
  project: AgencyProject;
  onUpdate: (p: AgencyProject) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newDeliv, setNewDeliv] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [savingDeliv, setSavingDeliv] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);

  const color = PROJ_STATUS_COLORS[project.status] ?? "#6b7280";
  const tasks = project.tasks ?? [];
  const deliverables = project.deliverables ?? [];
  const doneCount = tasks.filter(t => t.status === "done").length;

  async function updateProject(patch: Partial<AgencyProject>) {
    await fetch(`/api/agencia/projetos/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    onUpdate({ ...project, ...patch });
  }

  async function toggleTask(taskId: string) {
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: (t.status === "done" ? "todo" : "done") as AgencyTask["status"] } : t);
    await updateProject({ tasks: updated });
  }

  async function addTask() {
    if (!newTask.trim()) return;
    setSavingTask(true);
    const updated = [...tasks, { id: uid(), title: newTask.trim(), status: "todo" as const }];
    await updateProject({ tasks: updated });
    setNewTask("");
    setSavingTask(false);
  }

  async function addDeliverable() {
    if (!newDeliv.trim()) return;
    setSavingDeliv(true);
    const updated = [...deliverables, { id: uid(), title: newDeliv.trim(), status: "pendente" as const }];
    await updateProject({ deliverables: updated });
    setNewDeliv("");
    setSavingDeliv(false);
  }

  async function cycleDelivStatus(delivId: string) {
    const cycle: Deliverable["status"][] = ["pendente", "em_producao", "aguardando_aprovacao", "aprovado"];
    const updated = deliverables.map(d => {
      if (d.id !== delivId) return d;
      const idx = cycle.indexOf(d.status);
      return { ...d, status: cycle[(idx + 1) % cycle.length] };
    });
    await updateProject({ deliverables: updated });
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-surface)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{project.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1, display: "flex", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} /> {project.month}</span>
            {project.responsible && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={11} /> {project.responsible}</span>}
            {tasks.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={11} /> {doneCount}/{tasks.length} tasks</span>}
          </div>
        </div>

        {/* Status badge with dropdown */}
        <div style={{ position: "relative" }} onClick={e => { e.stopPropagation(); setStatusMenu(m => !m); }}>
          <div style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: `${color}18`, color, cursor: "pointer" }}>
            {PROJ_STATUS_LABELS[project.status] ?? project.status}
          </div>
          {statusMenu && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 4px", zIndex: 20, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
              {(["planejamento","execucao","revisao","entregue"] as const).map(s => (
                <button key={s} onClick={() => { setStatusMenu(false); updateProject({ status: s }); }} style={{ display: "block", width: "100%", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", color: project.status === s ? "var(--accent)" : "var(--text-primary)", fontSize: 12, fontWeight: project.status === s ? 700 : 500, borderRadius: 6, textAlign: "left" }}>
                  {PROJ_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 16px 12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Tasks */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Tasks</div>
              {tasks.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <button onClick={() => toggleTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.status === "done" ? "#22c55e" : "var(--text-muted)", padding: 0, marginTop: 1, flexShrink: 0 }}>
                    {t.status === "done" ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                  <span style={{ fontSize: 13, color: t.status === "done" ? "var(--text-muted)" : "var(--text-primary)", textDecoration: t.status === "done" ? "line-through" : "none", lineHeight: 1.4 }}>
                    {t.title}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Nova task..." style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
                <button onClick={addTask} disabled={savingTask || !newTask.trim()} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, cursor: "pointer", opacity: !newTask.trim() ? 0.4 : 1 }}>
                  {savingTask ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
                </button>
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Entregáveis</div>
              {deliverables.map(d => {
                const dc = DELIV_STATUS_COLORS[d.status] ?? "#6b7280";
                return (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <button onClick={() => cycleDelivStatus(d.id)} title="Clique para avançar status" style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${dc}18`, color: dc, border: `1px solid ${dc}30`, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                      {DELIV_STATUS_LABELS[d.status]}
                    </button>
                    <span style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>{d.title}</span>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input value={newDeliv} onChange={e => setNewDeliv(e.target.value)} onKeyDown={e => e.key === "Enter" && addDeliverable()} placeholder="Novo entregável..." style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
                <button onClick={addDeliverable} disabled={savingDeliv || !newDeliv.trim()} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, cursor: "pointer", opacity: !newDeliv.trim() ? 0.4 : 1 }}>
                  {savingDeliv ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
                </button>
              </div>
            </div>
          </div>

          {project.notes && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(124,58,237,.06)", border: "1px solid rgba(124,58,237,.12)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text-primary)" }}>Notas:</strong> {project.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgenciaClientePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<AgencyClient | null>(null);
  const [projects, setProjects] = useState<AgencyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<"projetos" | "info">("projetos");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", niche: "", cnpj: "", monthly_value: "", briefing: "", responsible: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      fetch(`/api/agencia/clientes/${clientId}`).then(r => r.json()),
      fetch(`/api/agencia/projetos?client_id=${clientId}`).then(r => r.json()),
    ]).then(([c, p]) => {
      if (c.success) { setClient(c.data); setEditForm({ name: c.data.name, niche: c.data.niche ?? "", cnpj: c.data.cnpj ?? "", monthly_value: String(c.data.monthly_value ?? ""), briefing: c.data.briefing ?? "", responsible: c.data.responsible ?? "" }); }
      if (p.success) setProjects(p.data ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [clientId]);

  async function saveEdit() {
    setSaving(true);
    await fetch(`/api/agencia/clientes/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, monthly_value: Number(editForm.monthly_value.replace(/\D/g, "")) || 0 }),
    });
    setClient(prev => prev ? { ...prev, ...editForm, monthly_value: Number(editForm.monthly_value.replace(/\D/g, "")) || 0 } : prev);
    setSaving(false);
    setEditing(false);
  }

  if (loading) {
    return (
      <main className="page-container">
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-secondary)" }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando...
        </div>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="page-container">
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, color: "var(--text-primary)" }}>Cliente não encontrado</div>
          <button onClick={() => router.push("/dashboard/agencia")} style={{ marginTop: 16, padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>
            Voltar
          </button>
        </div>
      </main>
    );
  }

  const statusColor = { ativo: "#22c55e", pausado: "#f59e0b", encerrado: "#6b7280" }[client.status] ?? "#6b7280";
  const activeProjects = projects.filter(p => p.status !== "entregue");
  const totalTasks = projects.flatMap(p => p.tasks ?? []).length;
  const doneTasks = projects.flatMap(p => p.tasks ?? []).filter(t => t.status === "done").length;

  return (
    <main className="page-container">

      {/* Back + Header */}
      <button onClick={() => router.push("/dashboard/agencia")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, padding: "4px 0" }}>
        <ArrowLeft size={15} /> Voltar para Agência
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(124,58,237,.12)", border: "1px solid rgba(124,58,237,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#7c3aed" }}>
            {client.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.4px" }}>{client.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {client.niche && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{client.niche}</span>}
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: `${statusColor}18`, color: statusColor }}>
                {{ ativo: "Ativo", pausado: "Pausado", encerrado: "Encerrado" }[client.status]}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>
            <Edit2 size={13} /> Editar
          </button>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            <Plus size={14} /> Novo Projeto
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: DollarSign,   bg: "rgba(34,197,94,.12)",  color: "#22c55e", label: "Valor mensal",     value: fmtBRL(client.monthly_value) },
          { icon: Briefcase,    bg: "rgba(124,58,237,.12)", color: "#7c3aed", label: "Proj. ativos",     value: String(activeProjects.length) },
          { icon: FileText,     bg: "rgba(59,130,246,.12)", color: "#3b82f6", label: "Total de projetos", value: String(projects.length) },
          { icon: CheckCircle2, bg: "rgba(245,158,11,.12)", color: "#f59e0b", label: "Tasks concluídas", value: totalTasks > 0 ? `${doneTasks}/${totalTasks}` : "—" },
        ].map(({ icon: Icon, bg, color, label, value }) => (
          <div key={label} className="kpi-card">
            <div className="kpi-icon" style={{ background: bg }}><Icon size={18} color={color} strokeWidth={2} /></div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {(["projetos", "info"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 16px", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "var(--accent)" : "transparent"}`, color: tab === t ? "var(--accent)" : "var(--text-secondary)", fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: "pointer", marginBottom: -1, textTransform: "capitalize" }}>
            {t === "projetos" ? "Projetos" : "Informações"}
          </button>
        ))}
      </div>

      {/* Tab: Projetos */}
      {tab === "projetos" && (
        projects.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 0" }}>
            <div className="empty-state-icon"><Briefcase size={30} /></div>
            <div className="empty-state-title">Nenhum projeto</div>
            <div className="empty-state-description">Crie o primeiro projeto mensal para este cliente.</div>
            <button onClick={() => setShowModal(true)} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Plus size={14} /> Criar projeto
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onUpdate={updated => setProjects(prev => prev.map(x => x.id === updated.id ? updated : x))}
              />
            ))}
          </div>
        )
      )}

      {/* Tab: Info */}
      {tab === "info" && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { label: "Nome", value: client.name },
              { label: "Nicho", value: client.niche || "—" },
              { label: "CNPJ", value: client.cnpj || "—" },
              { label: "Responsável", value: client.responsible || "—" },
              { label: "Valor mensal", value: fmtBRL(client.monthly_value) },
              { label: "Início", value: client.start_date ? new Date(client.start_date).toLocaleDateString("pt-BR") : "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
          {client.briefing && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Briefing</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{client.briefing}</div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setEditing(false)}>
          <div style={{ background: "var(--bg-elevated)", borderRadius: 16, padding: 28, width: 440, maxWidth: "calc(100vw - 32px)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.4)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Editar Cliente</div>
              <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
            </div>
            {(["name","niche","cnpj","monthly_value","responsible"] as const).map(key => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{key === "monthly_value" ? "Valor mensal (R$)" : key}</label>
                <input value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Briefing</label>
              <textarea value={editForm.briefing} onChange={e => setEditForm(f => ({ ...f, briefing: e.target.value }))} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <button onClick={saveEdit} disabled={saving} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: saving ? "rgba(124,58,237,.4)" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saving ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : "Salvar alterações"}
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <NovoProjeto
          clientId={clientId as string}
          onClose={() => setShowModal(false)}
          onSaved={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </main>
  );
}
