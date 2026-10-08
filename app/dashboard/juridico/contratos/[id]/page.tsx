"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink, Download, RefreshCw, Loader2 } from "lucide-react";

interface ContractDetail {
  id: string;
  client_name: string;
  client_id: string;
  template_name: string;
  template_id: string;
  status: string;
  value: number;
  autentique_id: string;
  sign_link: string;
  pdf_url: string;
  signed_at: string;
  filled_content: string;
  variables: Record<string, string>;
  created_at: string;
  updated_at: string;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  rascunho: { bg: "var(--bg-overlay)", color: "var(--text-secondary)", label: "Rascunho" },
  aguardando_assinatura: { bg: "var(--warning-light)", color: "var(--warning)", label: "Aguardando assinatura" },
  assinado: { bg: "var(--success-light)", color: "var(--success)", label: "Assinado" },
  cancelado: { bg: "var(--error-light)", color: "var(--error)", label: "Cancelado" },
};

export default function ContratoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    fetch(`/api/juridico/contratos/${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setContract(j.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleResendLink() {
    setResending(true);
    // In production, this would resend the sign link via WhatsApp
    setTimeout(() => setResending(false), 1500);
  }

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;
  if (!contract) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Contrato não encontrado</div>;

  const badge = STATUS_BADGE[contract.status] ?? STATUS_BADGE.rascunho;

  return (
    <div style={{ padding: "24px 32px" }}>
      <button
        onClick={() => router.push("/dashboard/juridico/contratos")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500, marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> Voltar para contratos
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Contrato - {contract.client_name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Criado em {contract.created_at ? new Date(contract.created_at).toLocaleDateString("pt-BR") : "—"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {contract.sign_link && contract.status === "aguardando_assinatura" && (
            <>
              <a href={contract.sign_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: "none" }}>
                <ExternalLink size={14} /> Abrir link de assinatura
              </a>
              <button className="btn btn-secondary" onClick={handleResendLink} disabled={resending}>
                {resending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
                Reenviar link
              </button>
            </>
          )}
          {contract.pdf_url && (
            <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <Download size={14} /> Download PDF
            </a>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Info Card */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Informações</div>
          {[
            { label: "Cliente", value: contract.client_name },
            { label: "Template", value: contract.template_name },
            { label: "Valor", value: `R$ ${(contract.value ?? 0).toLocaleString("pt-BR")}` },
            { label: "Autentique ID", value: contract.autentique_id || "—" },
            { label: "Assinado em", value: contract.signed_at ? new Date(contract.signed_at).toLocaleDateString("pt-BR") : "—" },
            { label: "Atualizado em", value: contract.updated_at ? new Date(contract.updated_at).toLocaleDateString("pt-BR") : "—" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Variables Card */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Variáveis preenchidas</div>
          {contract.variables && Object.keys(contract.variables).length > 0 ? (
            Object.entries(contract.variables).map(([key, value], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{`{{${key}}}`}</span>
                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{value || "—"}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "16px 0" }}>Nenhuma variável preenchida</div>
          )}
        </div>
      </div>

      {/* Content Preview */}
      {contract.filled_content && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <FileText size={16} color="var(--accent)" />
            <div className="card-title" style={{ marginBottom: 0 }}>Conteúdo do contrato</div>
          </div>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20,
            fontSize: 13,
            lineHeight: 1.8,
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
            maxHeight: 500,
            overflowY: "auto",
          }}>
            {contract.filled_content}
          </div>
        </div>
      )}
    </div>
  );
}
