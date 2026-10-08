"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface User {
  id:         string;
  email:      string;
  name?:      string;
  profile?:   string;
  client_id:  string | null;
  created_at: string;
}

interface Client {
  id:   string;
  name: string;
}

interface EditState {
  id:        string;
  email:     string;
  name:      string;
  profile:   string;
  password:  string;
  client_id: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users,   setUsers]   = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Create form
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [profile,  setProfile]  = useState("vendedor");
  const [clientId, setClientId] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [formMsg,  setFormMsg]  = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Edit state
  const [editing,    setEditing]    = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg,    setEditMsg]    = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((json) => {
      const user = json.user;
      if (user?.client_id && user?.profile !== "admin") router.replace("/dashboard");
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [resUsers, resClients] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/clients"),
      ]);
      const [jsonUsers, jsonClients] = await Promise.all([resUsers.json(), resClients.json()]);
      if (!jsonUsers.success) throw new Error(jsonUsers.error);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);
    try {
      const res  = await fetch("/api/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, name, profile, client_id: clientId || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setFormMsg({ type: "ok", text: `Usuário "${json.data.email}" criado!` });
      setEmail(""); setPassword(""); setName(""); setProfile("vendedor"); setClientId("");
      await fetchAll();
    } catch (err: unknown) {
      setFormMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao criar usuário." });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditMsg(null);

    const body: Record<string, string | null> = {
      name:      editing.name,
      profile:   editing.profile,
      client_id: editing.client_id || null,
    };
    if (editing.password) body.password = editing.password;

    try {
      const res  = await fetch(`/api/users/${editing.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEditMsg({ type: "ok", text: "Salvo com sucesso!" });
      await fetchAll();
      setTimeout(() => { setEditing(null); setEditMsg(null); }, 800);
    } catch (err: unknown) {
      setEditMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string, email: string) {
    setConfirmDelete({ id, email });
  }

  async function doDelete(id: string) {
    setConfirmDelete(null);
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchAll();
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeletingId(null);
    }
  }

  function clientName(id: string | null) {
    if (!id) return "Admin";
    return clients.find((c) => c.id === id)?.name ?? id;
  }

  function profileBadgeClass(p?: string) {
    if (p === "admin")   return "badge badge-warning";
    if (p === "gestor")  return "badge badge-accent";
    return "badge badge-default";
  }

  const PROFILES = ["vendedor", "admin", "gestor"];

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Usuários</h1>
        <a href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</a>
      </div>

      {/* Formulário de cadastro */}
      <section className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1.25rem" }}>
          Novo Usuário
        </h2>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="input-label">Nome</label>
              <input
                className="input"
                required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="input-label">Senha</label>
              <input
                className="input"
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" minLength={6}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="input-label">Perfil</label>
              <select className="select" value={profile} onChange={(e) => setProfile(e.target.value)}>
                {PROFILES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="input-label">Cliente (opcional)</label>
              <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Admin — acesso total</option>
                {clients.length === 0
                  ? <option disabled>Nenhum cliente cadastrado</option>
                  : clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
                }
              </select>
            </div>
          </div>

          {formMsg && (
            <p style={{ margin: 0, color: formMsg.type === "ok" ? "#4ade80" : "#f87171", fontSize: ".9rem" }}>
              {formMsg.text}
            </p>
          )}

          <div>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Salvando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista */}
      <section>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: ".75rem" }}>
          Usuários cadastrados ({users.length})
        </h2>

        {error   && <p style={{ color: "#f87171" }}>{error}</p>}
        {loading && <p style={{ color: "var(--text-secondary)" }}>Carregando...</p>}

        {!loading && users.length === 0 && (
          <div className="empty-state">
            <p>Nenhum usuário encontrado.</p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Perfil</th>
                  <th>Cliente</th>
                  <th>Cadastrado em</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name || "—"}</td>
                    <td style={{ fontSize: ".9rem", color: "var(--text-secondary)" }}>{u.email}</td>
                    <td>
                      <span className={profileBadgeClass(u.profile)}>
                        {u.profile ?? "vendedor"}
                      </span>
                    </td>
                    <td style={{ fontSize: ".85rem" }}>{clientName(u.client_id)}</td>
                    <td style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditing({ id: u.id, email: u.email, name: u.name ?? "", profile: u.profile ?? "vendedor", password: "", client_id: u.client_id ?? "" })}
                      >
                        Editar
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(u.id, u.email)}
                        disabled={deletingId === u.id}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de edição */}
      {editing && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <h2 className="modal-title">Editar Usuário</h2>
            <p style={{ margin: "0 0 1rem", fontSize: ".85rem", color: "var(--text-secondary)", background: "var(--bg-base)", padding: ".4rem .75rem", borderRadius: 6 }}>
              ✉️ {editing.email}
            </p>
            <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <div>
                <label className="input-label">Nome</label>
                <input
                  className="input"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="input-label">Perfil</label>
                <select
                  className="select"
                  value={editing.profile}
                  onChange={(e) => setEditing({ ...editing, profile: e.target.value })}
                >
                  {PROFILES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Empresa</label>
                <select
                  className="select"
                  value={editing.client_id}
                  onChange={(e) => setEditing({ ...editing, client_id: e.target.value })}
                >
                  <option value="">Admin — acesso total</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">
                  Nova senha <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(deixe em branco para manter)</span>
                </label>
                <input
                  className="input"
                  type="password"
                  value={editing.password}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                  placeholder="Nova senha..."
                  minLength={6}
                />
              </div>

              {editMsg && (
                <p style={{ margin: 0, color: editMsg.type === "ok" ? "#4ade80" : "#f87171", fontSize: ".9rem" }}>
                  {editMsg.text}
                </p>
              )}

              <div style={{ display: "flex", gap: ".75rem", justifyContent: "flex-end", marginTop: ".5rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setEditMsg(null); }}>
                  Cancelar
                </button>
                <button type="submit" disabled={editSaving} className="btn btn-primary">
                  {editSaving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir usuário"
          message={`Excluir o usuário "${confirmDelete.email}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={() => doDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </main>
  );
}
