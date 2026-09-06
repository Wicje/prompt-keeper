import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCaptureToken } from "@/lib/tokens";
import { capturePrompt } from "@/lib/capture";

export const maxDuration = 30;

export const runtime = "nodejs";

interface CaptureBody {
  promptText?: string;
  notes?: string;
  aiSource?: string;
  sourceUrl?: string;
  tags?: string[];
  favorite?: boolean;
  referenceImageUrl?: string;
}

/**
 * POST /api/external/capture
 *
 * Saves a prompt on behalf of an authenticated user, authenticated with a
 * per-user capture token (Authorization: Bearer pk_...). Used by the Chrome
 * extension, the Custom GPT action, and curl. Returns 200 with
 * { duplicate: true, promptId } when the same prompt text already exists for
 * the user.
 */
export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    ""
  );
  if (!token) {
    return NextResponse.json({ error: "Missing capture token" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server" },
      { status: 500 }
    );
  }

  const userId = await verifyCaptureToken(supabase, token);
  if (!userId) {
    return NextResponse.json({ error: "Invalid capture token" }, { status: 401 });
  }

  let body: CaptureBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await capturePrompt(supabase, userId, {
    promptText: body.promptText ?? "",
    notes: body.notes,
    aiSource: body.aiSource,
    sourceUrl: body.sourceUrl,
    tags: body.tags,
    favorite: body.favorite,
    referenceImageUrl: body.referenceImageUrl,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        duplicate: Boolean(result.duplicate),
        promptId: result.promptId,
      },
      { status: result.duplicate ? 200 : 500 }
    );
  }

  return NextResponse.json({ ok: true, promptId: result.promptId });
}