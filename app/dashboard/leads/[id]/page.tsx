"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Message {
  id:           string;
  direction:    "in" | "out";
  content:      string;
  timestamp:    string;
  sender_name?: string;
  media_type?:  "audio" | "image" | "document";
  media_url?:   string;
  status?:      "sent" | "delivered" | "read";
}

interface Lead {
  id:        string;
  name:      string;
  phone:     string;
  email?:    string;
  tax_id?:   string;
  ai_reply?: boolean;
  tags?:     string[];
}

interface Proposal {
  id:              string;
  proposal_number: string;
  service_title:   string;
  amount:          number;
  status:          string;
  sign_link:       string;
  pix_code:        string;
  boleto_url:      string;
  created_at:      string;
}

const PROP_STATUS: Record<string, { label: string; cls: string }> = {
  pending_send:       { label: "Aguardando envio",    cls: "badge-warning" },
  sent:               { label: "Proposta enviada",    cls: "badge-success" },
  signed:             { label: "Aceito",              cls: "badge-accent"  },
  awaiting_payment:   { label: "Aguard. pagamento",   cls: "badge-warning" },
  paid:               { label: "Pago",                cls: "badge-success" },
  awaiting_signature: { label: "Aguard. assinatura",  cls: "badge-warning" },
};

export default function ConversationPage({ params }: { params: { id: string } }) {
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [lead,           setLead]           = useState<Lead | null>(null);
  const [mode,           setMode]           = useState<"auto" | "human">("auto");
  const [aiReply,        setAiReply]        = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [text,           setText]           = useState("");
  const [sending,        setSending]        = useState(false);
  const [suggesting,     setSuggesting]     = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [proposals,      setProposals]      = useState<Proposal[]>([]);
  const [showProposal,   setShowProposal]   = useState(false);
  const [propForm,       setPropForm]       = useState({ service_title: "", service_desc: "", amount: "", payment_terms: "", valid_days: "7" });
  const [sendingProp,    setSendingProp]    = useState(false);
  const [propError,      setPropError]      = useState<string | null>(null);
  const [markingPaid,     setMarkingPaid]     = useState<string | null>(null);
  const [retryingCharge,  setRetryingCharge]  = useState<string | null>(null);
  const [deletingProp,    setDeletingProp]    = useState<string | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);
  const [taxId,          setTaxId]          = useState("");
  const [savingTaxId,    setSavingTaxId]    = useState(false);
  const taxIdFocused = useRef(false);
  const [tags,           setTags]           = useState<string[]>([]);
  const [tagInput,       setTagInput]       = useState("");
  const [savingTag,      setSavingTag]      = useState(false);
  const [dealValue,      setDealValue]      = useState("");
  const [savingDeal,     setSavingDeal]     = useState(false);
  const [leadStatus,     setLeadStatus]     = useState("");
  const [assignedTo,     setAssignedTo]     = useState("");
  const [savingAssigned, setSavingAssigned] = useState(false);
  const [users,          setUsers]          = useState<{ id: string; name: string }[]>([]);
  const [propActionMsg,  setPropActionMsg]  = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [confirmDialog,  setConfirmDialog]  = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const [attachedFile,   setAttachedFile]   = useState<File | null>(null);
  const [sendingFile,    setSendingFile]    = useState(false);
  const [editingPhone,   setEditingPhone]   = useState(false);
  const [newPhone,       setNewPhone]       = useState("");
  const [savingPhone,    setSavingPhone]    = useState(false);

  async function fetchConversation() {
    try {
      const [resLead, resMsgs] = await Promise.all([
        fetch(`/api/leads/${params.id}`),
        fetch(`/api/conversations/${params.id}`),
      ]);
      const [jsonLead, jsonMsgs] = await Promise.all([resLead.json(), resMsgs.json()]);
      if (jsonLead.success) {
        setLead({ id: params.id, name: jsonLead.data.name, phone: jsonLead.data.phone, email: jsonLead.data.email, tax_id: jsonLead.data.tax_id, ai_reply: jsonLead.data.ai_reply ?? false, tags: jsonLead.data.tags ?? [] });
        setAiReply(jsonLead.data.ai_reply ?? false);
        if (!taxIdFocused.current) setTaxId(jsonLead.data.tax_id ?? "");
        setTags(jsonLead.data.tags ?? []);
        setLeadStatus(jsonLead.data.status ?? "");
        if (jsonLead.data.deal_value  != null) setDealValue(String(jsonLead.data.deal_value));
        if (jsonLead.data.assigned_to != null) setAssignedTo(jsonLead.data.assigned_to);
        // carrega lista de usuários para o dropdown
        fetch("/api/users").then(r => r.json()).then(j => {
          setUsers((j.data ?? []).map((u: Record<string, unknown>) => ({ id: u.id, name: u.name })));
        }).catch(() => {});
      }
      if (jsonMsgs.success) {
        setMessages(jsonMsgs.data ?? []);
        setMode(jsonMsgs.mode ?? "auto");
      }
    } catch {
      setError("Erro ao carregar conversa.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchConversation(); fetchProposals(); }, []);

  async function fetchProposals() {
    try {
      const res  = await fetch(`/api/proposals?lead_id=${params.id}`);
      const json = await res.json();
      if (json.success) setProposals(json.data ?? []);
    } catch { /* silent */ }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const interval = setInterval(fetchConversation, 30000);
    return () => clearInterval(interval);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setError(null);
    try {
      const res  = await fetch(`/api/conversations/${params.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setText("");
      await fetchConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setSending(false);
    }
  }

  async function handleSendFile() {
    if (!attachedFile || sendingFile) return;
    setSendingFile(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", attachedFile);
      const res  = await fetch(`/api/conversations/${params.id}/media`, { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setAttachedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await fetchConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setSendingFile(false);
    }
  }

  async function handleSuggest() {
    setSuggesting(true); setError(null);
    try {
      const res  = await fetch("/api/ai/reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: params.id, auto: false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setText(json.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sugerir.");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleResumeAuto() {
    await fetch(`/api/conversations/${params.id}`, { method: "PATCH" });
    setMode("auto");
  }

  async function toggleAiReply() {
    const next = !aiReply;
    setAiReply(next);
    await fetch(`/api/leads/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_reply: next }),
    });
  }

  async function handleMarkAsPaid(proposalId: string) {
    setConfirmDialog({
      title: "Confirmar pagamento",
      message: "Confirmar pagamento manualmente? Isso moverá o lead para Fechado e disparará o onboarding.",
      onConfirm: () => { setConfirmDialog(null); doMarkAsPaid(proposalId); },
    });
  }

  async function doMarkAsPaid(proposalId: string) {
    setMarkingPaid(proposalId);
    try {
      const res  = await fetch(`/api/proposals/${proposalId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_paid" }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro ao marcar como pago.");
      await fetchProposals();
    } catch (err) {
      setPropActionMsg({ type: "error", text: err instanceof Error ? err.message : "Erro." });
    } finally { setMarkingPaid(null); }
  }

  async function handleRetryCharge(proposalId: string) {
    setConfirmDialog({
      title: "Re-tentar cobrança",
      message: "Re-tentar geração da cobrança PIX na Cora?",
      onConfirm: () => { setConfirmDialog(null); doRetryCharge(proposalId); },
    });
  }

  async function doRetryCharge(proposalId: string) {
    setRetryingCharge(proposalId);
    setPropActionMsg(null);
    try {
      const res  = await fetch(`/api/proposals/${proposalId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retry_charge" }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro.");
      setPropActionMsg({ type: "ok", text: "Cobrança re-enviada!" });
      await fetchProposals();
    } catch (err) {
      setPropActionMsg({ type: "error", text: err instanceof Error ? err.message : "Erro." });
    } finally { setRetryingCharge(null); }
  }

  async function handleDeleteProposal(proposalId: string) {
    setConfirmDialog({
      title: "Excluir proposta",
      message: "Excluir esta proposta? Esta ação não pode ser desfeita.",
      onConfirm: () => { setConfirmDialog(null); doDeleteProposal(proposalId); },
    });
  }

  async function doDeleteProposal(proposalId: string) {
    setDeletingProp(proposalId);
    setPropActionMsg(null);
    try {
      const res  = await fetch(`/api/proposals/${proposalId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro.");
      await fetchProposals();
    } catch (err) {
      setPropActionMsg({ type: "error", text: err instanceof Error ? err.message : "Erro." });
    } finally { setDeletingProp(null); }
  }

  async function handleAddTag() {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || tags.includes(tag) || tags.length >= 15) return;
    setSavingTag(true);
    const next = [...tags, tag];
    setTags(next);
    setTagInput("");
    await fetch(`/api/leads/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
    setSavingTag(false);
  }

  async function handleRemoveTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    await fetch(`/api/leads/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
  }

  async function handleSaveAssigned(value: string) {
    setAssignedTo(value);
    setSavingAssigned(true);
    await fetch(`/api/leads/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to: value }),
    });
    setSavingAssigned(false);
  }

  async function handleSaveDealValue() {
    const val = parseFloat(dealValue.replace(",", "."));
    if (isNaN(val)) return;
    setSavingDeal(true);
    await fetch(`/api/leads/${params.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_value: val }),
    });
    setSavingDeal(false);
  }

  async function handleSavePhone() {
    if (!newPhone.trim()) return;
    setSavingPhone(true);
    try {
      const res  = await fetch(`/api/leads/${params.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro ao salvar.");
      setEditingPhone(false);
      await fetchConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar telefone.");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleSaveTaxId() {
    setSavingTaxId(true);
    try {
      await fetch(`/api/leads/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tax_id: taxId }) });
    } finally { setSavingTaxId(false); }
  }

  async function handleCreateProposal(e: React.FormEvent) {
    e.preventDefault();
    setSendingProp(true); setPropError(null);
    try {
      const res  = await fetch("/api/proposals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: params.id, service_title: propForm.service_title, service_desc: propForm.service_desc, amount: parseFloat(propForm.amount.replace(",", ".")), payment_terms: propForm.payment_terms || undefined, valid_days: parseInt(propForm.valid_days) || 7 }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro ao criar proposta.");
      setShowProposal(false);
      setPropForm({ service_title: "", service_desc: "", amount: "", payment_terms: "", valid_days: "7" });
      await fetchProposals();
    } catch (err) {
      setPropError(err instanceof Error ? err.message : "Erro ao criar proposta.");
    } finally {
      setSendingProp(false);
    }
  }

  function renderMedia(msg: Message) {
    if (!msg.media_type || !msg.media_url) return null;
    const isOut = msg.direction === "out";
    const linkStyle = { color: isOut ? "rgba(255,255,255,0.85)" : "var(--accent)", fontSize: 13 };
    if (msg.media_type === "audio") return <div style={{ marginTop: 6 }}><audio controls src={msg.media_url} style={{ maxWidth: "100%", height: 36 }} /></div>;
    if (msg.media_type === "image")    return <div style={{ marginTop: 6 }}><a href={msg.media_url} target="_blank" rel="noreferrer" style={linkStyle}>📷 Ver imagem</a></div>;
    if (msg.media_type === "document") return <div style={{ marginTop: 6 }}><a href={msg.media_url} target="_blank" rel="noreferrer" style={linkStyle}>📄 Baixar documento</a></div>;
    return null;
  }

  const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="lead-chat-container" style={{ display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto", background: "var(--bg-base)" }}>

      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, background: "var(--bg-elevated)", flexWrap: "wrap" }}>
        <a href="/dashboard/conversas" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Conversas</a>

        {/* Avatar + Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: mode === "human" ? "var(--accent)" : "#059669",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700,
          }}>
            {lead ? initials(lead.name || "?") : "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-semibold text-sm">{lead?.name ?? "Carregando..."}</div>
            <div className="text-xs text-muted">{lead?.phone}</div>
            {/* Tags */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--accent-light)", border: "1px solid var(--accent-border)", color: "var(--accent)", borderRadius: "var(--radius-full)", fontSize: 10, fontWeight: 600, padding: "2px 8px", cursor: "default" }}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1, opacity: 0.7 }}
                    title="Remover tag"
                  >×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                placeholder="+ tag"
                style={{ background: "none", border: "none", outline: "none", fontSize: 10, color: "var(--text-muted)", width: 50, padding: 0 }}
              />
              {tagInput.trim() && (
                <button onClick={handleAddTag} disabled={savingTag} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 10, cursor: "pointer", padding: 0 }}>
                  ↵
                </button>
              )}
            </div>
          </div>

          {/* Responsável pelo lead */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>👤 Resp.:</span>
            <select
              value={assignedTo}
              onChange={e => handleSaveAssigned(e.target.value)}
              style={{
                padding: "3px 8px", borderRadius: 6,
                border: "1px solid var(--border)", background: "var(--bg-surface)",
                color: "var(--text-primary)", fontSize: 12, outline: "none",
                maxWidth: 160,
              }}
            >
              <option value="">— ninguém —</option>
              {users.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
            {savingAssigned && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>✓</span>}
          </div>

          {/* Valor do deal — aparece quando lead está fechado */}
          {leadStatus === "fechado" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>💰 Valor:</span>
              <input
                value={dealValue}
                onChange={e => setDealValue(e.target.value)}
                onBlur={handleSaveDealValue}
                onKeyDown={e => { if (e.key === "Enter") handleSaveDealValue(); }}
                placeholder="R$ 0,00"
                inputMode="numeric"
                style={{
                  width: 110, padding: "3px 8px", borderRadius: 6,
                  border: "1px solid var(--border)", background: "var(--bg-surface)",
                  color: "var(--text-primary)", fontSize: 12, outline: "none",
                }}
              />
              {savingDeal && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Salvando...</span>}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* AI toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>
            <span>IA auto</span>
            <div
              onClick={toggleAiReply}
              style={{ width: 36, height: 20, borderRadius: 99, cursor: "pointer", background: aiReply ? "var(--accent)" : "var(--border)", position: "relative", transition: "background .2s", flexShrink: 0 }}
            >
              <div style={{ position: "absolute", top: 2, left: aiReply ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
            </div>
          </label>

          {/* Mode badge */}
          <span className={`badge ${mode === "human" ? "badge-warning" : "badge-success"}`}>
            {mode === "human" ? "👤 Humano" : "🤖 Auto"}
          </span>
          {mode === "human" && (
            <button className="btn btn-secondary btn-sm" onClick={handleResumeAuto}>Retomar Auto</button>
          )}

          {/* Proposta */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowProposal((v) => !v)}
          >
            📄 Proposta {proposals.length > 0 ? `(${proposals.length})` : ""}
          </button>
        </div>
      </div>

      {/* Proposal panel */}
      {showProposal && (
        <div style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", padding: "16px 20px", overflowY: "auto", maxHeight: 420 }}>

          {/* Tax ID */}
          <div className="flex items-center gap-2" style={{ marginBottom: 16, flexWrap: "wrap" }}>
            <span className="text-xs text-muted">CPF/CNPJ do cliente:</span>
            <input
              className="input"
              style={{ maxWidth: 180 }}
              value={taxId}
              onChange={(e) => setTaxId(e.target.value.replace(/\D/g, "").slice(0, 14))}
              onFocus={() => { taxIdFocused.current = true; }}
              onBlur={() => { taxIdFocused.current = false; }}
              placeholder="Apenas números"
            />
            <button className="btn btn-secondary btn-sm" onClick={handleSaveTaxId} disabled={savingTaxId}>
              {savingTaxId ? "..." : "Salvar"}
            </button>
            <span className="text-xs text-muted">Usado na proposta e documentos</span>
          </div>

          {/* Propostas existentes */}
          {proposals.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p className="text-xs text-muted" style={{ marginBottom: 8 }}>Propostas geradas</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {proposals.map((p) => {
                  const st = PROP_STATUS[p.status] ?? { label: p.status, cls: "badge-default" };
                  return (
                    <div key={p.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <span className="font-semibold text-sm">{p.proposal_number}</span>
                        <span className="text-xs text-muted" style={{ marginLeft: 8 }}>{p.service_title}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--success)", marginLeft: 8 }}>
                          R$ {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex gap-1 items-center" style={{ flexWrap: "wrap" }}>
                        <span className={`badge ${st.cls}`} style={{ fontSize: 10 }}>{st.label}</span>

                        {/* PDF */}
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => window.open(`/dashboard/propostas/${p.id}/imprimir`, "_blank")}
                          title="Visualizar / Baixar PDF"
                        >
                          📄 PDF
                        </button>

                        {/* Enviar via WhatsApp */}
                        {p.status === "pending_send" && (
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ color: "var(--accent)" }}
                            disabled={sendingWhatsApp === p.id}
                            onClick={async () => {
                              setSendingWhatsApp(p.id);
                              try {
                                await fetch(`/api/proposals/${p.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "send_whatsapp" }),
                                });
                                await fetchProposals();
                              } finally { setSendingWhatsApp(null); }
                            }}
                          >
                            {sendingWhatsApp === p.id ? "Enviando..." : "📤 Enviar"}
                          </button>
                        )}

                        {/* Marcar pago */}
                        {!["paid"].includes(p.status) && (
                          <button className="btn btn-ghost btn-xs" style={{ color: "var(--success)" }} onClick={() => handleMarkAsPaid(p.id)} disabled={markingPaid === p.id}>
                            {markingPaid === p.id ? "..." : "✅ Pago"}
                          </button>
                        )}

                        {/* Excluir */}
                        <button className="btn btn-ghost btn-xs" style={{ color: "var(--error)" }} onClick={() => handleDeleteProposal(p.id)} disabled={deletingProp === p.id}>
                          {deletingProp === p.id ? "..." : "🗑️"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {propActionMsg && (
            <p style={{ fontSize: 12, color: propActionMsg.type === "ok" ? "var(--success)" : "var(--error)", margin: "4px 0 8px" }}>
              {propActionMsg.text}
            </p>
          )}

          {/* Nova proposta */}
          <p className="text-xs text-muted" style={{ marginBottom: 10 }}>Nova proposta</p>
          <form onSubmit={handleCreateProposal} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input required className="input" placeholder="Título / Cenário *  ex: Cenário 01" value={propForm.service_title} onChange={(e) => setPropForm((p) => ({ ...p, service_title: e.target.value }))} />
            <textarea required className="textarea" placeholder="Serviços (uma linha por serviço) *" value={propForm.service_desc} rows={3} style={{ resize: "vertical" }} onChange={(e) => setPropForm((p) => ({ ...p, service_desc: e.target.value }))} />
            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
              <input required className="input" style={{ flex: "1 1 120px" }} placeholder="Valor (R$) *" value={propForm.amount} onChange={(e) => setPropForm((p) => ({ ...p, amount: e.target.value }))} />
              <select className="input" style={{ flex: "1 1 180px" }} value={propForm.payment_terms} onChange={(e) => setPropForm((p) => ({ ...p, payment_terms: e.target.value }))}>
                <option value="">Condições de pagamento</option>
                <option value="À vista">À vista</option>
                <option value="Pix">Pix</option>
                <option value="Boleto">Boleto</option>
                <option value="A combinar">A combinar</option>
              </select>
              <input className="input" style={{ width: 100 }} placeholder="Validade (dias)" type="number" min="1" max="90" value={propForm.valid_days} onChange={(e) => setPropForm((p) => ({ ...p, valid_days: e.target.value }))} />
            </div>
            {propError && <p style={{ color: "var(--error)", fontSize: 13, margin: 0 }}>{propError}</p>}
            <button type="submit" disabled={sendingProp} className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
              {sendingProp ? "Gerando..." : "📋 Gerar proposta"}
            </button>
          </form>
        </div>
      )}

      {/* Banners */}
      {(lead?.phone?.includes("@") || (lead?.phone && /^\d+$/.test(lead.phone) && !lead.phone.startsWith("55") && lead.phone.length > 11)) && (
        <div style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.4)", padding: "10px 20px", fontSize: 12, color: "#ef4444" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>⚠️ <strong>Número desconhecido (privacidade iOS)</strong> — mensagens não serão entregues. Informe o telefone real:</span>
            {!editingPhone ? (
              <button className="btn btn-secondary btn-xs" onClick={() => { setNewPhone(""); setEditingPhone(true); }}>
                Atualizar telefone
              </button>
            ) : (
              <>
                <input
                  autoFocus
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="5511999999999"
                  style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.5)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 12, outline: "none", width: 160 }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSavePhone(); if (e.key === "Escape") setEditingPhone(false); }}
                />
                <button className="btn btn-primary btn-xs" onClick={handleSavePhone} disabled={savingPhone || !newPhone.trim()}>
                  {savingPhone ? "..." : "Salvar"}
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => setEditingPhone(false)}>Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}
      {mode === "human" && (
        <div style={{ background: "rgba(245,158,11,0.12)", borderBottom: "1px solid rgba(245,158,11,0.3)", padding: "8px 20px", fontSize: 12, color: "#f59e0b" }}>
          👤 Automação pausada — você está no controle. Retoma após 30 min de inatividade.
        </div>
      )}
      {aiReply && mode !== "human" && (
        <div style={{ background: "rgba(124,58,237,0.12)", borderBottom: "1px solid rgba(124,58,237,0.3)", padding: "8px 20px", fontSize: 12, color: "var(--accent)" }}>
          ✨ IA respondendo automaticamente — ative o Modo Humano para assumir o controle.
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 10, background: "var(--bg-base)" }}>
        {loading && (
          <div className="flex items-center gap-3" style={{ justifyContent: "center", padding: "2rem 0" }}>
            <div className="spinner" />
            <span className="text-secondary text-sm">Carregando conversa...</span>
          </div>
        )}
        {error && <p style={{ color: "var(--error)", textAlign: "center", fontSize: 13 }}>{error}</p>}

        {!loading && messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">Nenhuma mensagem ainda</div>
            <div className="empty-state-text">Envie uma mensagem abaixo para iniciar a conversa.</div>
          </div>
        )}

        {messages.map((msg) => {
          const isOut      = msg.direction === "out";
          const avatarName = isOut ? (msg.sender_name ?? "Sistema") : (lead?.name ?? "?");
          const isAI       = msg.sender_name === "IA";
          const isFollowUp = msg.sender_name?.startsWith("Follow-up");
          const avatarBg   = isOut
            ? (isAI ? "var(--accent)" : isFollowUp ? "#f59e0b" : "#2563eb")
            : "#059669";
          const msgBg      = isAI
            ? "rgba(124,58,237,0.18)"
            : isFollowUp
            ? "rgba(245,158,11,0.15)"
            : isOut
            ? "var(--accent)"
            : "var(--bg-elevated)";
          const msgColor = isOut && !isAI && !isFollowUp ? "#fff" : "var(--text-primary)";

          return (
            <div
              key={msg.id}
              style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isOut ? "row-reverse" : "row" }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: avatarBg, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {isAI ? "✨" : isFollowUp ? "⏰" : initials(avatarName)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: isOut ? "flex-end" : "flex-start", maxWidth: "72%" }}>
                <div className="text-xs text-muted" style={{ marginBottom: 3 }}>{avatarName}</div>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: isOut ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  background: msgBg,
                  color: msgColor,
                  border: "1px solid var(--border)",
                  fontSize: 14, lineHeight: 1.5,
                }}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                  {renderMedia(msg)}
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                    {new Date(msg.timestamp).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    {isOut && msg.status === "sent"      && <span title="Enviado">✓</span>}
                    {isOut && msg.status === "delivered" && <span title="Entregue">✓✓</span>}
                    {isOut && msg.status === "read"      && <span title="Lido" style={{ color: "#60a5fa" }}>✓✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        {/* File preview */}
        {attachedFile && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
            padding: "6px 12px", borderRadius: "var(--radius)",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            fontSize: 12,
          }}>
            <span>📎</span>
            <span className="text-secondary" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {attachedFile.name}
            </span>
            <span className="text-muted" style={{ flexShrink: 0 }}>
              {(attachedFile.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={() => { setAttachedFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: 0 }}
            >✕</button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*,video/*,audio/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          style={{ display: "none" }}
          onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
        />

        {attachedFile ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ borderRadius: 24, padding: "0 14px" }}
              onClick={() => { setAttachedFile(null); if (fileRef.current) fileRef.current.value = ""; }}
            >Cancelar</button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ borderRadius: 24, flex: 1 }}
              onClick={handleSendFile}
              disabled={sendingFile}
            >
              {sendingFile ? "Enviando..." : "📤 Enviar arquivo"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ borderRadius: 24, padding: "0 14px", flexShrink: 0 }}
              onClick={() => fileRef.current?.click()}
              title="Anexar arquivo"
            >
              📎
            </button>
            <input
              className="input"
              style={{ flex: 1, borderRadius: 24 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite uma mensagem..."
              disabled={sending}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ borderRadius: 24, padding: "0 14px" }}
              onClick={handleSuggest}
              disabled={suggesting || sending}
              title="Sugerir resposta com IA"
            >
              {suggesting ? "..." : "✨"}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ borderRadius: 24, padding: "0 20px" }}
              disabled={sending || !text.trim()}
            >
              {sending ? "..." : "Enviar"}
            </button>
          </form>
        )}
      </div>

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
