// services/focusnfeService.ts — Integração Focus NFe para emissão de NFS-e
// Docs: https://focusnfe.com.br/doc/

const FOCUS_BASE = "https://api.focusnfe.com.br";

function getToken(): string {
  const token = process.env.FOCUS_NFE_TOKEN;
  if (!token) throw new Error("FOCUS_NFE_TOKEN não configurado");
  return token;
}

async function focusRequest(method: string, path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${FOCUS_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${getToken()}:`).toString("base64")}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json() as Record<string, unknown>;
  return json;
}

export interface NFSeParams {
  razao_social: string;
  cnpj_tomador: string;
  email_tomador?: string;
  descricao: string;
  valor: number;
  iss_retido?: boolean;
}

export interface NFSeResult {
  nfse_id: string;
  status: string;
  numero?: string;
  pdf_url?: string;
}

export async function emitirNFSe(params: NFSeParams): Promise<NFSeResult> {
  const ref = `nfse-${Date.now()}`;
  const companyCnpj = process.env.COMPANY_CNPJ ?? "";
  const companyIM = process.env.COMPANY_IM ?? "";
  const companyCityCode = process.env.COMPANY_CITY_CODE ?? "";
  const serviceCode = process.env.COMPANY_SERVICE_CODE ?? "";

  const payload = {
    prestador: {
      cnpj: companyCnpj.replace(/\D/g, ""),
      inscricao_municipal: companyIM,
      codigo_municipio: companyCityCode,
    },
    tomador: {
      cnpj: params.cnpj_tomador.replace(/\D/g, ""),
      razao_social: params.razao_social,
      email: params.email_tomador ?? "",
    },
    servico: {
      aliquota: 5,
      discriminacao: params.descricao,
      iss_retido: params.iss_retido ? "1" : "2",
      item_lista_servico: serviceCode,
      codigo_municipio: companyCityCode,
      valor_servicos: params.valor,
    },
  };

  const result = await focusRequest("POST", `/v2/nfse?ref=${ref}`, payload);

  return {
    nfse_id: (result.id as string) ?? ref,
    status: (result.status as string) ?? "processando",
    numero: result.numero as string | undefined,
    pdf_url: result.url as string | undefined,
  };
}

export async function consultarNFSe(ref: string): Promise<NFSeResult> {
  const result = await focusRequest("GET", `/v2/nfse/${ref}`);
  return {
    nfse_id: ref,
    status: (result.status as string) ?? "desconhecido",
    numero: result.numero as string | undefined,
    pdf_url: result.url as string | undefined,
  };
}

export async function cancelarNFSe(ref: string, justificativa: string): Promise<{ success: boolean; status: string }> {
  const result = await focusRequest("DELETE", `/v2/nfse/${ref}`, { justificativa });
  return {
    success: (result.status as string) === "cancelado",
    status: (result.status as string) ?? "erro",
  };
}
