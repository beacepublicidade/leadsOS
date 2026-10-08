"use client";

import { useEffect, useState } from "react";

interface BeaceService { id: string; name: string; description: string; }
interface Client { id: string; name: string; }

interface Resultado {
  empresa:      string;
  phone?:       string;
  score?:       number;
  qualificado?: boolean;
  duplicado?:   boolean;
  dores?:       string[];
  mensagem?:    string;
  enviado?:     boolean;
  error?:       string;
  lead_id?:     string;
}

interface ProspecaoResult {
  total_encontrados: number;
  qualificados:      number;
  enviados:          number;
  resultados:        Resultado[];
}

const PROGRESS_STEPS = [
  "Conectando ao Google Maps...",
  "Buscando empresas no nicho...",
  "Analisando perfis com IA...",
  "Qualificando leads...",
  "Criando contatos no pipeline...",
];

export default function ProspecaoPage() {
  const [clients,    setClients]    = useState<Client[]>([]);
  const [services,   setServices]   = useState<BeaceService[]>([]);
  const [clientId,   setClientId]   = useState("");
  const [nicho,      setNicho]      = useState("");
  const [cidade,     setCidade]     = useState("");
  const [limite,     setLimite]     = useState("20");
  const [modo,       setModo]       = useState<"automatico" | "pacote">("automatico");
  const [enviar,     setEnviar]     = useState(false);
  const [running,    setRunning]    = useState(false);
  const [result,     setResult]     = useState<ProspecaoResult | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcDesc, setNewSvcDesc] = useState("");
  const [savingSvc,  setSavingSvc]  = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [showNaoQualificadas, setShowNaoQualificadas] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((j) => setClients(j.data ?? []));
    fetchServices();
  }, []);

  useEffect(() => {
    if (!running) { setProgressStep(0); return; }
    const interval = setInterval(() => {
      setProgressStep((prev) => (prev + 1) % PROGRESS_STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [running]);

  async function fetchServices() {
    const res  = await fetch("/api/prospecao/services");
    const json = await res.json();
    setServices(json.data ?? []);
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    setSavingSvc(true);
    try {
      await fetch("/api/prospecao/services", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSvcName, description: newSvcDesc }),
      });
      setNewSvcName(""); setNewSvcDesc("");
      await fetchServices();
    } finally {
      setSavingSvc(false);
    }
  }

  async function handleDeleteService(id: string) {
    await fetch(`/api/prospecao/services?id=${id}`, { method: "DELETE" });
    await fetchServices();
  }

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!nicho || !cidade) return;
    setRunning(true); setError(null); setResult(null);
    try {
      const res  = await fetch("/api/prospecao", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicho, cidade, limite: parseInt(limite), modo_oferta: modo, client_id: clientId, enviar }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao prospectar.");
    } finally {
      setRunning(false);
    }
  }

  function scoreColor(score?: number) {
    if (!score) return "var(--text-muted)";
    if (score >= 7) return "var(--success)";
    if (score >= 4) return "var(--warning)";
    return "var(--error)";
  }

  function scoreBorderColor(score?: number) {
    if (!score) return "var(--border)";
    if (score >= 7) return "#34d399";
    if (score >= 4) return "#f59e0b";
    return "#f87171";
  }

  const qualificadas = result?.resultados.filter((r) => r.qualificado) ?? [];
  const naoQualificadas = result?.resultados.filter((r) => !r.qualificado) ?? [];
  const taxaQualificacao = result ? Math.round((result.qualificados / Math.max(result.total_encontrados, 1)) * 100) : 0;

  return (
    <main className="page-container">
      <style>{`
        @keyframes radar-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .radar-icon { animation: radar-spin 1.2s linear infinite; display: inline-block; }
        .dot-1 { animation: pulse-dot 1.4s ease-in-out infinite; }
        .dot-2 { animation: pulse-dot 1.4s ease-in-out 0.2s infinite; }
        .dot-3 { animation: pulse-dot 1.4s ease-in-out 0.4s infinite; }
        .prosp-card:hover { border-color: var(--border-strong) !important; }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">🎯 Prospecção Ativa</h1>
          <p className="page-subtitle">Busca e qualificação automática de empresas com IA</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ── Painel esquerdo ── */}
        <div style={{ flex: "0 0 360px", minWidth: "min(320px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Formulário */}
          <div className="card" style={{ border: "1px solid var(--border)" }}>
            <div className="card-header" style={{ borderBottom: "1px solid var(--border)", marginBottom: 16, paddingBottom: 12 }}>
              <span className="card-title" style={{ fontSize: 15, fontWeight: 700 }}>Nova Prospecção</span>
            </div>

            <form onSubmit={handleRun} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="input-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>🏢</span> Nicho *
                </label>
                <input required className="input" value={nicho} onChange={(e) => setNicho(e.target.value)} placeholder="Ex: escritório de advocacia" />
              </div>

              <div>
                <label className="input-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>📍</span> Cidade / Região *
                </label>
                <input required className="input" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: São Paulo SP" />
              </div>

              <div>
                <label className="input-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>#</span> Limite de empresas
                </label>
                <select className="select" value={limite} onChange={(e) => setLimite(e.target.value)}>
                  {[2, 3, 5, 10, 20, 30, 50].map((n) => (
                    <option key={n} value={n}>{n} empresa{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>👤</span> Vincular ao cliente
                </label>
                <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Sem cliente específico</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="input-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>⚡</span> Modo de oferta
                </label>
                <select className="select" value={modo} onChange={(e) => setModo(e.target.value as "automatico" | "pacote")}>
                  <option value="automatico">Automático (IA gera oferta livre)</option>
                  <option value="pacote">Pacote (usa serviços cadastrados)</option>
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", color: "var(--text-secondary)", padding: "10px 12px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <input type="checkbox" checked={enviar} onChange={(e) => setEnviar(e.target.checked)} style={{ accentColor: "var(--accent)", width: 16, height: 16 }} />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Enviar via WhatsApp</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Disparo automático ao qualificar</div>
                </div>
              </label>

              {error && (
                <div style={{ padding: "10px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={running}
                style={{
                  background: running ? "var(--bg-surface)" : "var(--accent)",
                  color: running ? "var(--text-muted)" : "#0d0d0d",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: running ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "opacity 0.2s",
                  width: "100%",
                }}
              >
                {running ? (
                  <>
                    <span className="radar-icon" style={{ fontSize: 16 }}>◎</span>
                    Prospectando...
                  </>
                ) : (
                  <>🚀 Iniciar Prospecção</>
                )}
              </button>
            </form>
          </div>

          {/* Catálogo de serviços */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: "1px solid var(--border)", marginBottom: 12, paddingBottom: 10 }}>
              <span className="card-title" style={{ fontSize: 13 }}>Catálogo de Serviços</span>
            </div>
            <p className="text-xs text-muted" style={{ marginBottom: 10 }}>
              Usado no modo Pacote — a IA menciona na oferta.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {services.length === 0 && (
                <p className="text-xs text-muted">Nenhum serviço cadastrado.</p>
              )}
              {services.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "8px 10px", background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.description}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)", flexShrink: 0, padding: "2px 6px" }} onClick={() => handleDeleteService(s.id)}>✕</button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddService} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input required className="input" value={newSvcName} onChange={(e) => setNewSvcName(e.target.value)} placeholder="Nome do serviço" style={{ fontSize: 12 }} />
              <input required className="input" value={newSvcDesc} onChange={(e) => setNewSvcDesc(e.target.value)} placeholder="Breve descrição" style={{ fontSize: 12 }} />
              <button type="submit" disabled={savingSvc} className="btn btn-secondary btn-sm">{savingSvc ? "..." : "+ Adicionar"}</button>
            </form>
          </div>
        </div>

        {/* ── Painel direito — resultados ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Estado: rodando */}
          {running && (
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "40px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                <span className="radar-icon">◎</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>
                Prospecção em andamento
              </div>
              <div style={{ fontSize: 13, color: "var(--accent)", marginBottom: 24, minHeight: 20 }}>
                {PROGRESS_STEPS[progressStep]}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i <= progressStep ? "var(--accent)" : "var(--border)", transition: "background 0.4s" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                <span className="dot-1" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} />
                <span className="dot-2" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} />
                <span className="dot-3" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} />
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 16 }}>Pode levar 30s–2 min dependendo do volume</p>
            </div>
          )}

          {/* Estado: resultado */}
          {result && !running && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Stats rápidos */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "Encontradas", value: result.total_encontrados, color: "var(--text-primary)" },
                  { label: "Qualificadas", value: result.qualificados, color: "var(--accent)" },
                  { label: "Enviadas", value: result.enviados, color: "var(--success)" },
                  { label: "Taxa", value: `${taxaQualificacao}%`, color: taxaQualificacao >= 50 ? "var(--success)" : taxaQualificacao >= 25 ? "var(--warning)" : "var(--error)" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ flex: "1 1 80px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Cards de empresas qualificadas */}
              {qualificadas.length === 0 && (
                <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "32px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Nenhuma empresa qualificada</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Tente ajustar o nicho ou a cidade</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                {qualificadas.map((r, i) => (
                  <div
                    key={i}
                    className="prosp-card"
                    style={{
                      background: "var(--bg-elevated)",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      borderLeft: `4px solid ${scoreBorderColor(r.score)}`,
                      padding: "14px 16px",
                      transition: "border-color 0.2s",
                    }}
                  >
                    {/* Empresa + score */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.3 }}>{r.empresa}</div>
                        {r.phone && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>📱 {r.phone}</div>}
                      </div>
                      {r.score !== undefined && (
                        <div style={{ background: "var(--bg-surface)", borderRadius: 8, padding: "4px 10px", textAlign: "center", flexShrink: 0, border: `1px solid ${scoreBorderColor(r.score)}` }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(r.score) }}>{r.score}</div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>score</div>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                      {r.duplicado && <span className="badge badge-warning" style={{ fontSize: 10 }}>Já na base</span>}
                      {r.enviado && <span className="badge badge-success" style={{ fontSize: 10 }}>✓ Enviado</span>}
                      {!r.enviado && !r.duplicado && <span className="badge badge-accent" style={{ fontSize: 10 }}>Novo lead</span>}
                    </div>

                    {/* Dores */}
                    {r.dores && r.dores.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                        {r.dores.map((d, j) => (
                          <span key={j} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(167,139,250,0.12)", color: "#a78bfa", borderRadius: 99, border: "1px solid rgba(167,139,250,0.2)" }}>{d}</span>
                        ))}
                      </div>
                    )}

                    {/* Mensagem colapsável */}
                    {r.mensagem && (
                      <details style={{ marginBottom: 10 }}>
                        <summary style={{ fontSize: 11, color: "var(--accent)", cursor: "pointer", userSelect: "none" }}>Ver mensagem gerada ▼</summary>
                        <pre style={{ background: "var(--bg-surface)", borderRadius: 6, padding: "8px 10px", fontSize: 11, whiteSpace: "pre-wrap", marginTop: 6, color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "inherit" }}>
                          {r.mensagem}
                        </pre>
                      </details>
                    )}

                    {r.lead_id && (
                      <a href={`/dashboard/leads/${r.lead_id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: "var(--accent)", padding: "4px 10px" }}>
                        Ver no pipeline →
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Não qualificadas (colapsável) */}
              {naoQualificadas.length > 0 && (
                <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  <button
                    onClick={() => setShowNaoQualificadas(!showNaoQualificadas)}
                    style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 12 }}
                  >
                    <span>Não qualificadas — {naoQualificadas.length} empresa{naoQualificadas.length > 1 ? "s" : ""} com score baixo</span>
                    <span>{showNaoQualificadas ? "▲" : "▼"}</span>
                  </button>
                  {showNaoQualificadas && (
                    <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                      {naoQualificadas.map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "var(--bg-base)", borderRadius: 6, border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.empresa}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>score {r.score ?? "—"}/10</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Estado vazio */}
          {!running && !result && (
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "60px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.6 }}>🎯</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)", marginBottom: 8 }}>Pronto para prospectar</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 340, margin: "0 auto" }}>
                Preencha o nicho e a cidade no painel ao lado e clique em Iniciar Prospecção. A IA vai buscar, qualificar e criar os leads automaticamente.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
