import { adminDb } from "@/lib/firebase-admin";
import { createTemplate } from "@/services/templatesService";
import { getPlaybookByNiche } from "@/services/playbooksService";
import { generateTemplatesWithAI } from "@/services/aiTemplatesService";
import type { Client, CreateClientInput } from "@/types/client";
import type { CreateTemplateInput } from "@/types/template";
import type { PlaybookTemplate } from "@/types/playbook";

const COLLECTION = "clients";

// Default templates used when no playbook matches the client's niche
function buildDefaultTemplates(client_id: string): CreateTemplateInput[] {
  return [
    {
      name:      "Contato",
      type:      "status",
      trigger:   "contato",
      message:   "Oi {{name}}, vi que você demonstrou interesse. Posso te ajudar?",
      client_id,
    },
    {
      name:      "Proposta",
      type:      "status",
      trigger:   "proposta",
      message:   "Já te enviei a proposta, {{name}}! Qualquer dúvida me chama 🙂",
      client_id,
    },
    {
      name:      "Follow-up 1",
      type:      "followup",
      trigger:   "followup_1",
      message:   "Oi {{name}}, só passando pra ver se conseguiu ver nossa mensagem 🙂",
      client_id,
    },
    {
      name:      "Follow-up 2",
      type:      "followup",
      trigger:   "followup_2",
      message:   "Última mensagem aqui {{name}}! Posso te ajudar com algo?",
      client_id,
    },
  ];
}

function playbookTemplatesToInput(
  templates: PlaybookTemplate[],
  client_id: string
): CreateTemplateInput[] {
  return templates.map((t) => ({
    name:      t.trigger, // use trigger as name for playbook-sourced templates
    type:      t.type,
    trigger:   t.trigger,
    message:   t.message,
    client_id,
  }));
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const doc = {
    ...input,
    created_at: new Date().toISOString(),
  };

  const ref    = await adminDb.collection(COLLECTION).add(doc);
  const client: Client = { id: ref.id, ...doc };

  // Resolve templates: playbook → AI → defaults
  const playbook = await getPlaybookByNiche(input.niche);

  let templates: CreateTemplateInput[];
  let source: string;

  if (playbook) {
    templates = playbookTemplatesToInput(playbook.templates, ref.id);
    source = `playbook "${playbook.niche}"`;
  } else {
    // Try AI generation for niche-specific templates
    let aiTemplates: CreateTemplateInput[] | null = null;
    try {
      aiTemplates = await generateTemplatesWithAI(input.niche, ref.id);
    } catch (err) {
      console.error(`[LeadsOS] AI template generation failed for niche "${input.niche}":`, err);
    }

    if (aiTemplates) {
      templates = aiTemplates;
      source = `AI (niche: ${input.niche})`;
    } else {
      templates = buildDefaultTemplates(ref.id);
      source = "defaults";
    }
  }

  console.log(`[LeadsOS] Client "${client.name}" — templates from: ${source} (${templates.length})`);

  await Promise.allSettled(templates.map((t) => createTemplate(t)));

  return client;
}

export async function listClients(): Promise<Client[]> {
  const snap = await adminDb.collection(COLLECTION).orderBy("created_at", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Client));
}
