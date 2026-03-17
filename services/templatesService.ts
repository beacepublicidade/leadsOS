import { adminDb } from "@/lib/firebase-admin";
import type { Template, CreateTemplateInput } from "@/types/template";

const COLLECTION = "templates";

export async function listTemplates(client_id?: string): Promise<Template[]> {
  let query = adminDb.collection(COLLECTION) as FirebaseFirestore.Query;
  if (client_id) {
    query = query.where("client_id", "==", client_id);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Template));
}

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  const ref = await adminDb.collection(COLLECTION).add(input);
  return { id: ref.id, ...input };
}

// Busca template pelo trigger, preferindo o template do cliente se client_id for fornecido.
// Fallback: template global (sem client_id).
export async function getTemplateByTrigger(
  trigger: string,
  client_id?: string
): Promise<Template | null> {
  // 1. Try client-specific template first
  if (client_id) {
    const clientSnap = await adminDb
      .collection(COLLECTION)
      .where("trigger", "==", trigger)
      .where("client_id", "==", client_id)
      .limit(1)
      .get();

    if (!clientSnap.empty) {
      const doc = clientSnap.docs[0];
      return { id: doc.id, ...doc.data() } as Template;
    }
  }

  // 2. Fall back to global template (no client_id)
  const globalSnap = await adminDb
    .collection(COLLECTION)
    .where("trigger", "==", trigger)
    .where("client_id", "==", null)
    .limit(1)
    .get();

  if (!globalSnap.empty) {
    const doc = globalSnap.docs[0];
    return { id: doc.id, ...doc.data() } as Template;
  }

  // 3. Legacy: templates without client_id field at all
  const legacySnap = await adminDb
    .collection(COLLECTION)
    .where("trigger", "==", trigger)
    .limit(1)
    .get();

  if (legacySnap.empty) return null;
  const doc = legacySnap.docs[0];
  return { id: doc.id, ...doc.data() } as Template;
}

// Interpola variáveis {{name}}, {{phone}}, etc.
export function interpolate(message: string, vars: Record<string, string>): string {
  return message.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
