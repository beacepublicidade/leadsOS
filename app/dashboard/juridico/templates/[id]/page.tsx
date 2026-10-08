"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

const AVAILABLE_VARS = [
  "CLIENTE_NOME", "CLIENTE_CNPJ", "CLIENTE_ENDERECO", "CLIENTE_EMAIL",
  "SERVICO_NOME", "SERVICO_VALOR", "SERVICO_DESCRICAO",
  "DURACAO_MESES", "DATA_INICIO", "DATA_TERMINO",
  "FORMA_PAGAMENTO", "DIA_VENCIMENTO",
  "AGENCIA_NOME", "AGENCIA_CNPJ", "REPRESENTANTE_NOME",
];

const SAMPLE_VALUES: Record<string, string> = {
  CLIENTE_NOME: "Empresa XYZ",
  CLIENTE_CNPJ: "12.345.678/0001-99",
  CLIENTE_ENDERECO: "Rua Exemplo, 123 - São Paulo/SP",
  CLIENTE_EMAIL: "contato@xyz.com.br",
  SERVICO_NOME: "Gestão de Redes Sociais",
  SERVICO_VALOR: "R$ 3.500,00",
  SERVICO_DESCRICAO: "Gestão completa de redes sociais incluindo criação de conteúdo...",
  DURACAO_MESES: "12",
  DATA_INICIO: "01/01/2027",
  DATA_TERMINO: "01/01/2028",
  FORMA_PAGAMENTO: "Boleto bancário",
  DIA_VENCIMENTO: "10",
  AGENCIA_NOME: "Beace",
  AGENCIA_CNPJ: "98.765.432/0001-10",
  REPRESENTANTE_NOME: "Robson Silva",
};

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetch(`/api/juridico/templates/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setTemplate(j.data);
          setName(j.data.name);
          setType(j.data.type);
          setContent(j.data.content);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await fetch(`/api/juridico/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, content }),
      });
      const j = await r.json();
      if (j.success) {
        router.push("/dashboard/juridico/templates");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function getPreview(): string {
    let result = content;
    for (const [key, value] of Object.entries(SAMPLE_VALUES)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return result;
  }

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Carregando...</div>;
  if (!template) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Template não encontrado</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <button
        onClick={() => router.push("/dashboard/juridico/templates")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500, marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> Voltar para templates
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Editor: {template.name}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Editar" : "Preview"}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : <><Save size={14} /> Salvar</>}
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label className="input-label">Nome</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label className="input-label">Tipo</label>
            <select className="select" value={type} onChange={e => setType(e.target.value)}>
              <option value="social_media">Social Media</option>
              <option value="trafego_pago">Tráfego Pago</option>
              <option value="branding">Branding</option>
              <option value="consultoria">Consultoria</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label className="input-label">{showPreview ? "Preview (com valores de exemplo)" : "Conteúdo"}</label>
            {showPreview ? (
              <div style={{
                background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8,
                padding: 20, fontSize: 13, lineHeight: 1.8, color: "var(--text-primary)",
                whiteSpace: "pre-wrap", minHeight: 400, maxHeight: 600, overflowY: "auto",
              }}>
                {getPreview()}
              </div>
            ) : (
              <textarea
                className="textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{ minHeight: 400, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}
              />
            )}
          </div>
        </div>

        <div>
          <div className="card" style={{ position: "sticky", top: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Variáveis disponíveis</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              Clique em uma variável para inserir no texto. No momento da criação do contrato, elas serão substituídas pelos valores reais.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {AVAILABLE_VARS.map(v => (
                <button key={v}
                  onClick={() => setContent(prev => prev + `{{${v}}}`)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)",
                    background: "var(--bg-surface)", cursor: "pointer", fontSize: 12, color: "var(--text-primary)",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: "monospace", color: "var(--accent)" }}>{`{{${v}}}`}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{SAMPLE_VALUES[v]?.slice(0, 25)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
