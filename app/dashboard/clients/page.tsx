"use client";

import { useEffect, useState } from "react";

interface Client {
  id:              string;
  name:            string;
  niche:           string;
  whatsapp_number: string;
  created_at:      string;
}

export default function ClientsPage() {
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Form state
  const [name,     setName]     = useState("");
  const [niche,    setNiche]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [formMsg,  setFormMsg]  = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function fetchClients() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/clients");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setClients(json.data ?? []);
    } catch {
      setError("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchClients(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);

    try {
      const res  = await fetch("/api/clients", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, niche, whatsapp_number: phone }),
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setFormMsg({ type: "ok", text: `Cliente "${json.data.name}" criado com sucesso!` });
      setName(""); setNiche(""); setPhone("");
      await fetchClients();
    } catch (err: unknown) {
      setFormMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao criar cliente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Clientes</h1>
        <a href="/dashboard" style={{ fontSize: ".9rem" }}>← Dashboard</a>
      </div>

      {/* Formulário de cadastro */}
      <section style={{ background: "#f9f9f9", border: "1px solid #ddd", borderRadius: 8, padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Novo Cliente</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Nome</label>
              <input
                required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Clínica Exemplo"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Nicho</label>
              <input
                required value={niche} onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: Clínica Odontológica"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>WhatsApp (com DDD)</label>
              <input
                required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 11999999999"
                style={inputStyle}
              />
            </div>
          </div>

          {formMsg && (
            <p style={{ margin: 0, color: formMsg.type === "ok" ? "#16a34a" : "#dc2626", fontSize: ".9rem" }}>
              {formMsg.text}
            </p>
          )}

          <div>
            <button type="submit" disabled={saving} style={btnStyle}>
              {saving ? "Salvando..." : "Cadastrar Cliente"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista de clientes */}
      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: ".75rem" }}>
          Clientes cadastrados ({clients.length})
        </h2>

        {error   && <p style={{ color: "red" }}>{error}</p>}
        {loading && <p style={{ color: "#888" }}>Carregando...</p>}

        {!loading && clients.length === 0 && (
          <p style={{ color: "#888" }}>Nenhum cliente cadastrado ainda.</p>
        )}

        {!loading && clients.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead style={{ background: "#f0f0f0" }}>
                <tr>
                  <th style={{ textAlign: "left" }}>Nome</th>
                  <th style={{ textAlign: "left" }}>Nicho</th>
                  <th style={{ textAlign: "left" }}>WhatsApp</th>
                  <th style={{ textAlign: "left" }}>Cadastrado em</th>
                  <th style={{ textAlign: "left" }}>URL da Landing Page</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const lpUrl = `${window.location.origin}/lp?client_id=${c.id}&utm_source=facebook&utm_medium=cpc&utm_campaign=`;
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.niche}</td>
                      <td>{c.whatsapp_number}</td>
                      <td style={{ fontSize: ".85rem", color: "#555" }}>
                        {c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                          <code style={{ fontSize: ".75rem", color: "#555", wordBreak: "break-all" }}>
                            ...lp?client_id={c.id}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(lpUrl);
                              alert(`URL copiada!\n\n${lpUrl}\n\nSubstitua o final pelo nome da sua campanha.`);
                            }}
                            style={{ whiteSpace: "nowrap", padding: "2px 8px", fontSize: ".8rem", cursor: "pointer" }}
                          >
                            Copiar URL
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: ".3rem", fontSize: ".9rem", fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: ".5rem .6rem", borderRadius: 5,
  border: "1px solid #ccc", fontSize: ".95rem", boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  background: "#1a6fbf", color: "#fff", border: "none",
  padding: ".6rem 1.5rem", borderRadius: 6, fontSize: ".95rem",
  cursor: "pointer",
};
