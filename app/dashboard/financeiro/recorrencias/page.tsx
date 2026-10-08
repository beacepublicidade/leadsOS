"use client";

import { useEffect, useState } from "react";
import { Plus, X, Loader2, Pause, Play, Zap } from "lucide-react";

interface Recurrence {
  id: string;
  client_id: string;
  client_name: string;
  description: string;
  amount: number;
  day_of_month: number;
  payment_type: string;
  status: string;
  next_charge_date: string;
  created_at: string;
}

interface AgencyClient { id: string; name: string; }

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  ativa: { bg: "var(--success-light)", color: "var(--success)", label: "Ativa" },
  pausada: { bg: "var(--warning-light)", color: "var(--warning)", label: "Pausada" },
  encerrada: { bg: "var(--bg-overlay)", color: "var(--text-muted)", label: "Encerrada" },
};

export default function RecorrenciasPage() {
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [saving, setSaving] = useState(false);
  const [formClient, setFormClient] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDay, setFormDay] = useState("10");
  const [formPaymentType, setFormPaymentType] = useState("pix");

  useEffect(() => {
    fetch("/api/financeiro/recorrencias")
      .then(r => r.json())
      .then(j => { if (j.success) setRecurrences(j.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function openModal() {
    setShowModal(true);
    fetch("/api/agencia/clientes").then(r => r.json()).then(j => {
      if (j.success) setClients(j.data);
    }).catch(console.error);
  }

  async function createRecurrence() {
    if (!formClient || !formDesc || !formAmount) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === formClient);
      const r = await fetch("/api/financeiro/recorrencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: formClient,
          client_name: client?.name ?? "",
          description: formDesc,
          amount: Number(formAmount),
          day_of_month: Number(formDay),
          payment_type: formPaymentType,
        }),
      });
      const j = await r.json();
      if (j.success) {
        setRecurrences(prev => [j.data, ...prev]);
        setShowModal(false);
        setFormClient(""); setFormDesc(""); setFormAmount("");
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function toggleStatus(rec: Recurrence) {
    const newStatus = rec.status === "ativa" ? "pausada" : "ativa";
    await fetch(`/api/financeiro/recorrencias/${rec.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setRecurrences(prev => prev.map(r => r.id === rec.id ? { ...r, status: newStatus } : r));
  }

  async function generateChargeNow(rec: Recurrence) {
    try {
      await fetch("/api/financeiro/cobrancas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: rec.client_id,
          client_name: rec.client_name,
          description: rec.description,
          amount: rec.amount,
          due_date: new Date().toISOString().slice(0, 10),
          payment_type: rec.payment_type,
          recurrence_id: rec.id,
        }),
      });
      alert("Cobrança gerada com sucesso!");
    } catch (err) { console.error(err); }
  }

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recorrências</h1>
          <p className="page-subtitle">{recurrences.length} recorrência{recurrences.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}><Plus size={15} /> Nova Recorrência</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Dia venc.</th>
              <th>Próximo venc.</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {recurrences.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Nenhuma recorrência cadastrada</td></tr>
            ) : recurrences.map(rec => {
              const badge = STATUS_BADGE[rec.status] ?? STATUS_BADGE.ativa;
              return (
                <tr key={rec.id}>
                  <td style={{ fontWeight: 600 }}>{rec.client_name}</td>
                  <td>{rec.description}</td>
                  <td style={{ fontWeight: 600 }}>R$ {(rec.amount ?? 0).toLocaleString("pt-BR")}</td>
                  <td>Dia {rec.day_of_month}</td>
                  <td style={{ fontSize: 12 }}>{rec.next_charge_date ? new Date(rec.next_charge_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td>
                    <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => toggleStatus(rec)}>
                        {rec.status === "ativa" ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Ativar</>}
                      </button>
                      {rec.status === "ativa" && (
                        <button className="btn btn-sm btn-primary" onClick={() => generateChargeNow(rec)}>
                          <Zap size={12} /> Cobrar agora
                        </button>
                      )}
                    </div>
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
              <h2 className="modal-title" style={{ marginBottom: 0 }}>Nova Recorrência</h2>
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
                <input className="input" type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Dia do vencimento (1-28)</label>
                <input className="input" type="number" min="1" max="28" value={formDay} onChange={e => setFormDay(e.target.value)} />
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">Tipo de pagamento</label>
              <select className="select" value={formPaymentType} onChange={e => setFormPaymentType(e.target.value)}>
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", minHeight: 42 }} onClick={createRecurrence} disabled={saving || !formClient || !formDesc || !formAmount}>
              {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Criando...</> : "Criar Recorrência"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
