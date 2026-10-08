"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Template {
  id:      string;
  name:    string;
  type:    "status" | "followup";
  trigger: string;
  message: string;
}

const emptyForm = { name: "", type: "status" as const, trigger: "", message: "", niche: "" };

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((json) => {
      const user = json.user;
      if (user?.client_id && user?.profile !== "admin") router.replace("/dashboard");
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res  = await fetch("/api/templates");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setTemplates(json.data);
    } catch {
      setError("Erro ao carregar templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTemplates(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res  = await fetch("/api/templates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro ao salvar");

      setForm(emptyForm);
      setShowForm(false);
      await fetchTemplates();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function generateMessage() {
    if (!form.trigger) {
      setFormError("Preencha o campo Trigger antes de gerar com IA.");
      return;
    }
    setGenerating(true);
    setFormError(null);
    try {
      const res  = await fetch("/api/ai/suggest-message", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: form.type, trigger: form.trigger, niche: form.niche || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro ao gerar mensagem");
      setForm((prev) => ({ ...prev, message: json.message }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao gerar mensagem com IA");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Templates</h1>
        <a href="/dashboard" className="btn btn-ghost btn-sm">← Voltar ao Dashboard</a>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: ".9rem" }}>
          {loading ? "..." : `${templates.length} template(s)`}
        </span>
        <button
          className={showForm ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"}
          onClick={() => { setShowForm((v) => !v); setFormError(null); }}
        >
          {showForm ? "Cancelar" : "+ Novo Template"}
        </button>
      </div>

      {showForm && (
        <section className="card" style={{ maxWidth: 520, marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Novo Template
          </h3>

          {formError && (
            <p style={{ color: "#f87171", margin: "0 0 .75rem", fontSize: ".9rem" }}>{formError}</p>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            <div>
              <label className="input-label">Nome</label>
              <input className="input" name="name" value={form.name} onChange={handleChange} required />
            </div>

            <div>
              <label className="input-label">Tipo</label>
              <select className="select" name="type" value={form.type} onChange={handleChange}>
                <option value="status">status</option>
                <option value="followup">followup</option>
              </select>
            </div>

            <div>
              <label className="input-label">
                Trigger <small style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(ex: contato, proposta, followup_1)</small>
              </label>
              <input className="input" name="trigger" value={form.trigger} onChange={handleChange} required />
            </div>

            <div>
              <label className="input-label">
                Nicho <small style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(opcional — usado pela IA)</small>
              </label>
              <input className="input" name="niche" value={form.niche} onChange={handleChange}
                placeholder="ex: imobiliaria, restaurante" />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".35rem" }}>
                <label className="input-label" style={{ margin: 0 }}>
                  Mensagem <small style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(use {"{{name}}"} para variáveis)</small>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={generateMessage}
                  disabled={generating || !form.trigger}
                >
                  {generating ? "Gerando..." : "✨ Gerar com IA"}
                </button>
              </div>
              <textarea className="textarea" name="message" value={form.message} onChange={handleChange} required
                rows={4} style={{ resize: "vertical" }} />
            </div>

            <div>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? "Salvando..." : "Salvar Template"}
              </button>
            </div>
          </form>
        </section>
      )}

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {!loading && templates.length === 0 && !showForm && (
        <div className="empty-state">
          <p>Nenhum template cadastrado.</p>
        </div>
      )}

      {templates.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Trigger</th>
                <th>Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>
                    <span className={t.type === "followup" ? "badge badge-accent" : "badge badge-default"}>
                      {t.type}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: ".82rem", color: "var(--text-secondary)", background: "var(--bg-base)", padding: "2px 6px", borderRadius: 4 }}>
                      {t.trigger}
                    </code>
                  </td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 400, fontSize: ".88rem", color: "var(--text-secondary)" }}>
                    {t.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
