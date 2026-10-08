// Cora PJ API — cobranças PIX e Boleto
// Docs: https://developers.cora.com.br/
// Auth: OAuth 2.0 Client Credentials + mTLS (certificado)

import https from "https";

const IS_SANDBOX  = process.env.CORA_API_ENV === "sandbox";
const CORA_BASE   = IS_SANDBOX
  ? "https://matls-clients.api.cora.com.br/sandbox"
  : "https://matls-clients.api.cora.com.br";
const CORA_TOKEN_PATH = IS_SANDBOX
  ? "/sandbox/oauth2/token"
  : "/oauth2/token";
const CORA_TOKEN_HOST = "matls-clients.api.cora.com.br";

function getMtlsAgent() {
  const cert = process.env.CORA_CERT_BASE64;
  const key  = process.env.CORA_KEY_BASE64;
  if (!cert || !key) throw new Error("CORA_CERT_BASE64 ou CORA_KEY_BASE64 não configurados");

  return new https.Agent({
    cert: Buffer.from(cert, "base64").toString("utf8"),
    key:  Buffer.from(key,  "base64").toString("utf8"),
    rejectUnauthorized: true,
  });
}

function httpsRequest(options: https.RequestOptions, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.CORA_CLIENT_ID;
  if (!clientId) throw new Error("CORA_CLIENT_ID não configurado");

  const agent = getMtlsAgent();
  const body  = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId }).toString();

  const raw = await httpsRequest({
    hostname: CORA_TOKEN_HOST,
    path:     CORA_TOKEN_PATH,
    method:   "POST",
    agent,
    headers: {
      "Content-Type":   "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);

  const json = JSON.parse(raw) as { access_token?: string; error?: string };
  if (!json.access_token) throw new Error(json.error ?? "Falha ao obter token Cora");
  return json.access_token;
}

export interface CoraChargeResult {
  chargeId:   string;
  pixCode?:   string;
  pixQrCode?: string;
  boletoUrl?: string;
  dueDate:    string;
}

export async function createPixCharge(params: {
  amount:       number;
  description:  string;
  payerName:    string;
  payerTaxId:   string;
  daysUntilDue?: number;
}): Promise<CoraChargeResult> {
  const { amount, description, payerName, payerTaxId, daysUntilDue = 3 } = params;

  const token = await getAccessToken();
  const agent = getMtlsAgent();

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysUntilDue);
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  const payload = JSON.stringify({
    code:          `PROP-${Date.now()}`,
    amount:        Math.round(amount * 100),
    description,
    payment_terms: { due_date: dueDateStr },
    customer: {
      name:    payerName,
      tax_id:  payerTaxId,
      address: { street: "", number: "", district: "", city: "", state: "SP", zip_code: "00000000" },
    },
    payment_forms: ["PIX"],
  });

  const url = new URL(`${CORA_BASE}/v2/invoices`);

  const raw = await httpsRequest({
    hostname: url.hostname,
    path:     url.pathname,
    method:   "POST",
    agent,
    headers: {
      "Content-Type":   "application/json",
      "Authorization":  `Bearer ${token}`,
      "Content-Length": Buffer.byteLength(payload),
    },
  }, payload);

  const json = JSON.parse(raw) as {
    id?:       string;
    pix?:      { emv?: string; image_base64?: string };
    pdf?:      { url?: string };
    due_date?: string;
    error?:    string;
  };

  if (!json.id) throw new Error(json.error ?? "Falha ao criar cobrança Cora");

  return {
    chargeId:  json.id,
    pixCode:   json.pix?.emv,
    pixQrCode: json.pix?.image_base64,
    boletoUrl: json.pdf?.url,
    dueDate:   json.due_date ?? dueDateStr,
  };
}
