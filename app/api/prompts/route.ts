import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

interface SavePromptBody {
  promptText: string;
  notes?: string;
  aiSource?: string | null;
  sourceUrl?: string | null;
  // Uploaded generated image as Data URL (e.g. from FileReader) - optional
  generatedImage?: {
    dataUrl: string;
    fileName: string;
    mimeType: string;
    caption?: string;
  } | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const {
    data: prompt,
    error: promptError,
  } = await supabase
    .from("prompts")
    .insert({
      user_id: user.id,
      prompt_text: promptText,
      notes: body.notes?.trim() || null,
      ai_source: body.aiSource || null,
      source_url: body.sourceUrl?.trim() || null,
    })
    .select()
    .single();

  if (promptError || !prompt) {
    return NextResponse.json(
      { error: promptError?.message ?? "Failed to save prompt" },
      { status: 500 }
    );
  }

  let image: Awaited<
    ReturnType<typeof insertImage>
  > | null = null;

  if (body.generatedImage?.dataUrl) {
    const result = await insertImage(supabase, user.id, prompt.id, body.generatedImage);
    if (result.error) {
      return NextResponse.json(
        { error: result.error, promptSaved: true },
        { status: 500 }
      );
    }
    image = result;
  }

  return NextResponse.json({ prompt, image });
}

async function insertImage(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  promptId: string,
  img: NonNullable<SavePromptBody["generatedImage"]>
) {
  const { dataUrl, fileName, mimeType, caption } = img;

  const base64 = dataUrl.split(",")[1] ?? "";
  const fileBuffer = Buffer.from(base64, "base64");

  const safeName = (fileName || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const extension = safeName.includes(".")
    ? safeName.split(".").pop()
    : (mimeType.split("/")[1] ?? "png");
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message || "Image upload failed" };
  }

  const {
    data: urlData,
    error: urlError,
  } = await supabase.storage.from("images").createSignedUrl(
    storagePath,
    60 * 60 * 24 * 365 // 1 year signed URL
  );

  const publicUrl = urlData?.signedUrl ?? "";
  if (urlError && !publicUrl) {
    return { error: urlError.message || "Failed to get image URL" };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("generated_images")
    .insert({
      user_id: userId,
      prompt_id: promptId,
      storage_path: storagePath,
      public_url: publicUrl,
      caption: caption?.trim() || null,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    return {
      error: insertError?.message ?? "Failed to record generated image",
    };
  }

  return {
    id: inserted.id,
    public_url: publicUrl,
  };
}
