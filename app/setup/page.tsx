"use client";

import { useState } from "react";

/**
 * PÁGINA TEMPORÁRIA — apagar após criar o usuário admin.
 * Acesse /setup, preencha os dados e clique em Criar Admin.
 */
export default function SetupPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus]     = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (json.success) {
        setStatus("ok");
        setMessage(`✅ Admin criado com sucesso! Email: ${json.data.email}`);
      } else {
        setStatus("error");
        setMessage(`❌ Erro: ${json.error}`);
      }
    } catch {
      setStatus("error");
      setMessage("❌ Erro de conexão.");
    }
  }

  return (
    <main style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#f5f5f5", fontFamily: "sans-serif",
    }}>
      <div style={{
        background: "#fff", padding: "2.5rem", borderRadius: 10,
        boxShadow: "0 2px 16px rgba(0,0,0,0.10)", width: "100%", maxWidth: 400,
      }}>
        <h2 style={{ marginTop: 0, marginBottom: ".25rem" }}>LeadsOS — Setup Admin</h2>
        <p style={{ color: "#888", fontSize: ".9rem", marginBottom: "1.5rem" }}>
          Use esta página uma única vez para criar o usuário administrador.
        </p>

        {status === "ok" ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#16a34a", fontWeight: "bold", fontSize: "1.1rem" }}>{message}</p>
            <p style={{ color: "#555", fontSize: ".9rem" }}>
              Agora acesse <a href="/login">/login</a> com suas credenciais.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: ".35rem", fontWeight: 500 }}>Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: ".6rem .75rem", borderRadius: 6, border: "1px solid #ddd", fontSize: "1rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: ".35rem", fontWeight: 500 }}>Senha</label>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: ".6rem .75rem", borderRadius: 6, border: "1px solid #ddd", fontSize: "1rem", boxSizing: "border-box" }}
              />
            </div>
            {status === "error" && (
              <p style={{ color: "#dc2626", margin: 0, fontSize: ".9rem" }}>{message}</p>
            )}
            <button
              type="submit" disabled={status === "loading"}
              style={{
                background: "#1a6fbf", color: "#fff", border: "none",
                padding: ".75rem", borderRadius: 6, fontSize: "1rem",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
              }}
            >
              {status === "loading" ? "Criando..." : "Criar Admin"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
