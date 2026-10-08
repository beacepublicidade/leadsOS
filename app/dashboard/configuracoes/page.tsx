"use client";

import { useEffect, useRef, useState } from "react";

interface Settings {
  company_name:         string;
  cnpj:                 string;
  phone1:               string;
  phone2:               string;
  email:                string;
  website:              string;
  address_street:       string;
  address_number:       string;
  address_complement:   string;
  address_neighborhood: string;
  address_city:         string;
  address_state:        string;
  address_zip:          string;
  pix_key:              string;
  pix_holder:           string;
  pix_document:         string;
  primary_color:        string;
  logo_base64:          string;
}

interface Client { id: string; name: string; }
interface ClientUser { id: string; name: string; email: string; profile: string; }

const EMPTY: Settings = {
  company_name: "", cnpj: "", phone1: "", phone2: "",
  email: "", website: "",
  address_street: "", address_number: "", address_complement: "",
  address_neighborhood: "", address_city: "", address_state: "", address_zip: "",
  pix_key: "", pix_holder: "", pix_document: "",
  primary_color: "#6c63ff", logo_base64: "",
};

export default function ConfiguracoesPage() {
  const [form,       setForm]       = useState<Settings>(EMPTY);
  const [clients,    setClients]    = useState<Client[]>([]);
  const [clientId,   setClientId]   = useState<string>("");
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");
  const [logoPreview,  setLogoPreview]  = useState("");
  const [clientUsers,  setClientUsers]  = useState<ClientUser[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load user info
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(j => {
      if (j.user) {
        const admin = j.user.profile === "admin" || !j.user.client_id;
        setIsAdmin(admin);
        if (!admin && j.user.client_id) {
          setClientId(j.user.client_id);
        }
      }
    });
  }, []);

  // Load clients list (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/clients").then(r => r.json()).then(j => {
      const list = j.data ?? [];
      setClients(list);
      if (list.length > 0 && !clientId) setClientId(list[0].id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Load settings + users when clientId changes
  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    setClientUsers([]);
    Promise.all([
      fetch(`/api/settings?client_id=${clientId}`).then(r => r.json()),
      fetch(`/api/users?client_id=${clientId}`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([settingsRes, usersRes]) => {
      if (settingsRes.success) {
        const d = settingsRes.data as Partial<Settings>;
        setForm({ ...EMPTY, ...d });
        setLogoPreview(d.logo_base64 ?? "");
      }
      setClientUsers(usersRes.data ?? []);
    }).finally(() => setLoading(false));
  }, [clientId]);

  const TITLE_CASE_FIELDS: (keyof Settings)[] = [
    "company_name", "address_street", "address_complement",
    "address_neighborhood", "address_city", "pix_holder",
  ];
  function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  function set(key: keyof Settings, val: string) {
    const formatted = TITLE_CASE_FIELDS.includes(key) ? toTitleCase(val) : val;
    setForm(f => ({ ...f, [key]: formatted }));
  }

  async function handleCepBlur(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setForm(f => ({
        ...f,
        address_street:       data.logradouro ?? f.address_street,
        address_neighborhood: data.bairro      ?? f.address_neighborhood,
        address_city:         data.localidade  ?? f.address_city,
        address_state:        data.uf          ?? f.address_state,
      }));
    } catch { /* silencioso */ }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000) { setError("Arquivo muito grande. Máximo: 4MB."); return; }
    setError("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Encaixa dentro de 800×200 mantendo proporção
        const MAX_W = 800, MAX_H = 200;
        const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
        const w = Math.round(img.width  * ratio);
        const h = Math.round(img.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, w, h); // fundo transparente
        ctx.drawImage(img, 0, 0, w, h);

        const result = canvas.toDataURL("image/png");
        setLogoPreview(result);
        setForm(f => ({ ...f, logo_base64: result }));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview("");
    setForm(f => ({ ...f, logo_base64: "" }));
    if (fileRef.current) fileRef.current.value = "";
  }

  const checks = [
    { label: "Logo",          done: !!form.logo_base64 },
    { label: "Nome da empresa", done: !!form.company_name },
    { label: "CNPJ",          done: !!form.cnpj },
    { label: "Telefone",      done: !!form.phone1 },
    { label: "E-mail",        done: !!form.email },
    { label: "Site",          done: !!form.website },
    { label: "Endereço",      done: !!(form.address_street && form.address_city) },
    { label: "PIX / Pagamento", done: !!form.pix_key },
  ];
  const completePct = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  async function handleSave() {
    if (!clientId) return;
    setSaving(true);
    setError("");
    try {
      const res  = await fetch("/api/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, client_id: clientId }),
      });
      const json = await res.json();
      if (json.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError(json.error ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Configurações</h1>
          <p className="page-subtitle">Perfil da empresa, identidade visual e dados para documentos</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={saving || !clientId}
          onClick={handleSave}
        >
          {saving ? "Salvando..." : saved ? "✓ Salvo!" : "💾 Salvar configurações"}
        </button>
      </div>

      {/* Seletor de empresa (admin geral) */}
      {isAdmin && clients.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">🏢 Selecionando empresa</span>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "0 0 300px" }}>
              <label className="input-label">Empresa</label>
              <select
                className="select"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
              >
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {clientId && !loading && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ padding: "6px 14px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>Usuários cadastrados: </span>
                  <span style={{ fontWeight: 700, color: clientUsers.length > 0 ? "var(--success)" : "var(--warning)" }}>
                    {clientUsers.length}
                  </span>
                </div>
                <div style={{ padding: "6px 14px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>Configurações: </span>
                  <span style={{ fontWeight: 700, color: completePct === 100 ? "var(--success)" : completePct >= 50 ? "var(--warning)" : "var(--error, #ef4444)" }}>
                    {completePct}% completo
                  </span>
                </div>
                {clientUsers.length === 0 && (
                  <div style={{ padding: "6px 14px", background: "var(--warning-light, #2d2000)", border: "1px solid var(--warning)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--warning)" }}>
                    ⚠️ Nenhum usuário cadastrado para esta empresa
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Lista resumida de usuários */}
          {clientUsers.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {clientUsers.map(u => (
                <div key={u.id} style={{
                  padding: "4px 10px", background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                  borderRadius: "var(--radius-full)", fontSize: 11, color: "var(--accent)",
                }}>
                  {u.name} <span style={{ opacity: 0.7 }}>· {u.profile}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--error-light, #2d1111)", border: "1px solid var(--error, #ef4444)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--error, #ef4444)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3" style={{ padding: "32px 0" }}>
          <div className="spinner" />
          <span className="text-secondary text-sm">Carregando configurações...</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Checklist de completude */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {completePct === 100 ? "✅" : completePct >= 50 ? "🔄" : "⚠️"} Status das configurações
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: completePct === 100 ? "var(--success)" : completePct >= 50 ? "var(--warning)" : "var(--error, #ef4444)" }}>
                {completePct}% completo
              </span>
            </div>
            {completePct < 100 && (
              <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
                Preencha todos os campos abaixo para que o timbrado das propostas saia completo.
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {checks.map(c => (
                <div key={c.label} style={{
                  padding: "4px 10px", borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 600,
                  background: c.done ? "var(--success-light, #0d2d1a)" : "var(--bg-base)",
                  border: `1px solid ${c.done ? "var(--success)" : "var(--border)"}`,
                  color: c.done ? "var(--success)" : "var(--text-muted)",
                }}>
                  {c.done ? "✓" : "○"} {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* Logo */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🖼️ Logo da empresa</span>
            </div>
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>
              <strong>Formatos aceitos:</strong> PNG, JPG, SVG, WebP · Peso máximo: 4MB<br />
              <strong>O sistema redimensiona automaticamente</strong> — suba o logo no tamanho que tiver.<br />
              <strong>Dica:</strong> prefira PNG com fundo transparente para ficar mais bonito no timbrado.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {/* Preview */}
              <div style={{
                width: 160, height: 80, border: "2px dashed var(--border)",
                borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center",
                justifyContent: "center", background: "var(--bg-base)", overflow: "hidden", flexShrink: 0,
              }}>
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sem logo</span>
                }
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                  style={{ display: "none" }}
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="btn btn-secondary" style={{ cursor: "pointer", display: "inline-block" }}>
                  📁 Escolher arquivo
                </label>
                {logoPreview && (
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--error, #ef4444)" }} onClick={removeLogo}>
                    🗑️ Remover logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Identidade */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🏢 Identidade da empresa</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              <div>
                <label className="input-label">Nome da empresa *</label>
                <input className="input" value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Exemplo Publicidade Ltda" />
              </div>
              <div>
                <label className="input-label">CNPJ</label>
                <input className="input" value={form.cnpj} onChange={e => set("cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div>
                <label className="input-label">Cor primária</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={form.primary_color} onChange={e => set("primary_color", e.target.value)}
                    style={{ width: 44, height: 36, border: "1px solid var(--border)", borderRadius: "var(--radius)", cursor: "pointer", background: "none" }} />
                  <input className="input" style={{ flex: 1 }} value={form.primary_color} onChange={e => set("primary_color", e.target.value)} placeholder="#6c63ff" />
                </div>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📞 Contato</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              <div>
                <label className="input-label">Telefone 1</label>
                <input className="input" value={form.phone1} onChange={e => set("phone1", e.target.value)} placeholder="11 3000.0000" />
              </div>
              <div>
                <label className="input-label">Telefone 2 (WhatsApp)</label>
                <input className="input" value={form.phone2} onChange={e => set("phone2", e.target.value)} placeholder="11 90000.0000" />
              </div>
              <div>
                <label className="input-label">E-mail oficial</label>
                <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="contato@suaempresa.com.br" />
              </div>
              <div>
                <label className="input-label">Site</label>
                <input className="input" value={form.website} onChange={e => set("website", e.target.value)} placeholder="www.suaempresa.com.br" />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📍 Endereço</span>
            </div>
            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
              Digite o CEP primeiro — rua, bairro, cidade e estado serão preenchidos automaticamente.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label className="input-label">CEP</label>
                <input
                  className="input"
                  value={form.address_zip}
                  onChange={e => set("address_zip", e.target.value)}
                  onBlur={e => handleCepBlur(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="input-label">Rua / Avenida</label>
                <input className="input" value={form.address_street} onChange={e => set("address_street", e.target.value)} placeholder="Preenchido pelo CEP" />
              </div>
              <div>
                <label className="input-label">Número</label>
                <input className="input" value={form.address_number} onChange={e => set("address_number", e.target.value)} placeholder="100" />
              </div>
              <div>
                <label className="input-label">Complemento</label>
                <input className="input" value={form.address_complement} onChange={e => set("address_complement", e.target.value)} placeholder="Sala 01" />
              </div>
              <div>
                <label className="input-label">Bairro</label>
                <input className="input" value={form.address_neighborhood} onChange={e => set("address_neighborhood", e.target.value)} placeholder="Preenchido pelo CEP" />
              </div>
              <div>
                <label className="input-label">Cidade</label>
                <input className="input" value={form.address_city} onChange={e => set("address_city", e.target.value)} placeholder="Preenchido pelo CEP" />
              </div>
              <div>
                <label className="input-label">Estado</label>
                <input className="input" value={form.address_state} onChange={e => set("address_state", e.target.value)} placeholder="UF" maxLength={2} />
              </div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">💳 Dados de pagamento</span>
            </div>
            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
              Aparece no campo &quot;Forma de Pagto&quot; das propostas.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              <div>
                <label className="input-label">Chave PIX</label>
                <input className="input" value={form.pix_key} onChange={e => set("pix_key", e.target.value)} placeholder="CNPJ, e-mail ou chave aleatória" />
              </div>
              <div>
                <label className="input-label">Titular da conta</label>
                <input className="input" value={form.pix_holder} onChange={e => set("pix_holder", e.target.value)} placeholder="Empresa Exemplo Ltda" />
              </div>
              <div>
                <label className="input-label">CPF / CNPJ do titular</label>
                <input className="input" value={form.pix_document} onChange={e => set("pix_document", e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
            </div>
          </div>

          {/* Save bottom */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 40 }}>
            <button
              className="btn btn-primary"
              style={{ minWidth: 200 }}
              disabled={saving || !clientId}
              onClick={handleSave}
            >
              {saving ? "Salvando..." : saved ? "✓ Configurações salvas!" : "💾 Salvar configurações"}
            </button>
          </div>

        </div>
      )}
    </main>
  );
}
