import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PromptCard } from "@/app/_components/prompt-card";
import { GallerySearch } from "@/app/_components/gallery-search";
import { ExportButton } from "@/app/_components/export-button";
import { enrichPromptsWithUrls } from "@/lib/images";

export const metadata: Metadata = {
  title: "Gallery",
};

export default async function GalleryPage(props: PageProps<"/gallery">) {
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

  const searchParams = await props.searchParams;
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const source =
    typeof searchParams?.source === "string" ? searchParams.source : "";
  const tag = typeof searchParams?.tag === "string" ? searchParams.tag : "";
  const fav = typeof searchParams?.fav === "string" ? searchParams.fav : "";

  let query = supabase
    .from("prompts")
    .select("*, generated_images(*)")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `prompt_text.ilike.%${q}%,title.ilike.%${q}%`
    );
  }
  if (source) {
    query = query.eq("ai_source", source);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }
  if (fav === "1") {
    query = query.eq("favorite", true);
  }

  const { data: prompts } = await query;
  const list = await enrichPromptsWithUrls(supabase, prompts ?? []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Every prompt you&rsquo;ve saved.
          </p>
        </div>
        <ExportButton />
      </div>

      <GallerySearch q={q} source={source} tag={tag} fav={fav} />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            {q || source || tag || fav
              ? "No prompts match your filters."
              : "No prompts saved yet."}
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