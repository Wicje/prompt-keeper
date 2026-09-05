import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/api-helpers";

export async function POST(request: Request) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = authed;

  let body: {
    items: {
      promptText: string;
      notes?: string;
      aiSource?: string | null;
      sourceUrl?: string | null;
      tags?: string[];
    }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array" },
      { status: 400 }
    );
  }

  const rows = body.items
    .map((it) => ({
      user_id: user.id,
      prompt_text: String(it.promptText ?? "").trim(),
      notes: it.notes?.trim() || null,
      ai_source: it.aiSource || null,
      source_url: it.sourceUrl?.trim() || null,
      tags: Array.isArray(it.tags)
        ? it.tags.map((t) => String(t).trim()).filter(Boolean)
        : [],
    }))
    .filter((r) => r.prompt_text.length > 0);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid prompts were provided" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("prompts")
    .insert(rows)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Batch insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ count: data?.length ?? 0 });
}