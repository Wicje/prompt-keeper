import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Creates a Supabase server client that reads the auth session from cookies.
 *
 * Returns `null` when the project URL/anon key aren't configured yet, so the
 * app can still render (e.g. the login page) during local development before
 * environment variables are set.
 */
export async function createClient(): Promise<SupabaseServerClient | null> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component. Safe to ignore when the
          // middleware/proxy refreshes user sessions.
        }
      },
    },
  });
}
