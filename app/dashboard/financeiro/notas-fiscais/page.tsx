"use client";

import { useEffect, useState } from "react";
import { FileText, Download, XCircle, Plus, Loader2, X } from "lucide-react";

interface NFSe {
  id: string;
  numero?: string;
  client_name: string;
  amount: number;
  status: string;
  pdf_url?: string;
  created_at: string;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  emitida: { bg: "var(--success-light)", color: "var(--success)", label: "Emitida" },
  processando: { bg: "var(--warning-light)", color: "var(--warning)", label: "Processando" },
  cancelada: { bg: "var(--error-light)", color: "var(--error)", label: "Cancelada" },
  erro: { bg: "var(--error-light)", color: "var(--error)", label: "Erro" },
};

export default function NotasFiscaisPage() {
  const [notas, setNotas] = useState<NFSe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // NFSe data comes from financial_charges that have nfse_id
    fetch("/api/financeiro/cobrancas")
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const nfseList = (j.data as Record<string, unknown>[])
            .filter(c => c.nfse_id)
            .map(c => ({
              id: c.nfse_id as string,
              numero: c.nfse_numero as string | undefined,
              client_name: (c.client_name as string) || "",
              amount: (c.amount as number) ?? 0,
              status: (c.nfse_status as string) || "emitida",
              pdf_url: c.nfse_pdf_url as string | undefined,
              created_at: (c.paid_at as string) || (c.created_at as string) || "",
            }));
          setNotas(nfseList);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notas Fiscais (NFS-e)</h1>
          <p className="page-subtitle">{notas.length} nota{notas.length !== 1 ? "s" : ""} emitidas</p>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {notas.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                Nenhuma nota fiscal emitida. As notas são geradas automaticamente após confirmação de pagamento (requer Focus NFe configurado).
              </td></tr>
            ) : notas.map(n => {
              const badge = STATUS_BADGE[n.status] ?? STATUS_BADGE.emitida;
              return (
                <tr key={n.id}>
                  <td style={{ fontWeight: 600 }}>{n.numero || n.id.slice(0, 8)}</td>
                  <td>{n.client_name}</td>
                  <td style={{ fontWeight: 600 }}>R$ {(n.amount ?? 0).toLocaleString("pt-BR")}</td>
                  <td style={{ fontSize: 12 }}>{n.created_at ? new Date(n.created_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td>
                    <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td>
                    {n.pdf_url && (
                      <a href={n.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary" style={{ textDecoration: "none" }}>
                        <Download size={12} /> PDF
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {notas.length === 0 && (
        <div className="card" style={{ marginTop: 24, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <FileText size={18} color="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Como funciona?</span>
          </div>
          <ul style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Configure as variáveis FOCUS_NFE_TOKEN, COMPANY_CNPJ, COMPANY_IM no .env</li>
            <li>Quando uma cobrança for paga (webhook Cora), a NFS-e será emitida automaticamente</li>
            <li>O PDF da nota fica disponível para download</li>
            <li>Notas podem ser canceladas em até 24h</li>
          </ul>
        </div>
      )}
    </div>
  );
}
