import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PromptCard } from "@/app/_components/prompt-card";
import { GallerySearch } from "@/app/_components/gallery-search";
import type { PromptWithImages } from "@/lib/types";

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

  let query = supabase
    .from("prompts")
    .select("*, generated_images(*)")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.ilike("prompt_text", `%${q}%`);
  }
  if (source) {
    query = query.eq("ai_source", source);
  }

  const { data: prompts } = await query;
  const list = (prompts ?? []) as PromptWithImages[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Every prompt you&rsquo;ve saved.
      </p>

      <GallerySearch q={q} source={source} />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            {q || source
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
