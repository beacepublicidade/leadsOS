"use client";

import { useEffect, useState } from "react";

interface User {
  id:         string;
  email:      string;
  client_id:  string | null;
  created_at: string;
}

interface Client {
  id:   string;
  name: string;
}

export default function UsersPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Form state
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [clientId,  setClientId]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [formMsg,   setFormMsg]   = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [resUsers, resClients] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/clients"),
      ]);
      const [jsonUsers, jsonClients] = await Promise.all([resUsers.json(), resClients.json()]);
      if (!jsonUsers.success)   throw new Error(jsonUsers.error);
      setUsers(jsonUsers.data   ?? []);
      setClients(jsonClients.data ?? []);
    } catch {
      setError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);

    try {
      const res  = await fetch("/api/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email,
          password,
          client_id: clientId || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setFormMsg({ type: "ok", text: `Usuário "${json.data.email}" criado com sucesso!` });
      setEmail(""); setPassword(""); setClientId("");
      await fetchAll();
    } catch (err: unknown) {
      setFormMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao criar usuário." });
    } finally {
      setSaving(false);
    }
  }

  function clientName(id: string | null) {
    if (!id) return "Admin (sem cliente)";
    return clients.find((c) => c.id === id)?.name ?? id;
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Usuários</h1>
        <a href="/dashboard" style={{ fontSize: ".9rem" }}>← Dashboard</a>
      </div>

      {/* Formulário de cadastro */}
      <section style={{ background: "#f9f9f9", border: "1px solid #ddd", borderRadius: 8, padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Novo Usuário</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>Senha</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>Cliente (opcional)</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
                <option value="">Admin — acesso total</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {formMsg && (
            <p style={{ margin: 0, color: formMsg.type === "ok" ? "#16a34a" : "#dc2626", fontSize: ".9rem" }}>
              {formMsg.text}
            </p>
          )}

          <div>
            <button type="submit" disabled={saving} style={btnStyle}>
              {saving ? "Salvando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista de usuários */}
      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: ".75rem" }}>
          Usuários cadastrados ({users.length})
        </h2>

        {error   && <p style={{ color: "red" }}>{error}</p>}
        {loading && <p style={{ color: "#888" }}>Carregando...</p>}

        {!loading && users.length === 0 && (
          <p style={{ color: "#888" }}>Nenhum usuário encontrado.</p>
        )}

        {!loading && users.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead style={{ background: "#f0f0f0" }}>
                <tr>
                  <th style={{ textAlign: "left" }}>Email</th>
                  <th style={{ textAlign: "left" }}>Perfil</th>
                  <th style={{ textAlign: "left" }}>Cadastrado em</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <span style={{
                        background: u.client_id ? "#e0f2fe" : "#fef3c7",
                        color:      u.client_id ? "#0369a1" : "#92400e",
                        borderRadius: 4, padding: "2px 8px", fontSize: ".8rem", fontWeight: "bold",
                      }}>
                        {clientName(u.client_id)}
                      </span>
                    </td>
                    <td style={{ fontSize: ".85rem", color: "#555" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))}
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
