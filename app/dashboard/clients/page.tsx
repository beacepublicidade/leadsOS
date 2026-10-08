"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Client {
  id:                    string;
  name:                  string;
  niche:                 string;
  whatsapp_number:       string;
  brand_color?:          string;
  created_at:            string;
  facebook_page_id?:     string;
  facebook_page_token?:  string;
  lp_headline?:          string;
  lp_subheadline?:       string;
  lp_cta_button?:        string;
  lp_logo_url?:          string;
}

interface EditState {
  id:                   string;
  name:                 string;
  niche:                string;
  whatsapp_number:      string;
  brand_color:          string;
  facebook_page_id:     string;
  facebook_page_token:  string;
  lp_headline:          string;
  lp_subheadline:       string;
  lp_cta_button:        string;
  lp_logo_url:          string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Form state
  const [name,       setName]       = useState("");
  const [niche,      setNiche]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [brandColor, setBrandColor] = useState("#1a6fbf");
  const [saving,     setSaving]     = useState(false);
  const [formMsg,    setFormMsg]    = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [portalLoading, setPortalLoading] = useState<string | null>(null);
  const [portalMsg,     setPortalMsg]     = useState<{ id: string; type: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  async function copyPortalLink(clientId: string) {
    setPortalLoading(clientId);
    setPortalMsg(null);
    try {
      const res  = await fetch("/api/portal/token", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ client_id: clientId }),
      });
      const json = await res.json() as { token?: string; error?: string };
      if (!json.token) throw new Error(json.error ?? "Erro");
      const url = `${window.location.origin}/portal?t=${json.token}`;
      await navigator.clipboard.writeText(url);
      setPortalMsg({ id: clientId, type: "ok", text: "Link copiado!" });
      setTimeout(() => setPortalMsg(null), 3000);
    } catch (err) {
      setPortalMsg({ id: clientId, type: "error", text: err instanceof Error ? err.message : "Erro ao gerar link." });
    } finally {
      setPortalLoading(null);
    }
  }

  // Edit state
  const [editing,    setEditing]    = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg,    setEditMsg]    = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((json) => {
      const user = json.user;
      if (user?.client_id && user?.profile !== "admin") router.replace("/dashboard");
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        body:    JSON.stringify({ name, niche, whatsapp_number: phone, brand_color: brandColor }),
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setFormMsg({ type: "ok", text: `Cliente "${json.data.name}" criado com sucesso!` });
      setName(""); setNiche(""); setPhone(""); setBrandColor("#1a6fbf");
      await fetchClients();
    } catch (err: unknown) {
      setFormMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao criar cliente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditMsg(null);

    try {
      const res  = await fetch(`/api/clients/${editing.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:                 editing.name,
          niche:                editing.niche,
          whatsapp_number:      editing.whatsapp_number,
          brand_color:          editing.brand_color,
          facebook_page_id:     editing.facebook_page_id,
          facebook_page_token:  editing.facebook_page_token,
          lp_headline:          editing.lp_headline,
          lp_subheadline:       editing.lp_subheadline,
          lp_cta_button:        editing.lp_cta_button,
          lp_logo_url:          editing.lp_logo_url,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEditMsg({ type: "ok", text: "Salvo com sucesso!" });
      await fetchClients();
      setTimeout(() => { setEditing(null); setEditMsg(null); }, 800);
    } catch (err: unknown) {
      setEditMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string, clientName: string) {
    setConfirmDelete({ id, name: clientName });
  }

  async function doDelete(id: string) {
    setConfirmDelete(null);
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchClients();
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <a href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</a>
      </div>

      {/* Formulário de cadastro */}
      <section className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1.25rem" }}>
          Novo Cliente
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="input-label">Nome</label>
              <input
                className="input"
                required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Clínica Exemplo"
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="input-label">Nicho</label>
              <input
                className="input"
                required value={niche} onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: Clínica Odontológica"
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="input-label">WhatsApp (com DDD)</label>
              <input
                className="input"
                required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 11999999999"
              />
            </div>
            <div style={{ flex: "0 0 auto" }}>
              <label className="input-label">Cor da marca</label>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <input
                  type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                  style={{ width: 42, height: 38, padding: 2, border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", background: "transparent" }}
                />
                <span style={{ fontSize: ".85rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>{brandColor}</span>
              </div>
            </div>
          </div>

          {formMsg && (
            <p style={{ margin: 0, color: formMsg.type === "ok" ? "#4ade80" : "#f87171", fontSize: ".9rem" }}>
              {formMsg.text}
            </p>
          )}

          <div>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Salvando..." : "Cadastrar Cliente"}
            </button>
          </div>
        </form>
      </section>

      {/* Lista de clientes */}
      <section>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: ".75rem" }}>
          Clientes cadastrados ({clients.length})
        </h2>

        {error   && <p style={{ color: "#f87171" }}>{error}</p>}
        {loading && <p style={{ color: "var(--text-secondary)" }}>Carregando...</p>}

        {!loading && clients.length === 0 && (
          <div className="empty-state">
            <p>Nenhum cliente cadastrado ainda.</p>
          </div>
        )}

        {!loading && clients.length > 0 && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Nicho</th>
                  <th>WhatsApp</th>
                  <th>Cadastrado em</th>
                  <th>URL da Landing Page</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const lpUrl = `${window.location.origin}/lp?client_id=${c.id}&utm_source=facebook&utm_medium=cpc&utm_campaign=`;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: ".9rem" }}>{c.niche}</td>
                      <td>{c.whatsapp_number}</td>
                      <td style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>
                        {c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                          <code style={{ fontSize: ".75rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                            ...lp?client_id={c.id}
                          </code>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              navigator.clipboard.writeText(lpUrl);
                            }}
                          >
                            Copiar URL
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditing({ id: c.id, name: c.name, niche: c.niche, whatsapp_number: c.whatsapp_number, brand_color: c.brand_color ?? "#1a6fbf", facebook_page_id: c.facebook_page_id ?? "", facebook_page_token: c.facebook_page_token ?? "", lp_headline: c.lp_headline ?? "", lp_subheadline: c.lp_subheadline ?? "", lp_cta_button: c.lp_cta_button ?? "", lp_logo_url: c.lp_logo_url ?? "" })}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: "var(--accent)", color: "#fff", border: "none" }}
                            onClick={() => router.push(`/dashboard/lp-editor/${c.id}`)}
                          >
                            🖊️ LP
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: "#0f4c2a", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}
                            onClick={() => copyPortalLink(c.id)}
                            disabled={portalLoading === c.id}
                            title="Copiar link do portal do cliente"
                          >
                            {portalLoading === c.id ? "..." : "🔗 Portal"}
                          </button>
                          {portalMsg?.id === c.id && (
                            <span style={{ fontSize: 11, color: portalMsg.type === "ok" ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                              {portalMsg.text}
                            </span>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={deletingId === c.id}
                          >
                            🗑️
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

      {/* Modal de edição */}
      {editing && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <h2 className="modal-title">Editar Cliente</h2>
            <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <div>
                <label className="input-label">Nome</label>
                <input
                  className="input"
                  required
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <label className="input-label">Nicho</label>
                <input
                  className="input"
                  required
                  value={editing.niche}
                  onChange={(e) => setEditing({ ...editing, niche: e.target.value })}
                  placeholder="Ex: Clínica Odontológica"
                />
              </div>
              <div>
                <label className="input-label">WhatsApp (com DDD)</label>
                <input
                  className="input"
                  required
                  value={editing.whatsapp_number}
                  onChange={(e) => setEditing({ ...editing, whatsapp_number: e.target.value })}
                  placeholder="Ex: 11999999999"
                />
              </div>
              <div>
                <label className="input-label">Cor da marca</label>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                  <input
                    type="color" value={editing.brand_color}
                    onChange={(e) => setEditing({ ...editing, brand_color: e.target.value })}
                    style={{ width: 42, height: 38, padding: 2, border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", background: "transparent" }}
                  />
                  <span style={{ fontSize: ".85rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>{editing.brand_color}</span>
                </div>
              </div>

              {/* Landing Page */}
              <div className="divider" />
              <p style={{ margin: "0 0 .5rem", fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                Landing Page
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                <div>
                  <label className="input-label">Título (headline)</label>
                  <input className="input" value={editing.lp_headline} onChange={(e) => setEditing({ ...editing, lp_headline: e.target.value })}
                    placeholder="Ex: Transforme sua empresa com IA" />
                </div>
                <div>
                  <label className="input-label">Subtítulo</label>
                  <input className="input" value={editing.lp_subheadline} onChange={(e) => setEditing({ ...editing, lp_subheadline: e.target.value })}
                    placeholder="Ex: Preencha seus dados e fale com um especialista" />
                </div>
                <div>
                  <label className="input-label">Texto do botão</label>
                  <input className="input" value={editing.lp_cta_button} onChange={(e) => setEditing({ ...editing, lp_cta_button: e.target.value })}
                    placeholder="Ex: Quero saber mais →" />
                </div>
                <div>
                  <label className="input-label">URL do logo</label>
                  <input className="input" value={editing.lp_logo_url} onChange={(e) => setEditing({ ...editing, lp_logo_url: e.target.value })}
                    placeholder="https://..." />
                  <p style={{ margin: ".3rem 0 0", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                    Link direto para imagem (JPG/PNG). Use imgur, Cloudinary, etc.
                  </p>
                </div>
              </div>

              {/* Integração Meta Ads */}
              <div className="divider" />
              <p style={{ margin: "0 0 .5rem", fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                Integração Meta Ads
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                <div>
                  <label className="input-label">Facebook Page ID</label>
                  <input
                    className="input"
                    value={editing.facebook_page_id}
                    onChange={(e) => setEditing({ ...editing, facebook_page_id: e.target.value })}
                    placeholder="Ex: 123456789012345"
                  />
                </div>
                <div>
                  <label className="input-label">Page Access Token</label>
                  <input
                    className="input"
                    type="password"
                    value={editing.facebook_page_token}
                    onChange={(e) => setEditing({ ...editing, facebook_page_token: e.target.value })}
                    placeholder="EAAxxxxxxx..."
                    autoComplete="off"
                  />
                  <p style={{ margin: ".3rem 0 0", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                    Obtido no Meta Business Suite → Configurações → Páginas → Token de acesso
                  </p>
                </div>
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
          title="Excluir cliente"
          message={`Excluir o cliente "${confirmDelete.name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={() => doDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </main>
  );
}
