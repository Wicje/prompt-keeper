import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export type ServiceClient = NonNullable<
  ReturnType<typeof createServiceClient>
>;

/**
 * A Supabase client with the service-role key. Only for server-side code
 * (webhooks, external capture, integrations). Bypasses RLS — never expose
 * anything derived from it to the client.
 */
export function createServiceClient() {
  const url = env.supabaseUrl;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}