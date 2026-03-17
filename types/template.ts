export type TemplateType = "followup" | "status";

export interface Template {
  id:         string;
  name:       string;
  type:       TemplateType;
  trigger:    string;    // ex: "contato", "proposta", "followup_1"
  message:    string;    // suporta {{name}}, {{phone}}, etc.
  client_id?: string;    // undefined = global/default template
}

export type CreateTemplateInput = Omit<Template, "id">;
