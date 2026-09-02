"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiSource } from "@/lib/types";

interface Props {
  prefillPrompt?: string;
  prefillSource?: string;
  prefillAiSource?: string;
}

const SOURCES: { value: AiSource; label: string }[] = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "gemini", label: "Gemini" },
  { value: "grok", label: "Grok" },
  { value: "other", label: "Other" },
];

export default function CaptureForm({
  prefillPrompt,
  prefillSource,
  prefillAiSource,
}: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(prefillPrompt ?? "");
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState(prefillSource ?? "");
  const [aiSource, setAiSource] = useState<AiSource>(
    (prefillAiSource as AiSource) || "chatgpt"
  );
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [imageType, setImageType] = useState<string>("");
  const [imageCaption, setImageCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Image is too large (max 6 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setImageName(file.name);
      setImageType(file.type);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: prompt,
          notes,
          aiSource,
          sourceUrl,
          generatedImage: imageDataUrl
            ? {
                dataUrl: imageDataUrl,
                fileName: imageName,
                mimeType: imageType,
                caption: imageCaption,
              }
            : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save prompt.");
        return;
      }

      // Clear for the next capture
      setPrompt("");
      setNotes("");
      setSourceUrl("");
      setImageDataUrl(null);
      setImageName("");
      setImageType("");
      setImageCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error while saving.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {saved && !error && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Saved! Ready for the next one.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="aiSource"
          className="mb-1 block text-sm font-medium"
        >
          From which AI?
        </label>
        <select
          id="aiSource"
          value={aiSource}
          onChange={(e) => setAiSource(e.target.value as AiSource)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 sm:w-48"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="prompt" className="mb-1 block text-sm font-medium">
          The prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={5}
          placeholder="Paste the prompt the AI gave you here… (Ctrl/Cmd+V)"
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label
          htmlFor="sourceUrl"
          className="mb-1 block text-sm font-medium"
        >
          Reference image URL (e.g. Pinterest)
        </label>
        <input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notes (optional)
        </label>
        <input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra details…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">
          Generated image (your final image, optional)
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:text-zinc-400 dark:file:bg-white dark:file:text-zinc-900"
        />
        {imageDataUrl && (
          <div className="mt-3 flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt="Generated image preview"
              className="h-24 w-24 rounded-lg object-cover"
            />
            <div className="flex-1">
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                {imageName}
              </p>
              <input
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Caption for this image (optional)"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={() => {
                  setImageDataUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Remove image
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={busy || !prompt.trim()}
        className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {busy ? "Saving…" : "Save prompt"}
      </button>
    </form>
  );
}
