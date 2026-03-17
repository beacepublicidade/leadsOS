export type LeadStatus = "novo" | "contato" | "proposta" | "fechado" | "perdido";

export const LEAD_STATUSES: LeadStatus[] = ["novo", "contato", "proposta", "fechado", "perdido"];

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;    // ex: "meta_ads", "landing_page"
  campaign: string;
  status: LeadStatus;
  tags: string[];
  notes: string;
  createdAt: string; // ISO 8601
}

export type CreateLeadInput = Pick<Lead, "name" | "phone" | "email" | "source" | "campaign">;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
