"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X, Loader2, FileText, ExternalLink } from "lucide-react";

interface Contract {
  id: string;
  client_name: string;
  client_id: string;
  template_id: string;
  template_name: string;
  status: string;
  value: number;
  sign_link: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  variables: string[];
}

interface AgencyClient {
  id: string;
  name: string;
  cnpj?: string;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  rascunho: { bg: "var(--bg-overlay)", color: "var(--text-secondary)", label: "Rascunho" },
  aguardando_assinatura: { bg: "var(--warning-light)", color: "var(--warning)", label: "Aguardando" },
  assinado: { bg: "var(--success-light)", color: "var(--success)", label: "Assinado" },
  cancelado: { bg: "var(--error-light)", color: "var(--error)", label: "Cancelado" },
};

const VARIABLE_LABELS: Record<string, string> = {
  CLIENTE_NOME: "Nome do cliente",
  CLIENTE_CNPJ: "CNPJ do cliente",
  CLIENTE_ENDERECO: "Endereço do cliente",
  CLIENTE_EMAIL: "Email do cliente",
  SERVICO_NOME: "Nome do serviço",
  SERVICO_VALOR: "Valor do serviço",
  SERVICO_DESCRICAO: "Descrição do serviço",
  DURACAO_MESES: "Duração (meses)",
  DATA_INICIO: "Data de início",
  DATA_TERMINO: "Data de término",
  FORMA_PAGAMENTO: "Forma de pagamento",
  DIA_VENCIMENTO: "Dia do vencimento",
  AGENCIA_NOME: "Nome da agência",
  AGENCIA_CNPJ: "CNPJ da agência",
  REPRESENTANTE_NOME: "Nome do representante",
};

export default function ContratosPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/juridico/contratos")
      .then(r => r.json())
      .then(j => { if (j.success) setContracts(j.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function openModal() {
    setShowModal(true);
    Promise.all([
      fetch("/api/juridico/templates").then(r => r.json()),
      fetch("/api/agencia/clientes").then(r => r.json()),
    ]).then(([t, c]) => {
      if (t.success) setTemplates(t.data);
      if (c.success) setClients(c.data);
    }).catch(console.error);
  }

  function handleTemplateChange(id: string) {
    setSelectedTemplate(id);
    const tpl = templates.find(t => t.id === id);
    if (tpl) {
      const initial: Record<string, string> = {};
      (tpl.variables ?? []).forEach((v: string) => { initial[v] = ""; });
      setVariableValues(initial);
    }
  }

  async function createContract() {
    if (!selectedClient || !selectedTemplate) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === selectedClient);
      const r = await fetch("/api/juridico/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClient,
          client_name: client?.name ?? "",
          template_id: selectedTemplate,
          variables: variableValues,
          value: Number(contractValue) || 0,
        }),
      });
      const j = await r.json();
      if (j.success) {
        setContracts(prev => [j.data, ...prev]);
        setShowModal(false);
        setSelectedClient("");
        setSelectedTemplate("");
        setContractValue("");
        setVariableValues({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const filtered = contracts.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search && !c.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contratos</h1>
          <p className="page-subtitle">{contracts.length} contrato{contracts.length !== 1 ? "s" : ""} cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={15} /> Novo Contrato
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-muted)" }} />
          <input
            className="input"
            placeholder="Buscar por cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="aguardando_assinatura">Aguardando assinatura</option>
          <option value="assinado">Assinado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Template</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Nenhum contrato encontrado</td></tr>
            ) : filtered.map(c => {
              const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.rascunho;
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.client_name}</td>
                  <td>{c.template_name}</td>
                  <td>
                    <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td>R$ {(c.value ?? 0).toLocaleString("pt-BR")}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => router.push(`/dashboard/juridico/contratos/${c.id}`)}>
                        <FileText size={12} /> Ver
                      </button>
                      {c.sign_link && (
                        <a href={c.sign_link} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary" style={{ textDecoration: "none" }}>
                          <ExternalLink size={12} /> Assinar
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Contrato */}
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>Novo Contrato</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Cliente da agência</label>
              <select className="select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                <option value="">Selecione um cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Template de contrato</label>
              <select className="select" value={selectedTemplate} onChange={e => handleTemplateChange(e.target.value)}>
                <option value="">Selecione um template</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 14 }}>
              <label className="input-label">Valor do contrato (R$)</label>
              <input className="input" type="number" placeholder="0" value={contractValue} onChange={e => setContractValue(e.target.value)} />
            </div>

            {/* Dynamic variables */}
            {Object.keys(variableValues).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Variáveis do template
                </div>
                {Object.keys(variableValues).map(key => (
                  <div key={key} className="input-group" style={{ marginBottom: 10 }}>
                    <label className="input-label">{VARIABLE_LABELS[key] ?? key}</label>
                    <input
                      className="input"
                      value={variableValues[key]}
                      onChange={e => setVariableValues(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`{{${key}}}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: "100%", minHeight: 42 }}
              onClick={createContract}
              disabled={saving || !selectedClient || !selectedTemplate}
            >
              {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Criando...</> : "Gerar e Enviar para Assinatura"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
