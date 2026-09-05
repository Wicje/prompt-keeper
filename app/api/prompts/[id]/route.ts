import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/api-helpers";
import { deleteStorageObject, uploadImage } from "@/lib/images";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = authed;
  const { id } = await ctx.params;

  let body: {
    promptText?: string;
    notes?: string;
    aiSource?: string | null;
    sourceUrl?: string | null;
    tags?: string[];
    favorite?: boolean;
    referenceImage?: {
      dataUrl: string;
      fileName: string;
      mimeType: string;
    } | null;
    removeReference?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Ensure this prompt belongs to the user.
  const { data: existing } = await supabase
    .from("prompts")
    .select("id, reference_storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.promptText === "string") {
    const t = body.promptText.trim();
    if (!t) return NextResponse.json({ error: "promptText is required" }, { status: 400 });
    patch.prompt_text = t;
  }
  if (typeof body.notes === "string") patch.notes = body.notes.trim() || null;
  if ("aiSource" in body) patch.ai_source = body.aiSource || null;
  if (typeof body.sourceUrl === "string") patch.source_url = body.sourceUrl.trim() || null;
  if (Array.isArray(body.tags)) {
    patch.tags = body.tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof body.favorite === "boolean") patch.favorite = body.favorite;

  if (body.removeReference || body.referenceImage?.dataUrl) {
    if (existing.reference_storage_path) {
      await deleteStorageObject(supabase, existing.reference_storage_path);
    }
    if (body.referenceImage?.dataUrl) {
      const up = await uploadImage(
        supabase,
        user.id,
        body.referenceImage.dataUrl,
        body.referenceImage.fileName,
        body.referenceImage.mimeType
      );
      if (up.error) {
        return NextResponse.json(
          { error: up.error || "Reference image upload failed" },
          { status: 500 }
        );
      }
      patch.reference_storage_path = up.path;
      patch.reference_public_url = up.signedUrl;
    } else {
      patch.reference_storage_path = null;
      patch.reference_public_url = null;
    }
  }

  const { data: updated, error } = await supabase
    .from("prompts")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ prompt: updated });
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = authed;
  const { id } = await ctx.params;

  const { data: prompt } = await supabase
    .from("prompts")
    .select("id, reference_storage_path, generated_images(storage_path)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prompt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Remove all storage objects first.
  const paths = (prompt.generated_images ?? []).map(
    (g: { storage_path: string }) => g.storage_path
  );
  if (prompt.reference_storage_path) paths.push(prompt.reference_storage_path);
  for (const p of paths) {
    await deleteStorageObject(supabase, p);
  }

  const { error } = await supabase
    .from("prompts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Delete failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}