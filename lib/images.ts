import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeneratedImage, Prompt, PromptWithImages } from "@/lib/types";

const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7; // 7 days; re-signed on every render

type Client = NonNullable<SupabaseClient>;

export async function uploadImageBytes(
  supabase: Client,
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ path: string; signedUrl: string; error?: string }> {
  const safeName = (fileName || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const extension =
    safeName.includes(".") && safeName.split(".").pop()
      ? String(safeName.split(".").pop())
      : (mimeType.split("/")[1] ?? "png");
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { path: "", signedUrl: "", error: uploadError.message };
  }

  return {
    path: storagePath,
    signedUrl: await getSignedUrl(supabase, storagePath),
  };
}

/** Upload a data-URL image into the user's folder and return its storage path + signed URL. */
export async function uploadImage(
  supabase: Client,
  userId: string,
  dataUrl: string,
  fileName: string,
  mimeType: string
): Promise<{ path: string; signedUrl: string; error?: string }> {
  const base64 = dataUrl.split(",")[1] ?? "";
  return uploadImageBytes(supabase, userId, Buffer.from(base64, "base64"), fileName, mimeType);
}

export async function getSignedUrl(
  supabase: Client,
  storagePath: string
): Promise<string> {
  const { data } = await supabase.storage
    .from("images")
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);
  return data?.signedUrl ?? "";
}

export async function deleteStorageObject(
  supabase: Client,
  storagePath: string
): Promise<void> {
  const path = (storagePath ?? "").trim();
  if (!path) return;
  // Only allow deleting objects owned by this user (path starts with user id).
  if (!path.includes("/")) return;
  await supabase.storage.from("images").remove([path]);
}

/** Re-sign every image and the reference image so stored URLs never go stale. */
export async function refreshPromptUrls(
  supabase: Client,
  prompts: Prompt[]
): Promise<Prompt[]> {
  return Promise.all(
    prompts.map(async (p) => {
      let reference_public_url = p.reference_public_url;
      if (p.reference_storage_path) {
        reference_public_url =
          (await getSignedUrl(supabase, p.reference_storage_path)) ||
          reference_public_url;
      }
      return { ...p, reference_public_url };
    })
  );
}

export async function refreshImageUrls(
  supabase: Client,
  images: GeneratedImage[]
): Promise<GeneratedImage[]> {
  return Promise.all(
    images.map(async (img) => ({
      ...img,
      public_url:
        (await getSignedUrl(supabase, img.storage_path)) || img.public_url,
    }))
  );
}

export interface PromptRow extends Prompt {
  generated_images?: GeneratedImage[];
}

/** Enriches prompts (with their images) with fresh signed URLs for display. */
export async function enrichPromptsWithUrls(
  supabase: Client,
  prompts: PromptRow[]
): Promise<PromptWithImages[]> {
  const withRef = (await refreshPromptUrls(supabase, prompts)) as PromptRow[];
  return Promise.all(
    withRef.map(async (p) => ({
      ...p,
      generated_images: await refreshImageUrls(supabase, p.generated_images ?? []),
    }))
  );
}