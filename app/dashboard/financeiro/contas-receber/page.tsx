"use client";

import { useEffect, useState } from "react";
import { Plus, Search, X, Loader2, MessageSquare } from "lucide-react";

interface Charge {
  id: string;
  client_id: string;
  client_name: string;
  description: string;
  amount: number;
  status: string;
  payment_type: string;
  due_date: string;
  pix_code: string;
  boleto_url: string;
  created_at: string;
}

interface AgencyClient {
  id: string;
  name: string;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pendente: { bg: "var(--warning-light)", color: "var(--warning)", label: "Pendente" },
  pago: { bg: "var(--success-light)", color: "var(--success)", label: "Pago" },
  vencido: { bg: "var(--error-light)", color: "var(--error)", label: "Vencido" },
  cancelado: { bg: "var(--bg-overlay)", color: "var(--text-muted)", label: "Cancelado" },
};

export default function ContasReceberPage() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formClient, setFormClient] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaymentType, setFormPaymentType] = useState("pix");

  useEffect(() => {
    fetch("/api/financeiro/cobrancas")
      .then(r => r.json())
      .then(j => { if (j.success) setCharges(markOverdue(j.data)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function markOverdue(list: Charge[]): Charge[] {
    const today = new Date().toISOString().slice(0, 10);
    return list.map(c => ({
      ...c,
      status: c.status === "pendente" && c.due_date < today ? "vencido" : c.status,
    }));
  }

  function openModal() {
    setShowModal(true);
    fetch("/api/agencia/clientes").then(r => r.json()).then(j => {
      if (j.success) setClients(j.data);
    }).catch(console.error);
  }

  async function createCharge() {
    if (!formClient || !formDesc || !formAmount || !formDueDate) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === formClient);
      const r = await fetch("/api/financeiro/cobrancas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: formClient,
          client_name: client?.name ?? "",
          description: formDesc,
          amount: Number(formAmount),
          due_date: formDueDate,
          payment_type: formPaymentType,
        }),
      });
      const j = await r.json();
      if (j.success) {
        setCharges(prev => [j.data, ...prev]);
        setShowModal(false);
        setFormClient(""); setFormDesc(""); setFormAmount(""); setFormDueDate("");
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function sendReminder(charge: Charge) {
    try {
      await fetch("/api/naia/mensagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "",
          message: `Olá! Lembrete de cobrança pendente: ${charge.description} - R$ ${charge.amount.toLocaleString("pt-BR")}. Vencimento: ${new Date(charge.due_date + "T12:00:00").toLocaleDateString("pt-BR")}`,
        }),
      });
    } catch (err) { console.error(err); }
  }

  const filtered = charges.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search && !c.client_name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas a Receber</h1>
          <p className="page-subtitle">{charges.length} cobrança{charges.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}><Plus size={15} /> Nova Cobrança</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-muted)" }} />
          <input className="input" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Tipo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Nenhuma cobrança encontrada</td></tr>
            ) : filtered.map(c => {
              const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.pendente;
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.client_name || "—"}</td>
                  <td>{c.description}</td>
                  <td style={{ fontWeight: 600 }}>R$ {(c.amount ?? 0).toLocaleString("pt-BR")}</td>
                  <td style={{ fontSize: 12 }}>{c.due_date ? new Date(c.due_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td>
                    <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, textTransform: "uppercase" }}>{c.payment_type}</td>
                  <td>
                    {(c.status === "pendente" || c.status === "vencido") && (
                      <button className="btn btn-sm btn-secondary" onClick={() => sendReminder(c)} title="Enviar lembrete WhatsApp">
                        <MessageSquare size={12} /> Lembrete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>Nova Cobrança</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
            </div>
            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Cliente</label>
              <select className="select" value={formClient} onChange={e => setFormClient(e.target.value)}>
                <option value="">Selecione</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Descrição</label>
              <input className="input" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Ex: Mensalidade Social Media" />
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="input-group">
                <label className="input-label">Valor (R$)</label>
                <input className="input" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="input-group">
                <label className="input-label">Vencimento</label>
                <input className="input" type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">Tipo de pagamento</label>
              <select className="select" value={formPaymentType} onChange={e => setFormPaymentType(e.target.value)}>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", minHeight: 42 }} onClick={createCharge} disabled={saving || !formClient || !formDesc || !formAmount || !formDueDate}>
              {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Criando...</> : "Criar Cobrança"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
