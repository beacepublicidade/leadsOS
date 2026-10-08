import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizePhone, stripCountryCode } from "@/lib/normalizePhone";

export interface Message {
  id:           string;
  lead_id:      string;
  phone:        string;
  direction:    "in" | "out";
  content:      string;
  timestamp:    string;
  sender_name?: string;                              // "Sistema", "IA", or human name
  media_type?:  "audio" | "image" | "document";
  media_url?:   string;
  zapi_id?:     string;                             // WhatsApp message ID for status tracking (legacy field name mantido por compatibilidade)
  status?:      "sent" | "delivered" | "read";      // delivery status (outgoing only)
}

export async function saveMessage(data: Omit<Message, "id">): Promise<string> {
  const { data: inserted, error } = await supabaseAdmin
    .from("messages")
    .insert({
      lead_id:     data.lead_id,
      phone:       data.phone,
      direction:   data.direction,
      content:     data.content,
      source:      data.sender_name ?? "",
      msg_id:      data.zapi_id ?? "",
      created_at:  data.timestamp,
    })
    .select("id")
    .single();

  if (error) throw new Error(`saveMessage error: ${error.message}`);

  // Denormalize last message onto the lead so conversations list works via direct lead query
  if (data.lead_id) {
    supabaseAdmin
      .from("leads")
      .update({
        notes: `[last_msg] ${data.content.substring(0, 200)}`,
        updated_at: data.timestamp,
      })
      .eq("id", data.lead_id)
      .then(() => {})
      .catch(() => {/* non-critical */});
  }

  return inserted.id as string;
}

export async function getConversation(lead_id: string): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("lead_id", lead_id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getConversation error: ${error.message}`);

  return (data ?? []).map(row => ({
    id:           row.id,
    lead_id:      row.lead_id,
    phone:        row.phone ?? "",
    direction:    (row.direction === "outbound" ? "out" : "in") as "in" | "out",
    content:      row.content,
    timestamp:    row.created_at,
    sender_name:  row.source ?? undefined,
    zapi_id:      row.msg_id ?? undefined,
  }));
}

// Updates delivery status of a message by its WhatsApp message ID
export async function updateMessageStatus(
  zapiId: string,
  status: "sent" | "delivered" | "read"
): Promise<void> {
  await supabaseAdmin
    .from("messages")
    .update({ status })
    .eq("msg_id", zapiId);
}

// Finds the most recent lead with this phone number.
// Tries two formats: with country code (55XXXXXXXXXXX) and without (XXXXXXXXXXX)
export async function findLeadByPhone(phone: string): Promise<string | null> {
  const withCode    = normalizePhone(phone);    // ex: 5511999999999
  const withoutCode = stripCountryCode(phone);  // ex: 11999999999

  for (const variant of [withCode, withoutCode]) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("phone", variant)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) return data.id as string;
  }

  return null;
}
