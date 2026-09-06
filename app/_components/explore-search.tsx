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
}

function ExploreSearchInner({ q, source }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string, nextSource: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    if (nextSource) params.set("source", nextSource);
    else params.delete("source");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
      <input
        type="search"
        defaultValue={q}
        placeholder="Search shared prompts…"
        onKeyDown={(e) => {
          if (e.key === "Enter") apply(e.currentTarget.value, source);
        }}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        value={source}
        onChange={(e) => {
          const el = document.querySelector<HTMLInputElement>('input[type="search"]');
          apply(el?.value ?? q, e.target.value);
        }}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {SOURCES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-sm text-zinc-400">Loading…</span>}
    </div>
  );
}

export function ExploreSearch({ q, source }: Props) {
  return (
    <Suspense>
      <ExploreSearchInner q={q} source={source} />
    </Suspense>
  );
}