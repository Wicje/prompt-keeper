import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { enrichPromptsWithUrls } from "@/lib/images";
import { ShareCopyButton } from "@/app/_components/share-copy-button";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
  other: "Other",
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function generateMetadata(props: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await props.params;
  const supabase = createServiceClient();
  if (!supabase) return { title: "Shared prompt" };
  const { data } = await supabase
    .from("prompts")
    .select("title, prompt_text")
    .eq("share_token", token)
    .maybeSingle();
  const title = data?.title?.trim() || "Shared prompt";
  return {
    title,
    description: data?.prompt_text?.slice(0, 160) || undefined,
  };
}

export default async function SharedPromptPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  const supabase = createServiceClient();
  if (!supabase) notFound();

  const { data: prompt } = await supabase
    .from("prompts")
    .select("*, generated_images(*)")
    .eq("share_token", token)
    .maybeSingle();

  if (!prompt) notFound();

  const [enriched] = await enrichPromptsWithUrls(supabase, [prompt]);
  const images = enriched.generated_images ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Shared prompt
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Shared from{" "}
            <Link href="/login" className="underline">
              Prompt Keeper
            </Link>
            .
          </p>
        </div>
        <ShareCopyButton text={enriched.prompt_text} />
      </div>

      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {enriched.title && (
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {enriched.title}
            </h2>
          )}
          {(enriched.ai_source || enriched.tags.length > 0) && (
            <span className="flex flex-wrap items-center gap-1">
              {enriched.ai_source && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {SOURCE_LABEL[enriched.ai_source ?? ""] ??
                    enriched.ai_source}
                </span>
              )}
              {enriched.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                >
                  #{t}
                </span>
              ))}
            </span>
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {enriched.prompt_text}
        </p>

        {(enriched.source_url || enriched.notes) && (
          <div className="mt-3 space-y-1 text-sm">
            {enriched.source_url && (
              <p className="text-zinc-500 dark:text-zinc-400">
                Reference:{" "}
                <a
                  href={enriched.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {enriched.source_url}
                </a>
              </p>
            )}
            {enriched.notes && (
              <p className="text-zinc-500 dark:text-zinc-400">
                Notes: {enriched.notes}
              </p>
            )}
          </div>
        )}

        {enriched.reference_public_url && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Reference image
            </p>
            <a
              href={enriched.reference_public_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enriched.reference_public_url}
                alt="Reference"
                className="h-36 w-36 rounded-lg object-cover"
                loading="lazy"
              />
            </a>
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Generated images ({images.length})
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img) => (
                <figure key={img.id}>
                  <a
                    href={img.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.public_url}
                      alt={img.caption ?? "Generated image"}
                      className="h-32 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  </a>
                  {img.caption && (
                    <figcaption className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-400 dark:border-zinc-800">
          Saved {formatDate(enriched.created_at)}
        </p>
      </article>
    </main>
  );
}