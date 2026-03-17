"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id:        string;
  direction: "in" | "out";
  content:   string;
  timestamp: string;
}

interface Lead {
  id:    string;
  name:  string;
  phone: string;
}

export default function ConversationPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lead,     setLead]     = useState<Lead | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchConversation() {
    try {
      const [resLead, resMsgs] = await Promise.all([
        fetch(`/api/leads/${params.id}`),
        fetch(`/api/conversations/${params.id}`),
      ]);
      const [jsonLead, jsonMsgs] = await Promise.all([resLead.json(), resMsgs.json()]);
      if (jsonLead.success) setLead({ id: params.id, name: jsonLead.data.name, phone: jsonLead.data.phone });
      if (jsonMsgs.success) setMessages(jsonMsgs.data ?? []);
    } catch {
      setError("Erro ao carregar conversa.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchConversation(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);

    try {
      const res  = await fetch(`/api/conversations/${params.id}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: text }),
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

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "sans-serif", maxWidth: 700, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "1rem", background: "#fff" }}>
        <a href="/dashboard" style={{ fontSize: ".9rem", color: "#1a6fbf" }}>← Dashboard</a>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{lead?.name ?? "Carregando..."}</div>
          <div style={{ fontSize: ".85rem", color: "#888" }}>{lead?.phone}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: ".75rem", background: "#f5f5f5" }}>
        {loading && <p style={{ color: "#888", textAlign: "center" }}>Carregando conversa...</p>}
        {error   && <p style={{ color: "red",  textAlign: "center" }}>{error}</p>}

        {!loading && messages.length === 0 && (
          <p style={{ color: "#aaa", textAlign: "center", marginTop: "2rem" }}>
            Nenhuma mensagem ainda.<br />Envie uma mensagem abaixo para iniciar a conversa.
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.direction === "out" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "75%",
              padding: ".6rem 1rem",
              borderRadius: msg.direction === "out" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.direction === "out" ? "#1a6fbf" : "#fff",
              color:      msg.direction === "out" ? "#fff" : "#222",
              boxShadow:  "0 1px 3px rgba(0,0,0,.1)",
              fontSize:   ".95rem",
              lineHeight: 1.5,
            }}>
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
              <div style={{ fontSize: ".7rem", opacity: .7, marginTop: ".25rem", textAlign: "right" }}>
                {new Date(msg.timestamp).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: "flex", gap: ".75rem", padding: "1rem 1.5rem", borderTop: "1px solid #eee", background: "#fff" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          disabled={sending}
          style={{ flex: 1, padding: ".65rem 1rem", borderRadius: 24, border: "1.5px solid #ddd", fontSize: ".95rem", outline: "none" }}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          style={{ padding: ".65rem 1.5rem", background: "#1a6fbf", color: "#fff", border: "none", borderRadius: 24, fontWeight: 700, cursor: "pointer", opacity: sending || !text.trim() ? 0.6 : 1 }}
        >
          {sending ? "..." : "Enviar"}
        </button>
      </form>
    </main>
  );
}
