import type { PromptWithImages } from "@/lib/types";
import { PromptActions } from "@/app/_components/prompt-actions";
import { ImageGrid } from "@/app/_components/image-grid";

const SOURCE_LABEL: Record<string, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PromptCard({ prompt }: { prompt: PromptWithImages }) {
  const images = prompt.generated_images ?? [];

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {prompt.favorite && (
            <span className="text-sm" aria-label="Favorite">
              ★
            </span>
          )}
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {SOURCE_LABEL[prompt.ai_source ?? ""] ?? prompt.ai_source ?? "Unknown"}
          </span>
          {prompt.tags.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {prompt.tags.map((t) => (
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
        <span className="text-xs text-zinc-400">{formatDate(prompt.created_at)}</span>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {prompt.prompt_text}
      </p>

      {(prompt.source_url || prompt.notes || prompt.reference_public_url) && (
        <div className="mt-3 space-y-1 text-sm">
          {prompt.source_url && (
            <p className="text-zinc-500 dark:text-zinc-400">
              Reference:{" "}
              <a
                href={prompt.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {prompt.source_url}
              </a>
            </p>
          )}
          {prompt.notes && (
            <p className="text-zinc-500 dark:text-zinc-400">
              Notes: {prompt.notes}
            </p>
          )}
        </div>
      )}

      {prompt.reference_public_url && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Reference image
          </p>
          <a
            href={prompt.reference_public_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={prompt.reference_public_url}
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
          <ImageGrid images={images} />
        </div>
      )}

      <PromptActions prompt={prompt} />
    </article>
  );
}