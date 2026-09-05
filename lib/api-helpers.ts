import { createClient } from "@/lib/supabase/server";

export interface AuthedClient {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  user: { id: string; email?: string | null };
}

/** Returns an authenticated Supabase client + user, or null. */
export async function getAuthedClient(): Promise<AuthedClient | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return { supabase, user: { id: user.id, email: user.email ?? null } };
}