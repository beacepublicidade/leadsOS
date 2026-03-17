import { getAdminDb } from "@/lib/firebase-admin";

export interface Message {
  id:        string;
  lead_id:   string;
  phone:     string;
  direction: "in" | "out";
  content:   string;
  timestamp: string;
}

const COLLECTION = "messages";

export async function saveMessage(data: Omit<Message, "id">): Promise<string> {
  const ref = await getAdminDb().collection(COLLECTION).add(data);
  return ref.id;
}

export async function getConversation(lead_id: string): Promise<Message[]> {
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .where("lead_id", "==", lead_id)
    .get();

  const messages = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message));
  return messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// Finds the most recent lead with this phone number
export async function findLeadByPhone(phone: string): Promise<string | null> {
  // Normalize: strip country code variations
  const normalized = phone.replace(/\D/g, "").replace(/^55/, "");

  const snap = await getAdminDb()
    .collection("leads")
    .orderBy("created_at", "desc")
    .limit(50)
    .get();

  for (const doc of snap.docs) {
    const leadPhone = String(doc.data().phone ?? "").replace(/\D/g, "").replace(/^55/, "");
    if (leadPhone === normalized) return doc.id;
  }

  return null;
}
