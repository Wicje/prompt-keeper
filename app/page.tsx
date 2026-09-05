import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PromptCard } from "@/app/_components/prompt-card";
import { StatsCard } from "@/app/_components/stats-card";
import { enrichPromptsWithUrls } from "@/lib/images";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function HomePage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [promptsRes, countRes, favRes, imgCountRes] = await Promise.all([
    supabase
      .from("prompts")
      .select("*, generated_images(*)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("favorite", true),
    supabase
      .from("generated_images")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const totalPrompts = countRes.count ?? 0;
  const favorites = favRes.count ?? 0;
  const totalImages = imgCountRes.count ?? 0;

  const list = await enrichPromptsWithUrls(supabase, promptsRes.data ?? []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your prompts</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {totalPrompts > 0
              ? `You have saved ${totalPrompts} prompt${totalPrompts === 1 ? "" : "s"}.`
              : "Nothing saved yet."}
          </p>
        </div>
        <Link
          href="/add"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          + New
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatsCard label="Prompts" value={totalPrompts} href="/gallery" />
        <StatsCard label="Images" value={totalImages} href="/gallery" />
        <StatsCard label="Favorites" value={favorites} href="/gallery?fav=1" />
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            When the AI gives you a prompt you want to keep, capture it from
            the{" "}
            <Link href="/add" className="underline">
              Add page
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </div>
      )}
    </main>
  );
}