"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AiSource, Prompt } from "@/lib/types";

interface Props {
  // When provided, the form edits this existing prompt (PATCH) instead of creating.
  promptToEdit?: Prompt;
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

interface ImageState {
  dataUrl: string;
  fileName: string;
  mimeType: string;
}

export default function CaptureForm({
  promptToEdit,
  prefillPrompt,
  prefillSource,
  prefillAiSource,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(promptToEdit);

  const [prompt, setPrompt] = useState(promptToEdit?.prompt_text ?? prefillPrompt ?? "");
  const [notes, setNotes] = useState(promptToEdit?.notes ?? "");
  const [sourceUrl, setSourceUrl] = useState(
    promptToEdit?.source_url ?? prefillSource ?? ""
  );
  const [aiSource, setAiSource] = useState<AiSource>(
    (promptToEdit?.ai_source as AiSource) || (prefillAiSource as AiSource) || "chatgpt"
  );
  const [tagsInput, setTagsInput] = useState((promptToEdit?.tags ?? []).join(", "));
  const [favorite, setFavorite] = useState(promptToEdit?.favorite ?? false);

  const [generatedImage, setGeneratedImage] = useState<ImageState | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [referenceImage, setReferenceImage] = useState<ImageState | null>(null);
  const [removeReference, setRemoveReference] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const generatedInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // For edit mode: any existing reference image that should be replaced/removed.
  const hasExistingReference = Boolean(promptToEdit?.reference_storage_path);
  const showReferenceRemove = hasExistingReference && !referenceImage;

  function readFile(
    file: File,
    cb: (img: ImageState) => void
  ) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large (max 8 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      cb({
        dataUrl: reader.result as string,
        fileName: file.name,
        mimeType: file.type,
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const payload: Record<string, unknown> = {
        promptText: prompt,
        notes,
        aiSource,
        sourceUrl,
        tags,
        favorite,
        referenceImage: referenceImage
          ? {
              dataUrl: referenceImage.dataUrl,
              fileName: referenceImage.fileName,
              mimeType: referenceImage.mimeType,
            }
          : null,
      };

      let url = "/api/prompts";
      let method = "POST";

      if (isEdit && promptToEdit) {
        url = `/api/prompts/${promptToEdit.id}`;
        method = "PATCH";
        if (generatedImage) {
          payload["generatedImage"] = {
            dataUrl: generatedImage.dataUrl,
            fileName: generatedImage.fileName,
            mimeType: generatedImage.mimeType,
            caption: generatedCaption,
          };
        }
        if (hasExistingReference && !referenceImage && removeReference) {
          payload["removeReference"] = true;
        }
      } else if (generatedImage) {
        payload["generatedImage"] = {
          dataUrl: generatedImage.dataUrl,
          fileName: generatedImage.fileName,
          mimeType: generatedImage.mimeType,
          caption: generatedCaption,
        };
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }

      setPrompt("");
      setNotes("");
      setSourceUrl("");
      setTagsInput("");
      setGeneratedImage(null);
      setGeneratedCaption("");
      setReferenceImage(null);
      setRemoveReference(false);
      setFavorite(false);
      if (generatedInputRef.current) generatedInputRef.current.value = "";
      if (referenceInputRef.current) referenceInputRef.current.value = "";
      setSaved(true);

      if (isEdit) {
        router.push("/");
        router.refresh();
      } else {
        router.refresh();
      }
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
          Saved! {isEdit ? "" : "Ready for the next one."}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="aiSource" className="mb-1 block text-sm font-medium">
            From which AI?
          </label>
          <select
            id="aiSource"
            value={aiSource}
            onChange={(e) => setAiSource(e.target.value as AiSource)}
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
          <label htmlFor="tags" className="mb-1 block text-sm font-medium">
            Tags (comma separated)
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="portrait, neon, fantasy"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sourceUrl" className="mb-1 block text-sm font-medium">
            Reference URL (e.g. Pinterest page)
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
          <label className="mb-1 block text-sm font-medium">
            Reference image file (optional)
          </label>
          <input
            ref={referenceInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readFile(f, setReferenceImage);
            }}
            className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:text-zinc-400 dark:file:bg-white dark:file:text-zinc-900"
          />
          {referenceImage && (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referenceImage.dataUrl}
                alt="Reference preview"
                className="h-10 w-10 rounded object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setReferenceImage(null);
                  if (referenceInputRef.current) referenceInputRef.current.value = "";
                }}
                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Remove
              </button>
            </div>
          )}
          {showReferenceRemove && (
            <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={removeReference}
                onChange={(e) => setRemoveReference(e.target.checked)}
              />
              Remove the currently saved reference image
            </label>
          )}
        </div>
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
        <label className="mb-1 block text-sm font-medium">
          {isEdit
            ? "Add a new generated image (optional)"
            : "Generated image — your final image (optional)"}
        </label>
        <input
          ref={generatedInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
              readFile(f, (img) => {
                setGeneratedImage(img);
              });
          }}
          className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:text-zinc-400 dark:file:bg-white dark:file:text-zinc-900"
        />
        {generatedImage && (
          <div className="mt-3 flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImage.dataUrl}
              alt="Generated image preview"
              className="h-24 w-24 rounded-lg object-cover"
            />
            <div className="flex-1">
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                {generatedImage.fileName}
              </p>
              <input
                value={generatedCaption}
                onChange={(e) => setGeneratedCaption(e.target.value)}
                placeholder="Caption for this image (optional)"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={() => {
                  setGeneratedImage(null);
                  if (generatedInputRef.current) generatedInputRef.current.value = "";
                }}
                className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Remove image
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="favorite"
          type="checkbox"
          checked={favorite}
          onChange={(e) => setFavorite(e.target.checked)}
          className="h-4 w-4 accent-zinc-900 dark:accent-white"
        />
        <label htmlFor="favorite" className="text-sm">
          Mark as favorite
        </label>
      </div>

      <button
        type="submit"
        disabled={busy || !prompt.trim()}
        className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {busy ? "Saving…" : isEdit ? "Save changes" : "Save prompt"}
      </button>
    </form>
  );
}