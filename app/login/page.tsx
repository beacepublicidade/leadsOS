"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error ?? "Erro ao entrar.");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>LeadsOS</h1>
        <p style={styles.subtitle}>Entre na sua conta</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="seu@email.com"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:      "100vh",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    background:     "#f5f5f5",
    fontFamily:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding:        "1rem",
  },
  card: {
    background:   "#fff",
    borderRadius: 12,
    padding:      "2.5rem 2rem",
    width:        "100%",
    maxWidth:     380,
    boxShadow:    "0 4px 24px rgba(0,0,0,.08)",
  },
  title: {
    margin:     "0 0 .25rem",
    fontSize:   "1.75rem",
    fontWeight: 700,
    textAlign:  "center",
    color:      "#1a1a2e",
  },
  subtitle: {
    margin:    "0 0 2rem",
    textAlign: "center",
    color:     "#888",
    fontSize:  ".9rem",
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
    boxSizing:    "border-box",
    width:        "100%",
    outline:      "none",
  },
  error: {
    color:    "#dc2626",
    fontSize: ".875rem",
    margin:   0,
  },
  button: {
    marginTop:    ".25rem",
    padding:      ".85rem",
    background:   "#1a1a2e",
    color:        "#fff",
    border:       "none",
    borderRadius: 8,
    fontSize:     "1rem",
    fontWeight:   700,
    cursor:       "pointer",
    width:        "100%",
  },
};
