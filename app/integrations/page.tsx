import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tgGetMe } from "@/lib/telegram";
import IntegrationsClient from "@/app/_components/integrations-client";

export const metadata: Metadata = {
  title: "Integrations",
};

export default async function IntegrationsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await tgGetMe();
  const botUsername = me?.username ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
      <p className="mb-8 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Wire your AI tools straight into your vault so capturing takes one
        action instead of a form.
      </p>

      <IntegrationsClient botUsername={botUsername} />

      <section className="mt-6 rounded-2xl border border-zinc-200 p-6 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
          Quick recap of the automatic ways to capture
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Telegram bot</strong> — paste a prompt (or a photo +
            caption) into the chat; it lands in your vault instantly.
          </li>
          <li>
            <strong>Chrome/Edge extension</strong> — right-click a selection on
            ChatGPT, Gemini or any site and “Save selection to Prompt Keeper”.
          </li>
          <li>
            <strong>Custom ChatGPT action</strong> — a GPT that posts its final
            prompt to your vault using your capture key.
          </li>
          <li>
            <strong>Bookmarklet</strong> — one-click capture from any browser.
          </li>
        </ul>
      </section>
    </main>
  );
}