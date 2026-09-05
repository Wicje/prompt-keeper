"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, Suspense } from "react";

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "gemini", label: "Gemini" },
  { value: "grok", label: "Grok" },
  { value: "other", label: "Other" },
];

interface Props {
  q: string;
  source: string;
  tag: string;
  fav: string;
}

function GallerySearchInner({ q, source, tag, fav }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string, nextSource: string, nextTag: string, nextFav: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    if (nextSource) params.set("source", nextSource);
    else params.delete("source");
    if (nextTag) params.set("tag", nextTag);
    else params.delete("tag");
    if (nextFav) params.set("fav", nextFav);
    else params.delete("fav");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
      <input
        type="search"
        defaultValue={q}
        placeholder="Search prompts…"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            apply(
              e.currentTarget.value,
              source,
              tag,
              fav
            );
          }
        }}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        value={source}
        onChange={(e) => {
          const el = document.querySelector<HTMLInputElement>('input[type="search"]');
          apply(el?.value ?? q, e.target.value, tag, fav);
        }}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {SOURCES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        defaultValue={tag}
        placeholder="Tag (e.g. portrait)"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const el = document.querySelector<HTMLInputElement>('input[type="search"]');
            apply(el?.value ?? q, source, e.currentTarget.value, fav);
          }
        }}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        onClick={() => apply(q, source, tag, fav ? "" : "1")}
        className={`rounded-lg border px-3 py-2 text-sm font-medium ${
          fav === "1"
            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
            : "border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
        }`}
      >
        {fav === "1" ? "★ Favorites" : "☆ Favorites"}
      </button>
      {pending && <span className="text-sm text-zinc-400">Loading…</span>}
    </div>
  );
}

export function GallerySearch({ q, source, tag, fav }: Props) {
  return (
    <Suspense>
      <GallerySearchInner q={q} source={source} tag={tag} fav={fav} />
    </Suspense>
  );
}