"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, FileText, Loader2, Pencil, Trash2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: string[];
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  social_media: "#3b82f6",
  trafego_pago: "#f59e0b",
  branding: "#8b5cf6",
  consultoria: "#22c55e",
  outros: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  social_media: "Social Media",
  trafego_pago: "Tráfego Pago",
  branding: "Branding",
  consultoria: "Consultoria",
  outros: "Outros",
};

const AVAILABLE_VARS = [
  "CLIENTE_NOME", "CLIENTE_CNPJ", "CLIENTE_ENDERECO", "CLIENTE_EMAIL",
  "SERVICO_NOME", "SERVICO_VALOR", "SERVICO_DESCRICAO",
  "DURACAO_MESES", "DATA_INICIO", "DATA_TERMINO",
  "FORMA_PAGAMENTO", "DIA_VENCIMENTO",
  "AGENCIA_NOME", "AGENCIA_CNPJ", "REPRESENTANTE_NOME",
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("social_media");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  function loadTemplates() {
    fetch("/api/juridico/templates")
      .then(r => r.json())
      .then(j => { if (j.success) setTemplates(j.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function openCreate() {
    setEditId(null);
    setName("");
    setType("social_media");
    setContent("");
    setShowModal(true);
  }

  function openEdit(t: Template) {
    setEditId(t.id);
    setName(t.name);
    setType(t.type);
    setContent(t.content);
    setShowModal(true);
  }

  async function handleSave() {
    if (!name || !content) return;
    setSaving(true);
    try {
      const url = editId ? `/api/juridico/templates/${editId}` : "/api/juridico/templates";
      const method = editId ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, content }),
      });
      const j = await r.json();
      if (j.success) {
        setShowModal(false);
        loadTemplates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    await fetch(`/api/juridico/templates/${id}`, { method: "DELETE" });
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;

  const grouped: Record<string, Template[]> = {};
  templates.forEach(t => {
    const key = t.type || "outros";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  return (
    <div style={{ padding: "24px 32px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Templates de Contrato</h1>
          <p className="page-subtitle">{templates.length} template{templates.length !== 1 ? "s" : ""} disponíveis</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Novo Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state" style={{ padding: "64px 0" }}>
          <FileText size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)" }}>Nenhum template criado</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Crie seu primeiro template de contrato para começar</div>
        </div>
      ) : (
        Object.entries(grouped).map(([typeKey, items]) => (
          <div key={typeKey} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLORS[typeKey] ?? "#6b7280" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {TYPE_LABELS[typeKey] ?? typeKey}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>({items.length})</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {items.map(t => (
                <div key={t.id} className="card" style={{ cursor: "pointer" }} onClick={() => router.push(`/dashboard/juridico/templates/${t.id}`)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={16} color={TYPE_COLORS[typeKey] ?? "#6b7280"} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={e => { e.stopPropagation(); openEdit(t); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(t.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                    {(t.variables ?? []).length} variáveis
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.content?.slice(0, 150)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal */}
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>{editId ? "Editar" : "Novo"} Template</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Nome do template</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Contrato Social Media Mensal" />
            </div>

            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Tipo de serviço</label>
              <select className="select" value={type} onChange={e => setType(e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Conteúdo do contrato</label>
              <textarea
                className="textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={"CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nPelo presente instrumento, {{AGENCIA_NOME}}, inscrita no CNPJ {{AGENCIA_CNPJ}}..."}
                style={{ minHeight: 250, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}
              />
            </div>

            <div style={{ marginBottom: 20, padding: 12, background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Variáveis disponíveis (copie e cole no texto)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {AVAILABLE_VARS.map(v => (
                  <span key={v} style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, background: "var(--accent-light)", color: "var(--accent)", cursor: "pointer" }}
                    onClick={() => setContent(prev => prev + `{{${v}}}`)}
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: "100%", minHeight: 42 }} onClick={handleSave} disabled={saving || !name || !content}>
              {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : "Salvar Template"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
