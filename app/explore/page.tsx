import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { enrichPromptsWithUrls, type PromptRow } from "@/lib/images";
import type { PromptWithImages } from "@/lib/types";
import { ShareCopyButton } from "@/app/_components/share-copy-button";
import { ExploreSearch } from "@/app/_components/explore-search";

export const metadata: Metadata = {
  title: "Explore",
};

export const dynamic = "force-dynamic";

export const maxDuration = 30;

const SOURCE_LABEL: Record<string, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function firstThumbnail(p: PromptWithImages): string | null {
  return p.generated_images?.[0]?.public_url ?? p.reference_public_url ?? null;
}

function snippet(text: string, max = 160) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

export default async function ExplorePage(props: {
  searchParams: Promise<{ q?: string; source?: string }>;
}) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const source =
    typeof searchParams?.source === "string" ? searchParams.source : "";

  const supabase = createServiceClient();
  let prompts: PromptWithImages[] = [];
  let unconfigured = false;

  if (!supabase) {
    unconfigured = true;
  } else {
    let query = supabase
      .from("prompts")
      .select("*, generated_images(*)")
      .not("share_token", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (q) {
      query = query.or(`prompt_text.ilike.%${q}%,title.ilike.%${q}%`);
    }
    if (source) {
      query = query.eq("ai_source", source);
    }

    const { data } = await query;
    if (data) {
      prompts = await enrichPromptsWithUrls(supabase, data as PromptRow[]);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Explore shared prompts
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Prompts other people have shared. Everything here is public.
        </p>
      </div>

      <ExploreSearch q={q} source={source} />

      {unconfigured ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            Explore isn&rsquo;t enabled on this instance yet (missing the
            server-side Supabase key).
          </p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500 dark:text-zinc-400">
            {q || source
              ? "No shared prompts match your filters."
              : "No shared prompts yet. Share one from your gallery to get the feed started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {prompts.map((p) => {
            const thumb = firstThumbnail(p);
            return (
              <article
                key={p.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link
                  href={`/p/${p.share_token}`}
                  className="flex gap-4 p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="h-24 w-24 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {p.title && (
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {p.title}
                        </span>
                      )}
                      {p.ai_source && (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {SOURCE_LABEL[p.ai_source] ?? p.ai_source}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">
                        {formatDate(p.created_at)}
                      </span>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {snippet(p.prompt_text)}
                    </p>
                    {p.tags.length > 0 && (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {p.tags.slice(0, 5).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          >
                            #{t}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
                  <span className="text-xs text-zinc-400">
                    {p.generated_images?.length ?? 0}{" "}
                    {p.generated_images?.length === 1 ? "image" : "images"}
                  </span>
                  <span className="flex items-center gap-2">
                    <ShareCopyButton text={p.prompt_text} />
                    <Link
                      href={`/p/${p.share_token}`}
                      className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Open
                    </Link>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}