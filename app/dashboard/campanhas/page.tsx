"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles, Send, CheckSquare, Square, Megaphone,
  Mail, MessageSquare, Users, ChevronDown, ChevronUp,
  Clock, CheckCircle2, XCircle, Loader2, RefreshCw,
  AlertCircle, BarChart2, Zap, ImagePlus, X,
} from "lucide-react";

/* ─────────────────────────────────────────────── types ─── */
interface CandidateLead {
  id:      string;
  name:    string;
  phone:   string;
  email:   string;
  source:  string;
  status:  string;
  score:   number;
  daysAgo: number;
  tags:    string[];
}

interface AnalysisResult {
  leads:          CandidateLead[];
  reasoning:      string;
  whatsapp_copy:  string;
  email_subject:  string;
  email_body:     string;
  priority_count: number;
}

interface Campaign {
  id:          string;
  name:        string;
  channel:     string;
  status:      string;
  sent:        number;
  failed:      number;
  created_at:  string;
  finished_at?: string;
  lead_ids:    string[];
}

type Channel = "whatsapp" | "email" | "both";

/* ─────────────────────────────────────── helpers ─── */
const STATUS_LABEL: Record<string, string> = {
  novo:     "Novo",
  contato:  "Contato",
  proposta: "Proposta",
  perdido:  "Perdido",
};

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  email:    "Email",
  both:     "Ambos",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#6b7280";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 600, color,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: color, flexShrink: 0,
      }} />
      {score}
    </span>
  );
}

