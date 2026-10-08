"use client";

import { useEffect, useState } from "react";

interface Proposal {
  id:              string;
  proposal_number: string;
  service_title:   string;
  service_desc?:   string;
  amount:          number;
  status:          string;
  lead_name:       string;
  lead_phone:      string;
  lead_id:         string;
  created_at:      string;
  paid_at?:        string;
  sent_at?:        string;
  sign_link?:      string;
  pix_code?:       string;
  boleto_url?:     string;
  payment_terms?:  string;
  notes?:          string;
  valid_until?:    string;
}

interface Client { id: string; name: string; }

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending_send:       { label: "Aguardando envio",    cls: "badge-warning" },
  sent:               { label: "Proposta enviada",    cls: "badge-success" },
  signed:             { label: "Aceito",              cls: "badge-accent"  },
  awaiting_payment:   { label: "Aguard. pagamento",   cls: "badge-warning" },
  paid:               { label: "Pago",                cls: "badge-success" },
  // legado
  awaiting_signature: { label: "Aguard. assinatura",  cls: "badge-warning" },
};

export default function PropostasPage() {
  const [proposals,    setProposals]    = useState<Proposal[]>([]);
  const [clients,      setClients]      = useState<Client[]>([]);
  const [clientId,     setClientId]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState<string | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Proposal | null>(null);
  const [editForm,   setEditForm]   = useState({ service_title: "", service_desc: "", amount: "", payment_terms: "", notes: "" });
  const [saving,     setSaving]     = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  async function fetchProposals(cid = clientId) {
    setLoading(true);
    try {
      const qs   = cid ? `?client_id=${cid}` : "";
      const res  = await fetch(`/api/proposals/all${qs}`);
      const json = await res.json();
      setProposals(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((j) => setClients(j.data ?? []));
    fetchProposals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function openEdit(p: Proposal) {
    setEditTarget(p);
    setEditForm({
      service_title:  p.service_title   ?? "",
      service_desc:   p.service_desc    ?? "",
      amount:         String(p.amount   ?? ""),
      payment_terms:  p.payment_terms   ?? "",
      notes:          p.notes           ?? "",
    });
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await fetch(`/api/proposals/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:        "edit",
          service_title: editForm.service_title,
          service_desc:  editForm.service_desc,
          amount:        parseFloat(editForm.amount),
          payment_terms: editForm.payment_terms,
          notes:         editForm.notes,
        }),
      });
      setEditTarget(null);
      fetchProposals();
    } finally {
      setSaving(false);
    }
  }

  async function patchAction(id: string, action: string) {
    await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    fetchProposals();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/proposals/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchProposals();
    } finally {
      setDeleting(false);
    }
  }

  const visible    = proposals.filter((p) => !filterStatus || p.status === filterStatus);
  const totalPaid  = proposals.filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalPend  = proposals.filter((p) => p.status === "awaiting_payment").reduce((s, p) => s + (p.amount ?? 0), 0);
  const countPaid  = proposals.filter((p) => p.status === "paid").length;
  const countSigned = proposals.filter((p) => ["signed", "sent"].includes(p.status)).length;

  function fmt(n: number) {
    return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">💼 Propostas</h1>
          <p className="page-subtitle">{proposals.length} proposta(s) no total</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{proposals.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{countPaid}</div>
          <div className="stat-label">Pagas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--accent)" }}>{countSigned}</div>
          <div className="stat-label">Assinadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{fmt(totalPaid)}</div>
          <div className="stat-label">Receita recebida</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--warning)" }}>{fmt(totalPend)}</div>
          <div className="stat-label">Aguardando pgto.</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <select
          className="select"
          style={{ minWidth: 180 }}
          value={clientId}
          onChange={(e) => { setClientId(e.target.value); fetchProposals(e.target.value); }}
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="select"
          style={{ minWidth: 180 }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-3" style={{ padding: "24px 0" }}>
          <div className="spinner" />
          <span className="text-secondary text-sm">Carregando propostas...</span>
        </div>
      )}

      {!loading && (
        <>
          {visible.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💼</div>
              <div className="empty-state-title">Nenhuma proposta encontrada</div>
              <div className="empty-state-text">Tente mudar os filtros ou aguarde novas propostas.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    {["Nº", "Lead", "Serviço", "Valor", "Status", "Data", "Ações"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const st = STATUS_META[p.status] ?? { label: p.status, cls: "badge-default" };
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{p.proposal_number}</td>
                        <td>
                          <a
                            href={`/dashboard/leads/${p.lead_id}`}
                            className="font-semibold text-sm"
                            style={{ color: "var(--accent)", textDecoration: "none" }}
                          >
                            {p.lead_name}
                          </a>
                          <div className="text-xs text-muted">{p.lead_phone}</div>
                        </td>
                        <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.service_title}>
                          {p.service_title}
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--success)", whiteSpace: "nowrap" }}>
                          {fmt(p.amount ?? 0)}
                        </td>
                        <td>
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="text-xs text-muted" style={{ whiteSpace: "nowrap" }}>
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          {p.paid_at && (
                            <div style={{ color: "var(--success)" }}>
                              Pago: {new Date(p.paid_at).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1" style={{ flexWrap: "wrap" }}>

                            {/* Editar */}
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => openEdit(p)}
                              title="Editar proposta"
                            >
                              ✏️
                            </button>

                            {/* Gerar PDF */}
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => window.open(`/dashboard/propostas/${p.id}/imprimir`, "_blank")}
                              title="Visualizar / Gerar PDF"
                            >
                              📄 PDF
                            </button>

                            {/* Enviar via WhatsApp (pending_send) */}
                            {p.status === "pending_send" && (
                              <button
                                className="btn btn-ghost btn-xs"
                                style={{ color: "var(--accent)" }}
                                onClick={() => patchAction(p.id, "send_whatsapp")}
                                title="Enviar proposta via WhatsApp"
                              >
                                📤 Enviar
                              </button>
                            )}

                            {/* Marcar como Pago */}
                            {p.status !== "paid" && (
                              <button
                                className="btn btn-ghost btn-xs"
                                style={{ color: "var(--success)" }}
                                onClick={() => patchAction(p.id, "mark_paid")}
                                title="Marcar como pago"
                              >
                                ✅ Pago
                              </button>
                            )}

                            {/* Link assinatura */}
                            {p.sign_link && p.status === "awaiting_signature" && (
                              <a
                                href={p.sign_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-xs"
                              >
                                ✍️ Link
                              </a>
                            )}

                            {/* PIX */}
                            {p.pix_code && (
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => copy(p.pix_code!, `pix-${p.id}`)}
                              >
                                {copied === `pix-${p.id}` ? "✓ Copiado" : "📋 PIX"}
                              </button>
                            )}

                            {/* Excluir */}
                            <button
                              className="btn btn-ghost btn-xs"
                              style={{ color: "var(--error, #ef4444)" }}
                              onClick={() => setDeleteTarget(p)}
                              title="Excluir proposta"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Modal de Edição ── */}
      {editTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, margin: 16 }}>
            <div className="card-header">
              <span className="card-title">✏️ Editar Proposta {editTarget.proposal_number}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setEditTarget(null)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="input-label">Serviço / Título *</label>
                <input
                  className="input"
                  value={editForm.service_title}
                  onChange={(e) => setEditForm((f) => ({ ...f, service_title: e.target.value }))}
                />
              </div>
              <div>
                <label className="input-label">Descrição do serviço</label>
                <textarea
                  className="input"
                  rows={4}
                  style={{ resize: "vertical" }}
                  value={editForm.service_desc}
                  onChange={(e) => setEditForm((f) => ({ ...f, service_desc: e.target.value }))}
                  placeholder="Descreva os serviços, entregáveis, prazo..."
                />
              </div>
              <div>
                <label className="input-label">Valor (R$) *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="input-label">Condições de pagamento</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  {["À vista", "50% entrada + 50% na entrega", "50% entrada + 50% em 30 dias", "Parcelado 2x", "Parcelado 3x", "Parcelado 6x", "Parcelado 12x", "Recorrente mensal"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, payment_terms: preset }))}
                      style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20,
                        border: `1px solid ${editForm.payment_terms === preset ? "var(--accent)" : "var(--border)"}`,
                        background: editForm.payment_terms === preset ? "var(--accent)" : "transparent",
                        color: editForm.payment_terms === preset ? "#fff" : "var(--text-secondary)",
                        cursor: "pointer", lineHeight: "1.6",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  value={editForm.payment_terms}
                  onChange={(e) => setEditForm((f) => ({ ...f, payment_terms: e.target.value }))}
                  placeholder="Ex: 50% entrada + 50% na entrega"
                />
              </div>
              <div>
                <label className="input-label">Observações</label>
                <textarea
                  className="input"
                  rows={3}
                  style={{ resize: "vertical" }}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Observações internas ou para o cliente..."
                />
              </div>

              <div className="flex gap-2" style={{ marginTop: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={saving}
                  onClick={saveEdit}
                >
                  {saving ? "Salvando..." : "💾 Salvar alterações"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => window.open(`/dashboard/propostas/${editTarget.id}/imprimir`, "_blank")}
                >
                  📄 Ver PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmação de Exclusão ── */}
      {deleteTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 400, margin: 16 }}>
            <div className="card-header">
              <span className="card-title">🗑️ Excluir proposta?</span>
            </div>
            <p className="text-sm text-secondary" style={{ marginBottom: 20 }}>
              Proposta <strong>{deleteTarget.proposal_number}</strong> de <strong>{deleteTarget.lead_name}</strong> —{" "}
              {fmt(deleteTarget.amount ?? 0)}.<br />
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--error, #ef4444)", borderColor: "var(--error, #ef4444)" }}
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? "Excluindo..." : "Confirmar exclusão"}
              </button>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
