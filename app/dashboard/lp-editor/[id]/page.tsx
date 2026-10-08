"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface Metrica {
  valor: string;
  descricao: string;
}

interface Depoimento {
  nome: string;
  texto: string;
  cargo?: string;
}

interface LpData {
  name:            string;
  brand_color:     string;
  lp_logo_url:     string;
  lp_headline:     string;
  lp_subheadline:  string;
  lp_cta_button:   string;
  lp_metrics:      Metrica[];
  lp_dores:        string[];
  lp_beneficios:   string[];
  lp_depoimentos:  Depoimento[];
  lp_sobre:        string;
  lp_sobre_foto:   string;
}

const empty: LpData = {
  name:           "",
  brand_color:    "#7c3aed",
  lp_logo_url:    "",
  lp_headline:    "",
  lp_subheadline: "",
  lp_cta_button:  "Falar no WhatsApp →",
  lp_metrics:     [],
  lp_dores:       [],
  lp_beneficios:  [],
  lp_depoimentos: [],
  lp_sobre:       "",
  lp_sobre_foto:  "",
};

export default function LpEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [data, setData]       = useState<LpData>(empty);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(json => {
      const user = json.user;
      if (!user || (user.client_id && user.profile !== "admin")) router.replace("/dashboard");
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/public/client/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const d = json.data;
          setData({
            name:           d.name            ?? "",
            brand_color:    d.brand_color     ?? "#7c3aed",
            lp_logo_url:    d.lp_logo_url     ?? "",
            lp_headline:    d.lp_headline     ?? "",
            lp_subheadline: d.lp_subheadline  ?? "",
            lp_cta_button:  d.lp_cta_button   ?? "Falar no WhatsApp →",
            lp_metrics:     (d.lp_metrics     as Metrica[]) ?? [],
            lp_dores:       (d.lp_dores       as string[])  ?? [],
            lp_beneficios:  (d.lp_beneficios  as string[])  ?? [],
            lp_depoimentos: (d.lp_depoimentos as Depoimento[]) ?? [],
            lp_sobre:       d.lp_sobre        ?? "",
            lp_sobre_foto:  d.lp_sobre_foto   ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_color:    data.brand_color,
          lp_logo_url:    data.lp_logo_url,
          lp_headline:    data.lp_headline,
          lp_subheadline: data.lp_subheadline,
          lp_cta_button:  data.lp_cta_button,
          lp_metrics:     data.lp_metrics,
          lp_dores:       data.lp_dores,
          lp_beneficios:  data.lp_beneficios,
          lp_depoimentos: data.lp_depoimentos,
          lp_sobre:       data.lp_sobre,
          lp_sobre_foto:  data.lp_sobre_foto,
        }),
      });
      const json = await res.json();
      if (json.success) setMsg({ type: "ok", text: "LP salva com sucesso!" });
      else setMsg({ type: "error", text: json.error ?? "Erro ao salvar." });
    } catch {
      setMsg({ type: "error", text: "Erro de conexão." });
    } finally {
      setSaving(false);
    }
  }

  // --- helpers para arrays ---
  function addMetrica()    { setData(d => ({ ...d, lp_metrics:    [...d.lp_metrics,    { valor: "", descricao: "" }] })); }
  function addDor()        { setData(d => ({ ...d, lp_dores:      [...d.lp_dores,      ""] })); }
  function addBeneficio()  { setData(d => ({ ...d, lp_beneficios: [...d.lp_beneficios, ""] })); }
  function addDepoimento() { setData(d => ({ ...d, lp_depoimentos: [...d.lp_depoimentos, { nome: "", texto: "", cargo: "" }] })); }

  function removeMetrica(i: number)    { setData(d => ({ ...d, lp_metrics:    d.lp_metrics.filter((_,j) => j !== i) })); }
  function removeDor(i: number)        { setData(d => ({ ...d, lp_dores:      d.lp_dores.filter((_,j) => j !== i) })); }
  function removeBeneficio(i: number)  { setData(d => ({ ...d, lp_beneficios: d.lp_beneficios.filter((_,j) => j !== i) })); }
  function removeDepoimento(i: number) { setData(d => ({ ...d, lp_depoimentos: d.lp_depoimentos.filter((_,j) => j !== i) })); }

  function updateMetrica(i: number, field: keyof Metrica, val: string) {
    setData(d => {
      const arr = [...d.lp_metrics];
      arr[i] = { ...arr[i], [field]: val };
      return { ...d, lp_metrics: arr };
    });
  }
  function updateDor(i: number, val: string) {
    setData(d => { const arr = [...d.lp_dores]; arr[i] = val; return { ...d, lp_dores: arr }; });
  }
  function updateBeneficio(i: number, val: string) {
    setData(d => { const arr = [...d.lp_beneficios]; arr[i] = val; return { ...d, lp_beneficios: arr }; });
  }
  function updateDepoimento(i: number, field: keyof Depoimento, val: string) {
    setData(d => {
      const arr = [...d.lp_depoimentos];
      arr[i] = { ...arr[i], [field]: val };
      return { ...d, lp_depoimentos: arr };
    });
  }

  const lpUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/lp?client_id=${id}`;

  if (loading) return (
    <div style={{ background: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
      Carregando...
    </div>
  );

  const s = {
    page: { background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", padding: "24px" } as React.CSSProperties,
    header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" } as React.CSSProperties,
    back: { background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "14px" } as React.CSSProperties,
    h1: { fontSize: "24px", fontWeight: 700, color: "#f8fafc", margin: 0 } as React.CSSProperties,
    card: { background: "#1e293b", borderRadius: "12px", padding: "24px", marginBottom: "24px", border: "1px solid #334155" } as React.CSSProperties,
    sectionTitle: { fontSize: "16px", fontWeight: 700, color: "#f8fafc", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" } as React.CSSProperties,
    label: { display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px", fontWeight: 500 } as React.CSSProperties,
    input: { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px", color: "#e2e8f0", fontSize: "14px", boxSizing: "border-box" as const, outline: "none" },
    textarea: { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px", color: "#e2e8f0", fontSize: "14px", boxSizing: "border-box" as const, outline: "none", resize: "vertical" as const, minHeight: "80px" },
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" } as React.CSSProperties,
    row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "8px" } as React.CSSProperties,
    addBtn: { background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 600 } as React.CSSProperties,
    removeBtn: { background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "12px" } as React.CSSProperties,
    itemRow: { display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "8px" } as React.CSSProperties,
    saveBtn: { background: "#7c3aed", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 32px", cursor: "pointer", fontSize: "16px", fontWeight: 700 } as React.CSSProperties,
    previewLink: { color: "#818cf8", fontSize: "13px", textDecoration: "none" } as React.CSSProperties,
    mb: { marginBottom: "16px" } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.back} onClick={() => router.push("/dashboard/clients")}>← Voltar</button>
        <div>
          <h1 style={s.h1}>Editor de LP — {data.name}</h1>
          <a href={lpUrl} target="_blank" rel="noreferrer" style={s.previewLink}>
            Visualizar LP ↗
          </a>
        </div>
      </div>

      {/* Identidade */}
      <div style={s.card}>
        <div style={s.sectionTitle}>🎨 Identidade Visual</div>
        <div style={s.row}>
          <div>
            <label style={s.label}>Logo URL</label>
            <input style={s.input} value={data.lp_logo_url} onChange={e => setData(d => ({ ...d, lp_logo_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label style={s.label}>Cor da Marca</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="color" value={data.brand_color} onChange={e => setData(d => ({ ...d, brand_color: e.target.value }))} style={{ width: "48px", height: "40px", border: "none", borderRadius: "6px", cursor: "pointer", background: "none" }} />
              <input style={{ ...s.input, flex: 1 }} value={data.brand_color} onChange={e => setData(d => ({ ...d, brand_color: e.target.value }))} placeholder="#7c3aed" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={s.card}>
        <div style={s.sectionTitle}>🚀 Seção Hero</div>
        <div style={s.mb}>
          <label style={s.label}>Headline principal</label>
          <textarea style={s.textarea} value={data.lp_headline} onChange={e => setData(d => ({ ...d, lp_headline: e.target.value }))} placeholder="Transformamos cliques em clientes para o seu negócio" />
        </div>
        <div style={s.mb}>
          <label style={s.label}>Subheadline</label>
          <textarea style={s.textarea} value={data.lp_subheadline} onChange={e => setData(d => ({ ...d, lp_subheadline: e.target.value }))} placeholder="Estratégia digital completa para escalar suas vendas" />
        </div>
        <div>
          <label style={s.label}>Texto do botão CTA</label>
          <input style={s.input} value={data.lp_cta_button} onChange={e => setData(d => ({ ...d, lp_cta_button: e.target.value }))} placeholder="Falar no WhatsApp →" />
        </div>
      </div>

      {/* Métricas */}
      <div style={s.card}>
        <div style={s.sectionTitle}>📊 Métricas / Resultados</div>
        <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", marginTop: 0 }}>Números de impacto (ex: 300+ clientes, R$2M gerenciados). Seção some se vazia.</p>
        {data.lp_metrics.map((m, i) => (
          <div key={i} style={s.row3}>
            <div>
              <label style={s.label}>Valor</label>
              <input style={s.input} value={m.valor} onChange={e => updateMetrica(i, "valor", e.target.value)} placeholder="300+" />
            </div>
            <div>
              <label style={s.label}>Descrição</label>
              <input style={s.input} value={m.descricao} onChange={e => updateMetrica(i, "descricao", e.target.value)} placeholder="Clientes atendidos" />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
              <button style={s.removeBtn} onClick={() => removeMetrica(i)}>Remover</button>
            </div>
          </div>
        ))}
        <button style={s.addBtn} onClick={addMetrica}>+ Adicionar Métrica</button>
      </div>

      {/* Dores */}
      <div style={s.card}>
        <div style={s.sectionTitle}>😤 Dores / Problemas</div>
        <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", marginTop: 0 }}>O que o cliente sofre antes de te contratar. Seção some se vazia.</p>
        {data.lp_dores.map((d, i) => (
          <div key={i} style={s.itemRow}>
            <input style={{ ...s.input, flex: 1 }} value={d} onChange={e => updateDor(i, e.target.value)} placeholder="Investindo em anúncios sem retorno claro" />
            <button style={s.removeBtn} onClick={() => removeDor(i)}>✕</button>
          </div>
        ))}
        <button style={s.addBtn} onClick={addDor}>+ Adicionar Dor</button>
      </div>

      {/* Benefícios */}
      <div style={s.card}>
        <div style={s.sectionTitle}>✅ Benefícios / Soluções</div>
        <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", marginTop: 0 }}>O que o cliente ganha ao te contratar. Seção some se vazia.</p>
        {data.lp_beneficios.map((b, i) => (
          <div key={i} style={s.itemRow}>
            <input style={{ ...s.input, flex: 1 }} value={b} onChange={e => updateBeneficio(i, e.target.value)} placeholder="Campanhas otimizadas para o seu nicho" />
            <button style={s.removeBtn} onClick={() => removeBeneficio(i)}>✕</button>
          </div>
        ))}
        <button style={s.addBtn} onClick={addBeneficio}>+ Adicionar Benefício</button>
      </div>

      {/* Depoimentos */}
      <div style={s.card}>
        <div style={s.sectionTitle}>⭐ Depoimentos</div>
        <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", marginTop: 0 }}>Prova social — depoimentos de clientes reais. Seção some se vazia.</p>
        {data.lp_depoimentos.map((dep, i) => (
          <div key={i} style={{ background: "#0f172a", borderRadius: "8px", padding: "16px", marginBottom: "12px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600 }}>Depoimento {i + 1}</span>
              <button style={s.removeBtn} onClick={() => removeDepoimento(i)}>Remover</button>
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Nome</label>
                <input style={s.input} value={dep.nome} onChange={e => updateDepoimento(i, "nome", e.target.value)} placeholder="João Silva" />
              </div>
              <div>
                <label style={s.label}>Cargo / Empresa (opcional)</label>
                <input style={s.input} value={dep.cargo ?? ""} onChange={e => updateDepoimento(i, "cargo", e.target.value)} placeholder="CEO, Empresa XYZ" />
              </div>
            </div>
            <div>
              <label style={s.label}>Depoimento</label>
              <textarea style={s.textarea} value={dep.texto} onChange={e => updateDepoimento(i, "texto", e.target.value)} placeholder="Em 3 meses triplicamos nosso faturamento com a Beace..." />
            </div>
          </div>
        ))}
        <button style={s.addBtn} onClick={addDepoimento}>+ Adicionar Depoimento</button>
      </div>

      {/* Sobre */}
      <div style={s.card}>
        <div style={s.sectionTitle}>👤 Seção &quot;Sobre&quot;</div>
        <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", marginTop: 0 }}>Apresentação da agência ou responsável. Seção some se texto vazio.</p>
        <div style={{ ...s.row, marginBottom: "16px" }}>
          <div>
            <label style={s.label}>Foto URL</label>
            <input style={s.input} value={data.lp_sobre_foto} onChange={e => setData(d => ({ ...d, lp_sobre_foto: e.target.value }))} placeholder="https://..." />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {data.lp_sobre_foto && (
              <img src={data.lp_sobre_foto} alt="preview" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover" }} />
            )}
          </div>
        </div>
        <div>
          <label style={s.label}>Texto sobre</label>
          <textarea style={{ ...s.textarea, minHeight: "120px" }} value={data.lp_sobre} onChange={e => setData(d => ({ ...d, lp_sobre: e.target.value }))} placeholder="Somos uma agência de marketing digital especializada em crescimento acelerado para pequenas e médias empresas..." />
        </div>
      </div>

      {/* Salvar */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <button style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "💾 Salvar LP"}
        </button>
        {msg && (
          <span style={{ fontSize: "14px", color: msg.type === "ok" ? "#4ade80" : "#f87171", fontWeight: 600 }}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
