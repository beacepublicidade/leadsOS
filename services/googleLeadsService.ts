import { saveMetaLead } from "@/services/metaLeadsService";

// Payload enviado pelo Google Ads Lead Form Extension
export interface GoogleLeadPayload {
  google_key?:    string;
  lead_id?:       string;
  campaign_id?:   string;
  campaign_name?: string;
  adgroup_id?:    string;
  adgroup_name?:  string;
  creative_id?:   string;
  ad_id?:         string;
  form_id?:       string;
  gcl_id?:        string; // gclid enviado pelo Google
  client_id?:     string; // campo customizado no formulário
  user_column_data?: {
    column_name:   string;
    string_value?: string;
    number_value?: number;
  }[];
}

function extractField(data: GoogleLeadPayload["user_column_data"], key: string): string {
  return data?.find((d) => d.column_name === key)?.string_value ?? "";
}

export async function saveGoogleLead(payload: GoogleLeadPayload): Promise<string> {
  const cols = payload.user_column_data ?? [];

  // Google usa nomes de coluna em maiúsculas no padrão
  const name  = extractField(cols, "FULL_NAME")    || extractField(cols, "full_name")    || "";
  const phone = extractField(cols, "PHONE_NUMBER") || extractField(cols, "phone_number") || "";
  const email = extractField(cols, "EMAIL")        || extractField(cols, "email")        || "";

  // client_id pode vir como campo customizado no formulário do Google
  const client_id = payload.client_id
    || extractField(cols, "client_id")
    || extractField(cols, "CLIENT_ID")
    || "";

  return saveMetaLead({
    name,
    phone,
    email,
    source:        "google_ads",
    campaign_name: payload.campaign_name ?? "",
    campaign_id:   payload.campaign_id   ?? "",
    adset_name:    payload.adgroup_name  ?? "",
    ad_name:       payload.creative_id   ?? "",
    ad_id:         payload.ad_id         ?? "",
    form_id:       payload.form_id       ?? "",
    gclid:         payload.gcl_id        ?? "",
    client_id,
    utm_source:    "google",
    utm_medium:    "cpc",
    utm_campaign:  payload.campaign_name ?? "",
  });
}
