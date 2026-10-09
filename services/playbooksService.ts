import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Playbook, CreatePlaybookInput } from "@/types/playbook";

const COLLECTION = "playbooks";

export async function createPlaybook(input: CreatePlaybookInput): Promise<Playbook> {
  const { data, error } = await supabaseAdmin.from(COLLECTION).insert(input).select().single();
  if (error) throw error;
  return { id: data.id, ...input };
}

export async function listPlaybooks(): Promise<Playbook[]> {
  const { data, error } = await supabaseAdmin.from(COLLECTION).select("*");
  if (error) throw error;
  return (data ?? []) as Playbook[];
}

// Returns the playbook for a given niche, or null if none found.
export async function getPlaybookByNiche(niche: string): Promise<Playbook | null> {
  const { data, error } = await supabaseAdmin
    .from(COLLECTION)
    .select("*")
    .eq("niche", niche.toLowerCase().trim())
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as Playbook;
}
