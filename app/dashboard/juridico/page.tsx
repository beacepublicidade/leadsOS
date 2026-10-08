"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, FileText, Plus, ArrowRight, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface Contract {
  id: string;
  client_name: string;
  template_name: string;
  status: string;
  value: number;
  sign_link: string;
  created_at: string;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  rascunho: { bg: "var(--bg-overlay)", color: "var(--text-secondary)", label: "Rascunho" },
  aguardando_assinatura: { bg: "var(--warning-light)", color: "var(--warning)", label: "Aguardando assinatura" },
  assinado: { bg: "var(--success-light)", color: "var(--success)", label: "Assinado" },
  cancelado: { bg: "var(--error-light)", color: "var(--error)", label: "Cancelado" },
};

export default function JuridicoPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/juridico/contratos")
      .then(r => r.json())
      .then(j => { if (j.success) setContracts(j.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = contracts.length;
  const assinados = contracts.filter(c => c.status === "assinado").length;
  const aguardando = contracts.filter(c => c.status === "aguardando_assinatura").length;
  const valorTotal = contracts.filter(c => c.status === "assinado").reduce((s, c) => s + (c.value ?? 0), 0);

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>Juridico</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>Contratos e templates de documentos</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/juridico/contratos")}
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={15} /> Novo Contrato
        </button>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { icon: FileText, label: "Total contratos", value: total, iconBg: "rgba(124,58,237,0.15)", iconColor: "#7c3aed" },
          { icon: CheckCircle2, label: "Assinados", value: assinados, iconBg: "rgba(34,197,94,0.15)", iconColor: "#22c55e" },
          { icon: Clock, label: "Aguardando assinatura", value: aguardando, iconBg: "rgba(245,158,11,0.15)", iconColor: "#f59e0b" },
          { icon: FileCheck2, label: "Valor total assinados", value: `R$ ${valorTotal.toLocaleString("pt-BR")}`, iconBg: "rgba(59,130,246,0.15)", iconColor: "#3b82f6" },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon" style={{ background: kpi.iconBg }}>
              <kpi.icon size={18} color={kpi.iconColor} strokeWidth={2} />
            </div>
            <div className="kpi-value" style={{ fontSize: typeof kpi.value === "string" ? 22 : 30 }}>{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <button
          onClick={() => router.push("/dashboard/juridico/contratos")}
          className="card"
          style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border)", background: "var(--bg-elevated)", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={18} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Contratos</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Gerenciar todos os contratos</div>
            </div>
          </div>
          <ArrowRight size={16} color="var(--text-muted)" />
        </button>
        <button
          onClick={() => router.push("/dashboard/juridico/templates")}
          className="card"
          style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border)", background: "var(--bg-elevated)", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileCheck2 size={18} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Templates</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Modelos de contrato</div>
            </div>
          </div>
          <ArrowRight size={16} color="var(--text-muted)" />
        </button>
      </div>

      {/* Contratos recentes */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Contratos recentes</div>
          <a href="/dashboard/juridico/contratos" style={{ fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
            Ver todos <ArrowRight size={12} />
          </a>
        </div>
        {contracts.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 0" }}>
            <AlertTriangle size={28} style={{ opacity: 0.4, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Nenhum contrato ainda</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Crie um template e depois gere seu primeiro contrato</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {contracts.slice(0, 5).map(c => {
                  const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.rascunho;
                  return (
                    <tr key={c.id} onClick={() => router.push(`/dashboard/juridico/contratos/${c.id}`)} style={{ cursor: "pointer" }}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
