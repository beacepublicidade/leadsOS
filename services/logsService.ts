import { supabaseAdmin } from "@/lib/supabase-admin";

export type LogType = "followup" | "status_change" | "automation" | "notification" | "sdr_dispatch";

export interface LogEntry {
  lead_id:    string;
  type:       LogType;
  message:    string;
  created_at: string;
}

export async function logAction(entry: LogEntry): Promise<void> {
  try {
    await supabaseAdmin.from("logs").insert({
      lead_id:    entry.lead_id,
      type:       entry.type,
      message:    entry.message,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Logging must never break the main flow
    console.error("[LeadsOS] Failed to write log:", err);
  }
}
