import type { ServiceClient } from "@/lib/supabase/service";
import { uploadImageBytes, getSignedUrl } from "@/lib/images";

export interface CapturedPrompt {
  promptText: string;
  notes?: string;
  aiSource?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  favorite?: boolean;
  referenceImageUrl?: string | null;
  /** Raw image bytes (e.g. from Telegram) to store as the reference image. */
  referenceFile?: { buffer: Buffer; mimeType: string };
}

export interface CaptureResult {
  ok: boolean;
  duplicate?: boolean;
  promptId?: string;
  error?: string;
}

const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

function normalizeTags(tags: unknown): string[] {
  return Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
}

async function findExisting(
  supabase: ServiceClient,
  userId: string,
  promptText: string
): Promise<string | null> {
  const { data } = await supabase
    .from("prompts")
    .select("id")
    .eq("user_id", userId)
    .ilike("prompt_text", promptText)
    .maybeSingle();
  return data?.id ?? null;
}

async function downloadReferenceImage(url: string): Promise<{
  success: boolean;
  mimeType?: string;
  buffer?: Buffer;
  url?: string;
  error?: string;
}> {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return { success: false, error: "Reference image URL must be http(s)" };
    }
    const res = await fetch(parsed, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { success: false, error: `Reference image fetch failed (${res.status})` };
    }
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_REMOTE_IMAGE_BYTES) {
      return { success: false, error: "Reference image is too large (max 10 MB)" };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_REMOTE_IMAGE_BYTES) {
      return { success: false, error: "Reference image is too large (max 10 MB)" };
    }
    const mimeType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return { success: false, error: "Reference URL did not return an image" };
    }
    return { success: true, mimeType, buffer, url };
  } catch {
    return { success: false, error: "Could not download the reference image" };
  }
}

/**
 * Saves a prompt for a user using the service client (bypasses RLS).
 * Used by external integrations: Telegram bot, Custom GPT action, extension.
 * Duplicates (same text for the same user) are detected and reported.
 */
export async function capturePrompt(
  supabase: ServiceClient,
  userId: string,
  input: CapturedPrompt
): Promise<CaptureResult> {
  const promptText = (input.promptText ?? "").trim();
  if (!promptText) {
    return { ok: false, error: "promptText is required" };
  }

  const existingId = await findExisting(supabase, userId, promptText);
  if (existingId) {
    return { ok: false, duplicate: true, promptId: existingId };
  }

  // Optionally store a reference image for the prompt.
  let reference_storage_path: string | null = null;
  let reference_public_url: string | null = null;
  if (input.referenceFile) {
    const up = await uploadImageBytes(
      supabase,
      userId,
      input.referenceFile.buffer,
      "reference",
      input.referenceFile.mimeType
    );
    if (!up.error) {
      reference_storage_path = up.path;
      reference_public_url = up.signedUrl;
    }
  } else if (input.referenceImageUrl) {
    const dl = await downloadReferenceImage(input.referenceImageUrl);
    if (dl.success && dl.buffer && dl.mimeType && dl.url) {
      const up = await uploadImageBytes(
        supabase,
        userId,
        dl.buffer,
        "reference",
        dl.mimeType
      );
      if (!up.error) {
        reference_storage_path = up.path;
        reference_public_url = up.signedUrl;
      }
    }
  }

  const { data, error } = await supabase
    .from("prompts")
    .insert({
      user_id: userId,
      prompt_text: promptText,
      notes: input.notes?.trim() || null,
      ai_source: input.aiSource || null,
      source_url: input.sourceUrl?.trim() || null,
      reference_storage_path,
      reference_public_url,
      tags: normalizeTags(input.tags),
      favorite: Boolean(input.favorite),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to save prompt" };
  }

  return { ok: true, promptId: data.id };
}

export { getSignedUrl };

/**
 * Attaches a generated image to an existing prompt (used by the Telegram bot).
 * Returns ok:false without inserting when the upload fails.
 */
export async function attachGeneratedImage(
  supabase: ServiceClient,
  userId: string,
  promptId: string,
  buffer: Buffer,
  mimeType: string,
  caption?: string
): Promise<{ ok: boolean; error?: string }> {
  const up = await uploadImageBytes(
    supabase,
    userId,
    buffer,
    "generated",
    mimeType
  );
  if (up.error) {
    return { ok: false, error: up.error };
  }

  const { error } = await supabase.from("generated_images").insert({
    user_id: userId,
    prompt_id: promptId,
    storage_path: up.path,
    public_url: up.signedUrl,
    caption: caption?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}