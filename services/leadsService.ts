import { supabase } from "@/lib/supabase";
import type { Lead, LeadStatus, CreateLeadInput } from "@/types/lead";

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const payload = {
    ...input,
    status: "novo" as const,
    notes: "",
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`createLead error: ${error.message}`);

  return data as Lead;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`updateLeadStatus error: ${error.message}`);
}

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listLeads error: ${error.message}`);

  return (data ?? []) as Lead[];
}
