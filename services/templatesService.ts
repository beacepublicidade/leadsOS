import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Template, CreateTemplateInput } from "@/types/template";

const COLLECTION = "templates";

export async function listTemplates(client_id?: string): Promise<Template[]> {
  let query = supabaseAdmin.from(COLLECTION).select("*");
  if (client_id) {
    query = query.eq("client_id", client_id);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Template[];
}

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  const { data, error } = await supabaseAdmin.from(COLLECTION).insert(input).select().single();
  if (error) throw error;
  return { id: data.id, ...input };
}

// Busca template pelo trigger, preferindo o template do cliente se client_id for fornecido.
// Fallback: template global (sem client_id).
export async function getTemplateByTrigger(
  trigger: string,
  client_id?: string
): Promise<Template | null> {
  // 1. Try client-specific template first
  if (client_id) {
    const { data } = await supabaseAdmin
      .from(COLLECTION)
      .select("*")
      .eq("trigger", trigger)
      .eq("client_id", client_id)
      .limit(1)
      .single();

    if (data) return data as Template;
  }

  // 2. Fall back to global template (no client_id)
  const { data: globalData } = await supabaseAdmin
    .from(COLLECTION)
    .select("*")
    .eq("trigger", trigger)
    .is("client_id", null)
    .limit(1)
    .single();

  if (globalData) return globalData as Template;

  // 3. Legacy: templates without client_id field at all — just match trigger
  const { data: legacyData } = await supabaseAdmin
    .from(COLLECTION)
    .select("*")
    .eq("trigger", trigger)
    .limit(1)
    .single();

  if (!legacyData) return null;
  return legacyData as Template;
}

// Interpola variáveis {{name}}, {{phone}}, etc.
export function interpolate(message: string, vars: Record<string, string>): string {
  return message.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
