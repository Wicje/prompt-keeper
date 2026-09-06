"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PromptWithImages } from "@/lib/types";

interface Props {
  prompt: PromptWithImages;
}

export function PromptActions({ prompt }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addImageRef = useRef<HTMLInputElement>(null);

  function copyPrompt() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(prompt.prompt_text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function sharePrompt() {
    if (shareBusy) return;
    setShareBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Share failed");
        return;
      }
      const token = data.prompt?.share_token;
      if (token && typeof navigator !== "undefined" && navigator.clipboard) {
        const url = `${window.location.origin}/p/${token}`;
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1500);
      }
      router.refresh();
    } catch {
      setError("Network error while sharing.");
    } finally {
      setShareBusy(false);
    }
  }

  async function unsharePrompt() {
    if (shareBusy) return;
    setShareBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unshare failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while unsharing.");
    } finally {
      setShareBusy(false);
    }
  }

  function toggleFavorite() {
    startTransition(async () => {
      await fetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: !prompt.favorite }),
      });
      router.refresh();
    });
  }

  async function deletePrompt() {
    if (!confirm("Delete this prompt and ALL its images? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Delete failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while deleting.");
    } finally {
      setBusy(false);
    }
  }

  function onAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large (max 8 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptId: prompt.id,
            dataUrl: reader.result,
            fileName: file.name,
            mimeType: file.type,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Upload failed");
        } else {
          router.refresh();
        }
      } catch {
        setError("Network error while uploading.");
      } finally {
        setBusy(false);
        if (addImageRef.current) addImageRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <button
        onClick={copyPrompt}
        className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        {copied ? "Copied!" : "Copy prompt"}
      </button>

      <a
        href={`/edit/${prompt.id}`}
        className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        Edit
      </a>

      <button
        onClick={toggleFavorite}
        disabled={pending}
        className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
          prompt.favorite
            ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300"
            : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
        }`}
      >
        {prompt.favorite ? "★ Starred" : "☆ Star"}
      </button>

      <label
        className="cursor-pointer rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        title="Upload another generated image to this prompt"
      >
        {busy ? "Uploading…" : "+ Add image"}
        <input
          ref={addImageRef}
          type="file"
          accept="image/*"
          onChange={onAddImage}
          className="hidden"
        />
      </label>

      {prompt.share_token ? (
        <span className="flex items-center gap-1.5">
          <button
            onClick={sharePrompt}
            disabled={shareBusy}
            className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900 dark:text-emerald-300"
            title="Copy the share link"
          >
            {copiedLink ? "Link copied!" : "✓ Shared"}
          </button>
          <button
            onClick={unsharePrompt}
            disabled={shareBusy}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          >
            Unshare
          </button>
        </span>
      ) : (
        <button
          onClick={sharePrompt}
          disabled={shareBusy}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          title="Create a public link for this prompt"
        >
          {shareBusy ? "Sharing…" : "Share"}
        </button>
      )}

      <span className="flex-1" />

      <button
        onClick={deletePrompt}
        disabled={busy}
        className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950 dark:text-red-400"
      >
        Delete
      </button>

      {error && (
        <span className="w-full text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}