/* ─────────────────────────────────────── main ─── */
export default function CampanhasPage() {
  /* analysis state */
  const [analyzing,  setAnalyzing]  = useState(false);
  const [analysis,   setAnalysis]   = useState<AnalysisResult | null>(null);
  const [analyzeErr, setAnalyzeErr] = useState("");

  /* selection + form */
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [channel,       setChannel]       = useState<Channel>("whatsapp");
  const [waCopy,        setWaCopy]        = useState("");
  const [emailSubject,  setEmailSubject]  = useState("");
  const [emailBody,     setEmailBody]     = useState("");
  const [campaignName,  setCampaignName]  = useState("");
  const [flyerBase64,   setFlyerBase64]   = useState<string | null>(null);
  const [flyerName,     setFlyerName]     = useState<string>("");
  const [flyerPreview,  setFlyerPreview]  = useState<string | null>(null);

  /* broadcast state */
  const [sending,     setSending]     = useState(false);
  const [sendResult,  setSendResult]  = useState<{ sent: number; failed: number; campaign_id: string } | null>(null);
  const [sendErr,     setSendErr]     = useState("");

  /* history */
  const [history,      setHistory]      = useState<Campaign[]>([]);
  const [loadingHist,  setLoadingHist]  = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);

  /* ── fetch campaign history ── */
  const fetchHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const r = await fetch("/api/campaigns");
      const j = await r.json();
      if (j.success) setHistory(j.campaigns ?? []);
    } catch { /* ignore */ }
    finally { setLoadingHist(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  /* ── analyze ── */
  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeErr("");
    setAnalysis(null);
    setSendResult(null);
    try {
      const r = await fetch("/api/campaigns/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? "Erro desconhecido");
      setAnalysis(j);
      /* pre-fill form with AI suggestions */
      setWaCopy(j.whatsapp_copy ?? "");
      setEmailSubject(j.email_subject ?? "");
      setEmailBody(j.email_body ?? "");
      /* auto-select priority leads */
      const topIds = (j.leads as CandidateLead[])
        .slice(0, j.priority_count ?? j.leads.length)
        .map((l: CandidateLead) => l.id);
      setSelected(new Set(topIds));
    } catch (e: unknown) {
      setAnalyzeErr(e instanceof Error ? e.message : "Erro na análise");
    } finally {
      setAnalyzing(false);
    }
  }

  /* ── flyer upload ── */
  function handleFlyerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // preview keeps data: prefix; base64 strips it for Evolution API
      setFlyerPreview(result);
      setFlyerBase64(result.split(",")[1] ?? "");
      setFlyerName(file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearFlyer() {
    setFlyerPreview(null);
    setFlyerBase64(null);
    setFlyerName("");
  }

  /* ── toggle selection ── */
  function toggleLead(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!analysis) return;
    if (selected.size === analysis.leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(analysis.leads.map(l => l.id)));
    }
  }

  /* ── broadcast ── */
  async function handleSend() {
    if (!selected.size) return;
    if (channel !== "email" && !waCopy.trim()) { setSendErr("Preencha o texto do WhatsApp."); return; }
    setSending(true);
    setSendErr("");
    setSendResult(null);
    try {
      const r = await fetch("/api/campaigns/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_ids:       Array.from(selected),
          channel,
          whatsapp_copy:  waCopy,
          email_subject:  emailSubject,
          email_body:     emailBody,
          campaign_name:  campaignName || `Campanha ${new Date().toLocaleDateString("pt-BR")}`,
          ...(flyerBase64 && { flyer_base64: flyerBase64, flyer_filename: flyerName }),
        }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? "Erro no disparo");
      setSendResult(j);
      fetchHistory();
    } catch (e: unknown) {
      setSendErr(e instanceof Error ? e.message : "Erro no disparo");
    } finally {
      setSending(false);
    }
  }

  /* ─────────────── render ─── */
  return (
    <div style={{ padding: "32px 28px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(124,58,237,.4)",
          }}>
            <Megaphone size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
              Campanhas
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
              Reativação inteligente de leads com IA + disparo multicanal
            </p>
          </div>
        </div>
      </div>

      {/* ── Step 1 — Analyze ── */}
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="#7c3aed" />
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              Passo 1 — Análise IA da base
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            A IA varre leads frios (parados há +20 dias) e sugere os melhores candidatos para reativação com copy pronta.
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          style={primaryBtnStyle(analyzing)}
        >
          {analyzing
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Analisando base...</>
            : <><Sparkles size={16} /> Analisar base com IA</>
          }
        </button>

        {analyzeErr && (
          <div style={errorStyle}>
            <AlertCircle size={14} /> {analyzeErr}
          </div>
        )}

        {/* AI Reasoning card */}
        {analysis && analysis.reasoning && (
          <div style={{
            marginTop: 20, padding: "16px 18px",
            background: "linear-gradient(135deg,rgba(124,58,237,.08),rgba(79,70,229,.06))",
            borderRadius: 12, border: "1px solid rgba(124,58,237,.2)",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Zap size={15} color="#7c3aed" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
                {analysis.reasoning}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Step 2 — Lead List ── */}
      {analysis && analysis.leads.length > 0 && (
        <section style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} color="#7c3aed" />
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                Passo 2 — Selecionar leads
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {selected.size} de {analysis.leads.length} selecionados
              </span>
              <button onClick={toggleAll} style={ghostBtnStyle}>
                {selected.size === analysis.leads.length ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {analysis.leads.map(lead => {
              const checked = selected.has(lead.id);
              return (
                <div
                  key={lead.id}
                  onClick={() => toggleLead(lead.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${checked ? "rgba(124,58,237,.4)" : "var(--border)"}`,
                    background: checked ? "rgba(124,58,237,.06)" : "var(--card-bg)",
                    transition: "all .15s",
                  }}
                >
                  {checked
                    ? <CheckSquare size={16} color="#7c3aed" style={{ flexShrink: 0 }} />
                    : <Square size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                    {lead.name || "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 70 }}>
                    {STATUS_LABEL[lead.status] ?? lead.status}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 90 }}>
                    {lead.source || "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 70 }}>
                    {lead.daysAgo}d parado
                  </span>
                  <ScoreDot score={lead.score} />
                  {lead.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 4 }}>
                      {lead.tags.slice(0, 2).map(t => (
                        <span key={t} style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 20,
                          background: "rgba(124,58,237,.12)", color: "#7c3aed", fontWeight: 600,
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {analysis && analysis.leads.length === 0 && (
        <section style={sectionStyle}>
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-secondary)", fontSize: 14 }}>
            <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Nenhum lead frio encontrado no momento.</p>
            <p style={{ margin: "4px 0 0" }}>Todos os seus leads estão ativos ou foram reativados recentemente.</p>
          </div>
        </section>
      )}

      {/* ── Step 3 — Compose ── */}
      {analysis && selected.size > 0 && (
        <section style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <MessageSquare size={18} color="#7c3aed" />
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              Passo 3 — Compor mensagem
            </span>
          </div>

          {/* Campaign name */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Nome da campanha</label>
            <input
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder={`Campanha ${new Date().toLocaleDateString("pt-BR")}`}
              style={inputStyle}
            />
          </div>

          {/* Channel selector */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Canal de disparo</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["whatsapp", "email", "both"] as Channel[]).map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  style={{
                    padding: "8px 18px", borderRadius: 8, border: "1px solid",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    borderColor: channel === ch ? "#7c3aed" : "var(--border)",
                    background: channel === ch ? "rgba(124,58,237,.1)" : "transparent",
                    color: channel === ch ? "#7c3aed" : "var(--text-secondary)",
                    transition: "all .15s",
                  }}
                >
                  {ch === "whatsapp" && <MessageSquare size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />}
                  {ch === "email"    && <Mail size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />}
                  {ch === "both"     && <Send size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />}
                  {CHANNEL_LABEL[ch]}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp copy */}
          {(channel === "whatsapp" || channel === "both") && (
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Texto WhatsApp
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-secondary)", fontWeight: 400 }}>
                  use {"{nome}"} para personalizar · máx 200 caracteres
                </span>
              </label>
              <textarea
                value={waCopy}
                onChange={e => setWaCopy(e.target.value)}
                rows={3}
                maxLength={200}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                placeholder="Oi {nome}! Tudo bem? ..."
              />
              <div style={{ textAlign: "right", fontSize: 11, color: waCopy.length > 180 ? "#ef4444" : "var(--text-secondary)", marginTop: 3 }}>
                {waCopy.length}/200
              </div>
            </div>
          )}

          {/* Email fields */}
          {(channel === "email" || channel === "both") && (
            <>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Assunto do email</label>
                <input
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  style={inputStyle}
                  placeholder="Uma mensagem especial para você"
                />
              </div>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  Corpo do email
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-secondary)", fontWeight: 400 }}>
                    use {"{nome}"} para personalizar
                  </span>
                </label>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  placeholder="Olá {nome},&#10;&#10;Ficamos sentindo sua falta..."
                />
              </div>
            </>
          )}

          {/* Flyer / imagem — apenas WhatsApp */}
          {(channel === "whatsapp" || channel === "both") && (
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Flyer / imagem
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-secondary)", fontWeight: 400 }}>
                  opcional · JPG ou PNG · enviado antes do texto
                </span>
              </label>

              {flyerPreview ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flyerPreview}
                    alt="Flyer preview"
                    style={{
                      maxWidth: 240, maxHeight: 180, borderRadius: 10,
                      border: "1px solid var(--border)", display: "block",
                    }}
                  />
                  <button
                    onClick={clearFlyer}
                    style={{
                      position: "absolute", top: -8, right: -8,
                      width: 24, height: 24, borderRadius: "50%",
                      background: "#ef4444", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={13} color="#fff" />
                  </button>
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                    {flyerName}
                  </p>
                </div>
              ) : (
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 18px", borderRadius: 8, cursor: "pointer",
                  border: "1px dashed var(--border)", fontSize: 13,
                  color: "var(--text-secondary)", transition: "all .15s",
                }}>
                  <ImagePlus size={16} />
                  Selecionar imagem
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFlyerChange}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Step 4 — Send ── */}
      {analysis && selected.size > 0 && (
        <section style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Send size={18} color="#7c3aed" />
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              Passo 4 — Disparar
            </span>
          </div>

          <div style={{
            padding: "14px 16px", borderRadius: 10, marginBottom: 16,
            background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <Clock size={14} color="#f59e0b" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, color: "#d97706", lineHeight: 1.5 }}>
              <strong>Rate limit:</strong> 30 segundos entre cada disparo para proteger o número.{" "}
              Para {selected.size} leads via WhatsApp, o envio levará ~{Math.ceil(selected.size * 0.5)} minutos.
              A página pode ser fechada após iniciar — o processo continua no servidor.
            </p>
          </div>

          {sendErr && <div style={{ ...errorStyle, marginBottom: 12 }}><AlertCircle size={14} /> {sendErr}</div>}

          {sendResult && (
            <div style={{
              padding: "14px 16px", borderRadius: 10, marginBottom: 16,
              background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)",
              display: "flex", gap: 10, alignItems: "center",
            }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                Campanha disparada! {sendResult.sent} enviados · {sendResult.failed} falhas
              </span>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !!sendResult}
            style={primaryBtnStyle(sending || !!sendResult)}
          >
            {sending
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Enviando... ({selected.size} leads)</>
              : sendResult
                ? <><CheckCircle2 size={16} /> Campanha enviada!</>
                : <><Send size={16} /> Disparar para {selected.size} lead{selected.size !== 1 ? "s" : ""}</>
            }
          </button>
        </section>
      )}

      {/* ── Campaign History ── */}
      <section style={sectionStyle}>
        <button
          onClick={() => { setShowHistory(h => !h); if (!showHistory) fetchHistory(); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          <BarChart2 size={18} color="#7c3aed" />
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", flex: 1, textAlign: "left" }}>
            Histórico de campanhas
          </span>
          {loadingHist
            ? <Loader2 size={15} color="var(--text-secondary)" style={{ animation: "spin 1s linear infinite" }} />
            : showHistory ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />
          }
        </button>

        {showHistory && (
          <div style={{ marginTop: 16 }}>
            {history.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                Nenhuma campanha disparada ainda.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map(c => (
                  <div key={c.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 10,
                    border: "1px solid var(--border)", background: "var(--card-bg)",
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: c.status === "done" ? "#10b981" : c.status === "sending" ? "#f59e0b" : "#6b7280",
                    }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                      {c.name}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 70 }}>
                      {CHANNEL_LABEL[c.channel] ?? c.channel}
                    </span>
                    <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600, width: 60 }}>
                      {c.sent} ✓
                    </span>
                    {c.failed > 0 && (
                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, width: 60 }}>
                        {c.failed} ✗
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {fmt(c.created_at)}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                      background: c.status === "done"    ? "rgba(16,185,129,.12)"  :
                                  c.status === "sending" ? "rgba(245,158,11,.12)"  : "rgba(107,114,128,.12)",
                      color:      c.status === "done"    ? "#059669" :
                                  c.status === "sending" ? "#d97706" : "#6b7280",
                    }}>
                      {c.status === "done" ? "Concluída" : c.status === "sending" ? "Enviando" : c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={fetchHistory}
              style={{ ...ghostBtnStyle, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={13} /> Atualizar histórico
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────── style helpers ─── */
const sectionStyle: React.CSSProperties = {
  background:   "var(--card-bg)",
  border:       "1px solid var(--border)",
  borderRadius: 16,
  padding:      "24px 24px",
  marginBottom: 20,
};

const sectionHeaderStyle: React.CSSProperties = {
  marginBottom: 16,
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display:      "block",
  fontSize:     12,
  fontWeight:   700,
  color:        "var(--text-secondary)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width:        "100%",
  padding:      "10px 12px",
  borderRadius: 8,
  border:       "1px solid var(--border)",
  background:   "var(--input-bg, var(--bg))",
  color:        "var(--text-primary)",
  fontSize:     13,
  outline:      "none",
  boxSizing:    "border-box",
  fontFamily:   "inherit",
};

const errorStyle: React.CSSProperties = {
  marginTop:    12,
  padding:      "10px 14px",
  borderRadius: 8,
  background:   "rgba(239,68,68,.08)",
  border:       "1px solid rgba(239,68,68,.25)",
  color:        "#ef4444",
  fontSize:     13,
  display:      "flex",
  gap:          6,
  alignItems:   "center",
};

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          8,
    padding:      "11px 22px",
    borderRadius: 10,
    border:       "none",
    cursor:       disabled ? "not-allowed" : "pointer",
    fontSize:     14,
    fontWeight:   700,
    background:   disabled
      ? "rgba(124,58,237,.3)"
      : "linear-gradient(135deg,#7c3aed,#4f46e5)",
    color:        "#fff",
    boxShadow:    disabled ? "none" : "0 4px 14px rgba(124,58,237,.4)",
    transition:   "all .2s",
  };
}

const ghostBtnStyle: React.CSSProperties = {
  padding:      "6px 12px",
  borderRadius: 8,
  border:       "1px solid var(--border)",
  background:   "transparent",
  color:        "var(--text-secondary)",
  fontSize:     12,
  fontWeight:   600,
  cursor:       "pointer",
};
