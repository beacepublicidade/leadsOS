import { adminDb } from "@/lib/firebase-admin";

export type LogType = "followup" | "status_change" | "automation" | "notification";

export interface LogEntry {
  lead_id:    string;
  type:       LogType;
  message:    string;
  created_at: string;
}

export async function logAction(entry: LogEntry): Promise<void> {
  try {
    await adminDb.collection("logs").add({
      ...entry,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Logging must never break the main flow
    console.error("[LeadsOS] Failed to write log:", err);
  }
}
