import { createHash, randomBytes } from "node:crypto";
import type { ServiceClient } from "@/lib/supabase/service";

const TOKEN_PREFIX = "pk_";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Rotates the user's default capture token and returns the NEW plain token.
 * It is shown exactly once; the DB only stores the SHA-256 hash.
 */
export async function rotateCaptureToken(
  supabase: ServiceClient,
  userId: string
): Promise<{ token: string }> {
  await supabase.from("api_tokens").delete().eq("user_id", userId);

  const token = TOKEN_PREFIX + randomBytes(24).toString("hex");
  const { error } = await supabase
    .from("api_tokens")
    .insert({ token_hash: sha256(token), user_id: userId });

  if (error) throw new Error("Failed to store capture token: " + error.message);
  return { token };
}

/** Returns the user_id for a valid capture token, or null. */
export async function verifyCaptureToken(
  supabase: ServiceClient,
  token: string
): Promise<string | null> {
  if (!token) return null;
  const { data, error } = await supabase
    .from("api_tokens")
    .select("user_id")
    .eq("token_hash", sha256(token))
    .maybeSingle();

  if (error || !data) return null;
  // Best-effort usage tracking; failure is never fatal to the request.
  void supabase
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", sha256(token));
  return data.user_id;
}