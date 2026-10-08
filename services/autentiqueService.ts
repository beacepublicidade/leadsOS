// Autentique GraphQL API — assinatura digital
// Docs: https://docs.autentique.com.br/

const AUTENTIQUE_API = "https://api.autentique.com.br/v2/graphql";

function getToken() {
  const token = process.env.AUTENTIQUE_API_KEY;
  if (!token) throw new Error("AUTENTIQUE_API_KEY não configurada");
  return token;
}

async function gql(query: string, variables: Record<string, unknown>) {
  const res = await fetch(AUTENTIQUE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { data?: Record<string, unknown>; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data!;
}

export interface AutentiqueSignerResult {
  documentId: string;
  signLink:   string;
}

// Cria documento no Autentique e retorna link de assinatura para o lead.
// Não informamos email/phone ao signer para que o Autentique retorne o
// short_link via API — nós mesmos enviamos o link via WhatsApp (Z-API).
export async function createSignatureDocument(params: {
  title:       string;
  pdfBase64:   string;
  signerName:  string;
  signerEmail?: string;
  signerPhone?: string;
}): Promise<AutentiqueSignerResult> {
  const { title, pdfBase64, signerName } = params;

  const mutation = `
    mutation CreateDocument($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
      createDocument(document: $document, signers: $signers, file: $file) {
        id
        name
        signatures {
          public_id
          link {
            short_link
          }
        }
      }
    }
  `;

  const operations = JSON.stringify({
    query: mutation,
    variables: {
      document: { name: title },
      // Sem email/phone — Autentique retorna short_link via API para envio manual
      signers: [{ name: signerName, action: "SIGN" }],
      file:    null,
    },
  });

  const map = JSON.stringify({ "0": ["variables.file"] });

  const buffer = Buffer.from(pdfBase64, "base64");
  const blob   = new Blob([buffer], { type: "application/pdf" });

  const form = new FormData();
  form.append("operations", operations);
  form.append("map", map);
  form.append("0", blob, `${title}.pdf`);

  const res = await fetch(AUTENTIQUE_API, {
    method:  "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
    body:    form,
  });

  const json = await res.json() as {
    data?: { createDocument: { id: string; signatures: { public_id: string; link?: { short_link?: string } | null }[] } };
    errors?: { message: string }[];
  };

  if (json.errors?.length) throw new Error(json.errors[0].message);

  const doc = json.data!.createDocument;

  // Autentique auto-adiciona o dono da conta como signatures[0].
  // O signer externo (cliente) fica no último índice.
  const clientSigner = doc.signatures[doc.signatures.length - 1];
  const signLink     = clientSigner.link?.short_link
    ?? `https://painel.autentique.com.br/assinar/${clientSigner.public_id}`;

  return { documentId: doc.id, signLink };
}

// Busca status do documento
export async function getDocumentStatus(documentId: string): Promise<"PENDING" | "SIGNED" | "REJECTED"> {
  const query = `
    query GetDocument($id: UUID!) {
      document(id: $id) {
        id
        signatures {
          signed
          rejected
        }
      }
    }
  `;

  const data = await gql(query, { id: documentId }) as {
    document: { signatures: { signed: string | null; rejected: string | null }[] }
  };

  const sig = data.document.signatures[0];
  if (sig?.rejected) return "REJECTED";
  if (sig?.signed)   return "SIGNED";
  return "PENDING";
}
