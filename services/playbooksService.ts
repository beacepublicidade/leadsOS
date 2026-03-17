import { adminDb } from "@/lib/firebase-admin";
import type { Playbook, CreatePlaybookInput } from "@/types/playbook";

const COLLECTION = "playbooks";

export async function createPlaybook(input: CreatePlaybookInput): Promise<Playbook> {
  const ref = await adminDb.collection(COLLECTION).add(input);
  return { id: ref.id, ...input };
}

export async function listPlaybooks(): Promise<Playbook[]> {
  const snap = await adminDb.collection(COLLECTION).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Playbook));
}

// Returns the playbook for a given niche, or null if none found.
export async function getPlaybookByNiche(niche: string): Promise<Playbook | null> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("niche", "==", niche.toLowerCase().trim())
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Playbook;
}
