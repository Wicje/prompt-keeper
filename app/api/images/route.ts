import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/api-helpers";
import { uploadImage } from "@/lib/images";

export const maxDuration = 30;

export async function POST(request: Request) {
  const authed = await getAuthedClient();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { supabase, user } = authed;

  let body: {
    promptId: string;
    dataUrl: string;
    fileName: string;
    mimeType: string;
    caption?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.promptId || !body.dataUrl) {
    return NextResponse.json(
      { error: "promptId and dataUrl are required" },
      { status: 400 }
    );
  }

  // Verify the prompt belongs to the user.
  const { data: prompt } = await supabase
    .from("prompts")
    .select("id")
    .eq("id", body.promptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!prompt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const up = await uploadImage(
    supabase,
    user.id,
    body.dataUrl,
    body.fileName,
    body.mimeType
  );
  if (up.error) {
    return NextResponse.json(
      { error: up.error || "Upload failed" },
      { status: 500 }
    );
  }

  const { data: inserted, error } = await supabase
    .from("generated_images")
    .insert({
      user_id: user.id,
      prompt_id: prompt.id,
      storage_path: up.path,
      public_url: up.signedUrl,
      caption: body.caption?.trim() || null,
    })
    .select()
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to record image" },
      { status: 500 }
    );
  }

  return NextResponse.json({ image: inserted });
}