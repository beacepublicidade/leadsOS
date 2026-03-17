"use client";

import { useEffect, useState } from "react";

interface UtmParams {
  client_id:    string;
  utm_source:   string;
  utm_medium:   string;
  utm_campaign: string;
  utm_content:  string;
  utm_term:     string;
}

export default function LandingPage() {
  const [form, setForm]       = useState({ name: "", phone: "", email: "" });
  const [utms, setUtms]       = useState<UtmParams>({ client_id: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Captura UTMs e client_id da URL automaticamente ao carregar a página
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setUtms({
      client_id:    p.get("client_id")    ?? "",
      utm_source:   p.get("utm_source")   ?? "",
      utm_medium:   p.get("utm_medium")   ?? "",
      utm_campaign: p.get("utm_campaign") ?? "",
      utm_content:  p.get("utm_content")  ?? "",
      utm_term:     p.get("utm_term")     ?? "",
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res  = await fetch("/api/lp/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, ...utms }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Erro ao enviar.");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        {success ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Recebemos seus dados!</h2>
            <p style={styles.successText}>
              Já vamos te chamar no WhatsApp 🙂
            </p>
          </div>
        ) : (
          <>
            <h1 style={styles.title}>Fale com a gente</h1>
            <p style={styles.subtitle}>
              Preencha seus dados e entraremos em contato rapidinho pelo WhatsApp.
            </p>

            <form onSubmit={handleSubmit} style={styles.form} noValidate>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="name">Nome *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Seu nome completo"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="phone">WhatsApp *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="(11) 99999-9999"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="email">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  style={styles.input}
                />
              </div>

              {error && <p style={styles.errorText}>{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                style={{ ...styles.button, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Enviando..." : "Quero ser contactado →"}
              </button>
            </form>

            <p style={styles.disclaimer}>
              Seus dados estão seguros. Não enviamos spam.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:       "100vh",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    background:      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding:         "1.5rem",
    fontFamily:      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxSizing:       "border-box",
  },
  card: {
    background:   "#fff",
    borderRadius: 16,
    padding:      "2.5rem 2rem",
    width:        "100%",
    maxWidth:     440,
    boxShadow:    "0 20px 60px rgba(0,0,0,.15)",
  },
  title: {
    margin:     "0 0 .5rem",
    fontSize:   "1.75rem",
    fontWeight: 700,
    color:      "#1a1a2e",
    textAlign:  "center",
  },
  subtitle: {
    margin:     "0 0 1.75rem",
    color:      "#666",
    textAlign:  "center",
    lineHeight: 1.5,
    fontSize:   ".95rem",
  },
  form: {
    display:       "flex",
    flexDirection: "column",
    gap:           "1rem",
  },
  field: {
    display:       "flex",
    flexDirection: "column",
    gap:           ".3rem",
  },
  label: {
    fontSize:   ".85rem",
    fontWeight: 600,
    color:      "#333",
  },
  input: {
    padding:      ".75rem 1rem",
    borderRadius: 8,
    border:       "1.5px solid #ddd",
    fontSize:     "1rem",
    outline:      "none",
    transition:   "border-color .2s",
    boxSizing:    "border-box",
    width:        "100%",
  },
  errorText: {
    color:     "#dc2626",
    fontSize:  ".875rem",
    margin:    0,
  },
  button: {
    marginTop:    ".5rem",
    padding:      ".9rem",
    background:   "linear-gradient(135deg, #667eea, #764ba2)",
    color:        "#fff",
    border:       "none",
    borderRadius: 8,
    fontSize:     "1rem",
    fontWeight:   700,
    cursor:       "pointer",
    width:        "100%",
  },
  disclaimer: {
    marginTop:  "1.25rem",
    textAlign:  "center",
    fontSize:   ".8rem",
    color:      "#aaa",
  },
  successBox: {
    textAlign: "center",
    padding:   "1rem 0",
  },
  successIcon: {
    fontSize:     "3rem",
    marginBottom: ".75rem",
  },
  successTitle: {
    margin:     "0 0 .75rem",
    fontSize:   "1.5rem",
    fontWeight: 700,
    color:      "#1a1a2e",
  },
  successText: {
    color:      "#555",
    fontSize:   "1.05rem",
    lineHeight: 1.6,
    margin:     0,
  },
};
