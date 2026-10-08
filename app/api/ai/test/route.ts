export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const result: Record<string, unknown> = {
    key_present: !!apiKey,
    key_prefix:  apiKey ? apiKey.slice(0, 15) + "..." : null,
  };

  if (!apiKey) return NextResponse.json(result);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-3-haiku-20240307",
        max_tokens: 10,
        messages:   [{ role: "user", content: "diga oi" }],
      }),
    });

    const text = await res.text();
    result.status   = res.status;
    result.response = text.slice(0, 300);
  } catch (err) {
    result.fetch_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result);
}
