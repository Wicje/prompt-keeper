"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SOURCES = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "gemini", label: "Gemini" },
  { value: "grok", label: "Grok" },
  { value: "other", label: "Other" },
];

export default function BatchImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [aiSource, setAiSource] = useState("chatgpt");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    const items = text
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((promptText) => ({
        promptText,
        aiSource,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }));

    try {
      const res = await fetch("/api/prompts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      setResult(`Imported ${data.count} prompt${data.count === 1 ? "" : "s"}.`);
      setText("");
      router.refresh();
    } catch {
      setError("Network error while importing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="batchSource" className="mb-1 block text-sm font-medium">
            Source
          </label>
          <select
            id="batchSource"
            value={aiSource}
            onChange={(e) => setAiSource(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="batchTags" className="mb-1 block text-sm font-medium">
            Tags for all (comma separated, optional)
          </label>
          <input
            id="batchTags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="batchText" className="mb-1 block text-sm font-medium">
          One prompt per line
        </label>
        <textarea
          id="batchText"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Prompt one\nPrompt two\nPrompt three…"}
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {result && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {result}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {busy ? "Importing…" : "Import all"}
      </button>
    </form>
  );
}