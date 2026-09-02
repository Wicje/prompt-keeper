"use client";

import { signOut } from "@/lib/actions/auth";
import { useTransition } from "react";

export default function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={pending}
      className="font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
