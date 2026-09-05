import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/images";
import { getAuthedClient } from "@/lib/api-helpers";

export const maxDuration = 30;

interface ImageInput {
  dataUrl: string;
  fileName: string;
  mimeType: string;
  caption?: string;
}

export interface SavePromptBody {
  promptText: string;
  notes?: string;
  aiSource?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  favorite?: boolean;
  referenceImage?: ImageInput | null;
  generatedImage?: ImageInput | null;
}

export async function POST(request: Request) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = authed;

  let body: SavePromptBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const promptText = (body.promptText ?? "").trim();
  if (!promptText) {
    return NextResponse.json(
      { error: "promptText is required" },
      { status: 400 }
    );
  }

  // Upload the reference image first so we have its storage path to store.
  let reference_storage_path: string | null = null;
  let reference_public_url: string | null = null;
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
    reference_storage_path = up.path;
    reference_public_url = up.signedUrl;
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  const { data: prompt, error: promptError } = await supabase
    .from("prompts")
    .insert({
      user_id: user.id,
      prompt_text: promptText,
      notes: body.notes?.trim() || null,
      ai_source: body.aiSource || null,
      source_url: body.sourceUrl?.trim() || null,
      reference_storage_path,
      reference_public_url,
      tags,
      favorite: Boolean(body.favorite),
    })
    .select()
    .single();

  if (promptError || !prompt) {
    return NextResponse.json(
      { error: promptError?.message ?? "Failed to save prompt" },
      { status: 500 }
    );
  }

  let image: null | { id: string; public_url: string } = null;

  if (body.generatedImage?.dataUrl) {
    const up = await uploadImage(
      supabase,
      user.id,
      body.generatedImage.dataUrl,
      body.generatedImage.fileName,
      body.generatedImage.mimeType
    );
    if (up.error) {
      return NextResponse.json(
        { error: up.error, promptSaved: true },
        { status: 500 }
      );
    }
    const { data: inserted, error: insertError } = await supabase
      .from("generated_images")
      .insert({
        user_id: user.id,
        prompt_id: prompt.id,
        storage_path: up.path,
        public_url: up.signedUrl,
        caption: body.generatedImage.caption?.trim() || null,
      })
      .select()
      .single();
    if (!insertError && inserted) {
      image = { id: inserted.id, public_url: inserted.public_url };
    }
  }

  return NextResponse.json({ prompt, image });
}