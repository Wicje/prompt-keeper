"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedImage } from "@/lib/types";

export function ImageGrid({ images }: { images: GeneratedImage[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Delete failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error while deleting image.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <figure key={img.id} className="group relative">
            <a href={img.public_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.public_url}
                alt={img.caption ?? "Generated image"}
                className="h-32 w-full rounded-lg object-cover"
                loading="lazy"
              />
            </a>
            <button
              onClick={() => remove(img.id)}
              disabled={busyId === img.id}
              className="absolute right-1 top-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity hover:bg-red-700 group-hover:opacity-100 disabled:opacity-50"
              title="Delete image"
            >
              {busyId === img.id ? "…" : "✕"}
            </button>
            {img.caption && (
              <figcaption className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}