"use client";

import { useEffect, useState } from "react";

interface Client { id: string; name: string; }

const WEBHOOKS = [
  {
    key:   "google",
    label: "Google Ads — Lead Form Extension",
    color: "#ea4335",
    path:  "/api/webhooks/google",
    steps: [
      "No Google Ads → Extensões → Formulário de lead",
      'Em "Webhook" cole a URL acima',
      'Em "Chave" use o valor de GOOGLE_WEBHOOK_KEY (configurado no Vercel)',
      'Campo customizado "client_id" com o ID do cliente para vincular o lead',
    ],
  },
  {
    key:   "meta",
    label: "Meta Ads — Facebook Lead Ads",
    color: "#1877f2",
    path:  "/api/webhooks/meta",
    steps: [
      "No Meta Business Suite → Configurações → Leads instantâneos",
      "Adicione o webhook com a URL acima",
      "Configure o Facebook Page ID e Page Token no cadastro do cliente",
      "Leads chegam automaticamente com os dados do formulário",
    ],
  },
  {
    key:   "evolution",
    label: "Evolution API — WhatsApp",
    color: "#25d366",
    path:  "/api/webhooks/evolution",
    steps: [
      "No painel Evolution API → Instâncias → selecione sua instância",
      "Em Webhooks, cole a URL acima",
      "Ative os eventos: MESSAGES_UPSERT, MESSAGES_UPDATE",
      "Configure EVOLUTION_SERVER_URL, EVOLUTION_INSTANCE e EVOLUTION_API_KEY no Vercel",
    ],
  },
];

export default function IntegracoesPage() {
  const [origin,   setOrigin]   = useState("");
  const [clients,  setClients]  = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [copied,   setCopied]   = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/clients").then((r) => r.json()).then((j) => setClients(j.data ?? []));
  }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const lpUrl       = `${origin}/lp?client_id=${clientId || "SEU_CLIENT_ID"}`;
  const pixelSnippet = clientId
    ? `<script>\n(function(){\n  var img = new Image();\n  img.src = "${origin}/api/pixel?cid=${clientId}&url=" + encodeURIComponent(window.location.href);\n})();\n</script>`
    : "Selecione um cliente para gerar o snippet.";

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔌 Integrações</h1>
          <p className="page-subtitle">Conecte plataformas de anúncios, WhatsApp e sites externos</p>
        </div>
      </div>

      {/* Webhooks */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Webhooks — URLs para conectar plataformas</span>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
          Cole essas URLs nas plataformas correspondentes. Os leads chegam automaticamente no sistema.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {WEBHOOKS.map(({ key, label, color, path, steps }) => {
            const url = `${origin}${path}`;
            return (
              <div
                key={key}
                style={{
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${color}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "14px 16px",
                  background: "var(--bg-surface)",
                }}
              >
                <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span className="font-semibold text-sm">{label}</span>
                </div>
                <div className="flex gap-2 items-center" style={{ marginBottom: 10 }}>
                  <code style={{
                    flex: 1, background: "var(--bg-base)", padding: "6px 10px",
                    borderRadius: "var(--radius)", fontSize: 12, wordBreak: "break-all",
                    color: "var(--text-secondary)", border: "1px solid var(--border)",
                  }}>
                    {url}
                  </code>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => copy(url, key)}
                  >
                    {copied === key ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.9 }}>
                  {steps.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Landing Page */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Landing Page white label</span>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: 14 }}>
          Cada cliente tem uma LP personalizada. Use nos anúncios no lugar do site.
        </p>
        <div className="flex gap-2 items-center" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <select className="select" style={{ maxWidth: 220 }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecione o cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {clientId && (
            <a href={lpUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              Visualizar →
            </a>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <code style={{ flex: 1, background: "var(--bg-base)", padding: "6px 10px", borderRadius: "var(--radius)", fontSize: 12, wordBreak: "break-all", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            {lpUrl}
          </code>
          <button
            className="btn btn-secondary btn-sm"
            style={{ flexShrink: 0 }}
            onClick={() => copy(lpUrl, "lp")}
            disabled={!clientId}
          >
            {copied === "lp" ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 8 }}>
          Adicione <code style={{ color: "var(--text-secondary)" }}>&utm_campaign=nome</code> no final para rastrear.
          Personalize em Clientes → 🖊️ LP.
        </p>
      </div>

      {/* Pixel */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Pixel de rastreamento — sites externos</span>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: 14 }}>
          Cole este snippet no site do cliente (antes do <code style={{ color: "var(--text-secondary)" }}>&lt;/body&gt;</code>) para rastrear visitantes e capturar o canal de origem.
        </p>
        <div className="flex gap-2 items-center" style={{ marginBottom: 12 }}>
          <select className="select" style={{ maxWidth: 220 }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecione o cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <pre style={{ background: "var(--bg-base)", color: "var(--text-secondary)", padding: "12px 16px", borderRadius: "var(--radius-lg)", fontSize: 12, overflowX: "auto", border: "1px solid var(--border)", margin: "0 0 10px" }}>
          {pixelSnippet}
        </pre>
        {clientId && (
          <button className="btn btn-secondary btn-sm" onClick={() => copy(pixelSnippet, "pixel")}>
            {copied === "pixel" ? "✓ Copiado" : "Copiar snippet"}
          </button>
        )}
      </div>
    </main>
  );
}
