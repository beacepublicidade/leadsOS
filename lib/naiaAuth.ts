// lib/naiaAuth.ts — Autenticação de requisições da NAIA via API Key
// Migrado de Firebase para Supabase
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

export interface NaiaSession {
  tenant_id: string;
  key_name: string;
  permissions: string[];
}

// Rate limit em memória (por processo)
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minuto
const RATE_LIMIT_MAX = 60; // 60 req/min

function checkRateLimit(keyHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyHash);

  if (!entry || now > entry.reset) {
    rateLimitMap.set(keyHash, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function verifyNaiaKey(req: NextRequest): Promise<NaiaSession | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) return null;

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  // Verificar a chave estática do .env primeiro (modo simples)
  const envKey = process.env.NAIA_API_KEY;
  if (envKey && apiKey === envKey) {
    if (!checkRateLimit(keyHash)) return null;
    return {
      tenant_id: "default",
      key_name: "env_key",
      permissions: ["leads:read", "leads:write", "conversations:read", "conversations:write", "messages:write", "clients:read"],
    };
  }

  // Verificar no Supabase (modo multi-tenant)
  try {
    const { data, error } = await supabaseAdmin
      .from("naia_api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .limit(1)
      .single();

    if (error || !data) return null;

    if (!checkRateLimit(keyHash)) return null;

    // Atualizar last_used_at (non-critical, fire-and-forget)
    void supabaseAdmin
      .from("naia_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);

    return {
      tenant_id: data.tenant_id ?? "default",
      key_name: data.name ?? "unknown",
      permissions: data.permissions ?? [],
    };
  } catch {
    return null;
  }
}
