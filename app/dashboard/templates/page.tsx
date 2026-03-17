"use client";

import { useEffect, useState } from "react";

interface Template {
  id:      string;
  name:    string;
  type:    "status" | "followup";
  trigger: string;
  message: string;
}

const emptyForm = { name: "", type: "status" as const, trigger: "", message: "", niche: "" };

export default function TemplatesPage() {
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 900 }}>
      <h1>LeadsOS — Templates</h1>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
        <p style={{ margin: 0 }}>{loading ? "..." : `${templates.length} template(s)`}</p>
        <button onClick={() => { setShowForm((v) => !v); setFormError(null); }}>
          {showForm ? "Cancelar" : "Novo Template"}
        </button>
        <a href="/dashboard" style={{ fontSize: ".9rem" }}>← Voltar ao Dashboard</a>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3 style={{ margin: "0 0 1rem" }}>Novo Template</h3>

          {formError && <p style={{ color: "red", margin: "0 0 .75rem" }}>{formError}</p>}

          <div style={fieldStyle}>
            <label>Nome</label>
            <input name="name" value={form.name} onChange={handleChange} required
              style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <label>Tipo</label>
            <select name="type" value={form.type} onChange={handleChange} style={inputStyle}>
              <option value="status">status</option>
              <option value="followup">followup</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label>Trigger <small style={{ color: "#888" }}>(ex: contato, proposta, followup_1)</small></label>
            <input name="trigger" value={form.trigger} onChange={handleChange} required
              style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <label>Nicho <small style={{ color: "#888" }}>(opcional — usado pela IA)</small></label>
            <input name="niche" value={form.niche} onChange={handleChange}
              placeholder="ex: imobiliaria, restaurante"
              style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".25rem" }}>
              <label>Mensagem <small style={{ color: "#888" }}>(use {"{{name}}"} para variáveis)</small></label>
              <button
                type="button"
                onClick={generateMessage}
                disabled={generating || !form.trigger}
                style={{ fontSize: ".8rem", padding: ".25rem .6rem" }}
              >
                {generating ? "Gerando..." : "✨ Gerar com IA"}
              </button>
            </div>
            <textarea name="message" value={form.message} onChange={handleChange} required
              rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar Template"}
          </button>
        </form>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && templates.length === 0 && !showForm && (
        <p style={{ color: "#888" }}>Nenhum template cadastrado.</p>
      )}

      {templates.length > 0 && (
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead style={{ background: "#f0f0f0" }}>
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
                <td>{t.name}</td>
                <td>{t.type}</td>
                <td><code>{t.trigger}</code></td>
                <td style={{ whiteSpace: "pre-wrap", maxWidth: 400 }}>{t.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const formStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 6,
  padding: "1.25rem",
  marginBottom: "1.25rem",
  maxWidth: 480,
  background: "#fafafa",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: ".25rem",
  marginBottom: ".75rem",
};

const inputStyle: React.CSSProperties = {
  padding: ".4rem .6rem",
  boxSizing: "border-box",
  width: "100%",
};
