import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Lead, LeadStatus, CreateLeadInput } from "@/types/lead";

const COLLECTION = "leads";

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const payload = {
    ...input,
    status: "novo" as const,
    tags: [],
    notes: "",
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), payload);

  return { id: docRef.id, ...payload };
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { status });
}

export async function listLeads(): Promise<Lead[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Lead, "id">),
  }));
}
