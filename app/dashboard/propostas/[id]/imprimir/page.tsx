"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ProposalPrint {
  id: string;
  proposal_number: string;
  service_title: string;
  service_desc?: string;
  amount: number;
  payment_terms?: string;
  notes?: string;
  created_at: string;
  valid_until?: string;
  created_by?: string;
  client_id?: string;
  lead: { name?: string; phone?: string; email?: string; company?: string };
}

interface CompanySettings {
  company_name?: string;
  cnpj?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  website?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  pix_key?: string;
  pix_holder?: string;
  pix_document?: string;
  primary_color?: string;
  logo_base64?: string;
}

export default function ImprimirPropostaPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal,  setProposal]  = useState<ProposalPrint | null>(null);
  const [settings,  setSettings]  = useState<CompanySettings>({});
  const [error,     setError]     = useState("");

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then(r => r.json())
      .then(j => {
        if (!j.success) { setError(j.error ?? "Erro."); return; }
        setProposal(j.data);
        const cid = j.data.client_id;
        // Tenta com client_id da proposta; se vazio usa sessão atual
        const settingsUrl = cid ? `/api/settings?client_id=${cid}` : `/api/settings`;
        fetch(settingsUrl)
          .then(r => r.json())
          .then(s => { if (s.success) setSettings(s.data ?? {}); })
          .catch(() => {});
      })
      .catch(() => setError("Erro de rede."));
  }, [id]);

  if (error)    return <div style={{ padding: 60, fontFamily: "sans-serif", color: "#e00" }}>Erro: {error}</div>;
  if (!proposal) return <div style={{ padding: 60, fontFamily: "sans-serif", color: "#999" }}>Carregando...</div>;

  const accentColor = settings.primary_color ?? "#E31E24";
  const fmt   = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const date  = new Date(proposal.created_at).toLocaleDateString("pt-BR").replace(/\//g, ".");
  const valid = proposal.valid_until
    ? new Date(proposal.valid_until).toLocaleDateString("pt-BR").replace(/\//g, ".")
    : "—";

  const bullets = (proposal.service_desc ?? "").split("\n").map(l => l.trim()).filter(Boolean);
  const clientLabel = [proposal.lead.name, proposal.lead.company].filter(Boolean).join(" / ");

  // payment_terms: line 1 = condição, line 2 = forma (override) or build from settings
  const payLines = (proposal.payment_terms ?? "").split("\n").map(l => l.trim()).filter(Boolean);
  const condicao = payLines[0] ?? "A vista";
  const formaFromField = payLines[1] ?? "";
  const formaFromSettings = settings.pix_holder
    ? `Pix - ${settings.pix_holder}${settings.pix_document ? " - " + settings.pix_document : ""}${settings.pix_key ? " - " + settings.pix_key : ""}`
    : "";
  const forma = formaFromField || formaFromSettings;

  // Footer address line
  const addrLine1 = [settings.address_street, settings.address_number, settings.address_complement]
    .filter(Boolean).join(", ");
  const addrLine2 = [
    settings.address_neighborhood,
    settings.address_city && settings.address_state ? `${settings.address_city}/${settings.address_state}` : settings.address_city,
    settings.address_zip ? `CEP ${settings.address_zip}` : "",
  ].filter(Boolean).join(" - ");

  const companyName = settings.company_name ?? "beace";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; }

        .page {
          width: 210mm; min-height: 297mm; margin: 0 auto;
          background: #fff; position: relative; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .header { padding: 28px 40px 0 40px; position: relative; z-index: 2; min-height: 90px; display: flex; align-items: center; }
        .logo-img  { max-height: 80px; max-width: 280px; object-fit: contain; }
        .logo-text {
          font-size: 48px; font-weight: 900; letter-spacing: -0.02em;
          color: #1a1a1a; line-height: 1; font-family: 'Nunito', sans-serif;
          display: flex; align-items: center;
        }
        .logo-dot {
          display: inline-block; width: 10px; height: 10px;
          background: ${accentColor}; border-radius: 50%;
          margin-left: 1px; position: relative; top: -6px;
        }
        .subheader { text-align: center; padding: 16px 40px 24px; }
        .subheader-company { font-size: 13px; color: #1a1a1a; margin-bottom: 3px; }
        .subheader-title   { font-size: 13px; font-weight: 800; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.01em; }
        .body { padding: 8px 48px 40px; flex: 1; }
        .ac-line { margin-bottom: 22px; font-size: 13px; }
        .ac-label { color: ${accentColor}; font-weight: 800; }
        .ac-name  { font-weight: 700; }
        .scenario { font-size: 13px; font-weight: 800; margin-bottom: 14px; }
        .services-label { font-size: 13px; margin-bottom: 12px; }
        .bullet-list { list-style: none; margin: 0 0 24px 16px; display: flex; flex-direction: column; gap: 10px; }
        .bullet-list li { font-size: 13px; font-weight: 700; display: flex; gap: 8px; align-items: flex-start; }
        .bullet-list li::before { content: "●"; font-size: 11px; margin-top: 2px; flex-shrink: 0; }
        .cronograma-label { font-size: 13px; font-weight: 800; margin-bottom: 6px; }
        .cronograma-text  { font-size: 13px; line-height: 1.8; margin-bottom: 28px; white-space: pre-wrap; }
        .cost-row  { display: flex; align-items: baseline; margin-bottom: 32px; font-size: 13px; }
        .cost-dots { flex: 1; border-bottom: 1.5px dotted #1a1a1a; margin: 0 4px 3px; min-width: 40px; }
        .cost-value { white-space: nowrap; font-weight: 700; }
        .info-block { display: flex; flex-direction: column; gap: 4px; font-size: 13px; margin-bottom: 24px; }
        .info-row   { display: flex; gap: 4px; }
        .info-key   { font-weight: 800; white-space: nowrap; }

        /* Footer */
        .footer { margin-top: auto; padding: 0 40px 20px; }
        .footer-lines { display: flex; align-items: center; margin-bottom: 12px; }
        .footer-line  { flex: 1; height: 1px; background: #1a1a1a; }
        .footer-icon  {
          width: 44px; height: 44px; border-radius: 50%; overflow: hidden;
          background: #1a1a1a; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin: 0 -1px;
        }
        .footer-icon img { width: 100%; height: 100%; object-fit: contain; padding: 6px; filter: brightness(0) invert(1); }
        .footer-icon-b   { color: #fff; font-size: 22px; font-weight: 900; font-family: 'Nunito', sans-serif; position: relative; }
        .footer-icon-dot { width: 6px; height: 6px; background: ${accentColor}; border-radius: 50%; position: absolute; bottom: 2px; right: -3px; }
        .footer-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; color: #1a1a1a; line-height: 1.7; }
        .footer-col-center { text-align: center; }
        .footer-col-right  { text-align: right; }
        .f-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; color: #fff; font-weight: 700; margin-right: 4px; flex-shrink: 0; }
        .f-dot-red    { background: ${accentColor}; }
        .f-dot-dark   { background: #555; }

        .controls { position: fixed; top: 20px; right: 20px; z-index: 999; display: flex; gap: 10px; }
        @media print {
          .controls { display: none !important; }
          body { background: #fff; }
          .page { width: 100%; min-height: 100vh; margin: 0; box-shadow: none; }
          @page { margin: 0; size: A4; }
        }
        @media screen {
          body { background: #d0d0d8; padding: 40px 0; }
          .page { box-shadow: 0 4px 40px rgba(0,0,0,0.18); border-radius: 2px; }
        }
      `}</style>

      <div className="controls">
        <button onClick={() => window.print()}
          style={{ background: accentColor, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          🖨️ Imprimir / Salvar PDF
        </button>
        <button onClick={() => window.close()}
          style={{ background: "#fff", color: "#333", border: "1px solid #ccc", padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Fechar
        </button>
      </div>

      <div className="page">
        {/* Logo */}
        <div className="header">
          {settings.logo_base64 ? (
            <img src={settings.logo_base64} alt={companyName} className="logo-img" />
          ) : (
            <div className="logo-text">
              be<span style={{ position: "relative" }}>a<span className="logo-dot" /></span>ce
            </div>
          )}
        </div>

        {/* Subheader */}
        <div className="subheader">
          <div className="subheader-company">
            {companyName}{settings.address_city && settings.address_state ? `, ${settings.address_city}/${settings.address_state}` : ""}
          </div>
          <div className="subheader-title">
            PROPOSTA DE PRESTAÇÃO DE SERVIÇOS - Nº {proposal.proposal_number}
          </div>
        </div>

        {/* Corpo */}
        <div className="body">
          <div className="ac-line">
            <span className="ac-label">A/C: </span>
            <span className="ac-name">{clientLabel || "—"}</span>
          </div>

          <div className="scenario">{proposal.service_title}:</div>

          {bullets.length > 0 && (
            <>
              <div className="services-label">Serviços a serem executados:</div>
              <ul className="bullet-list">
                {bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </>
          )}

          {proposal.notes && (
            <>
              <div className="cronograma-label">Cronograma de desenvolvimento:</div>
              <div className="cronograma-text">{proposal.notes}</div>
            </>
          )}

          <div className="cost-row">
            <span>Custo total do Projeto + nota fiscal:</span>
            <span className="cost-dots" />
            <span className="cost-value">{fmt(proposal.amount ?? 0)}</span>
          </div>

          <div className="info-block">
            <div className="info-row"><span className="info-key">Data:</span><span> {date}</span></div>
            <div className="info-row"><span className="info-key">Prazos:</span><span> {valid}</span></div>
            <div className="info-row"><span className="info-key">Condição de Pagto:</span><span> {condicao}</span></div>
            {forma && <div className="info-row"><span className="info-key">Forma de Pagto:</span><span> {forma}</span></div>}
          </div>
        </div>

        {/* Rodapé */}
        <div className="footer">
          <div className="footer-lines">
            <div className="footer-line" />
            <div className="footer-icon">
              {settings.logo_base64 ? (
                <img src={settings.logo_base64} alt={companyName} />
              ) : (
                <span className="footer-icon-b">b<span className="footer-icon-dot" /></span>
              )}
            </div>
            <div className="footer-line" />
          </div>
          <div className="footer-cols">
            {/* Telefones */}
            <div>
              {settings.phone1 && <div><span className="f-dot f-dot-red">✆</span>{settings.phone1}</div>}
              {settings.phone2 && <div><span className="f-dot f-dot-red">◎</span>{settings.phone2}</div>}
            </div>
            {/* Web */}
            <div className="footer-col-center">
              {settings.website && <div><span className="f-dot f-dot-dark">⊕</span>{settings.website}</div>}
              {settings.email   && <div><span className="f-dot f-dot-dark">✉</span>{settings.email}</div>}
            </div>
            {/* Endereço */}
            <div className="footer-col-right">
              {addrLine1 && <div>{addrLine1}</div>}
              {addrLine2 && <div>{addrLine2}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
