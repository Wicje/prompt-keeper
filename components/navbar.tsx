import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/app/_components/sign-out-button";

export default async function Navbar() {
  const supabase = await createClient();
  const user = supabase
    ? (
        await supabase.auth.getUser()
      ).data.user
    : null;

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Prompt Keeper
        </Link>
        {user ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/add"
              className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-zinc-900"
            >
              + Capture
            </Link>
            <Link
              href="/"
              className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Dashboard
            </Link>
            <Link
              href="/gallery"
              className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Gallery
            </Link>
            <Link
              href="/integrations"
              className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Integrations
            </Link>
            <SignOutButton />
          </nav>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
