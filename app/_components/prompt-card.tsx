import type { PromptWithImages } from "@/lib/types";

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
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {SOURCE_LABEL[prompt.ai_source ?? ""] ?? prompt.ai_source ?? "Unknown"}
        </span>
        <span className="text-xs text-zinc-400">
          {formatDate(prompt.created_at)}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {prompt.prompt_text}
      </p>

      {(prompt.source_url || prompt.notes) && (
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
            <p className="text-zinc-500 dark:text-zinc-400">Notes: {prompt.notes}</p>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <figure key={img.id}>
              <a href={img.public_url} target="_blank" rel="noopener noreferrer">
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
      )}
    </article>
  );
}
