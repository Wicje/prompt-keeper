"use client";

import { useState } from "react";

export default function CaptureHelper() {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "YOUR_APP_URL";

  // A bookmarklet: run it on ChatGPT/Gemini, it captures the selected text
  // and opens the capture form prefilled.
  const bookmarklet = `javascript:(function(){var t=window.getSelection().toString().trim();var u='${origin}/add?prompt='+encodeURIComponent(t||'')+'&source='+encodeURIComponent(location.href);window.open(u,'_blank');})();`;

  const captureUrl = `${origin}/add?prompt=`;

  async function copyBookmarklet() {
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(captureUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-base font-semibold">Quick capture from ChatGPT / Gemini</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        On ChatGPT, Gemini or Grok, select the prompt text with your mouse,
        then click the bookmarklet below. A new tab opens with the prompt
        already filled in — just add an image and save.
      </p>

      <div className="mt-4 space-y-3">
        <button
          onClick={copyBookmarklet}
          className="w-full rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          {copied ? "Copied!" : "Copy the bookmarklet"}
        </button>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          To install: create a new bookmark in your browser, name it
          &ldquo;Capture prompt&rdquo;, and paste the copied script into the
          URL/address field. Then select text on ChatGPT/Gemini and click the
          bookmark.
        </p>

        <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Or use this link / add a query param manually:
          </p>
          <code className="block break-all text-xs text-zinc-700 dark:text-zinc-300">
            {captureUrl}YOUR_PROMPT
          </code>
          <button
            onClick={copyUrl}
            className="mt-2 text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400"
          >
            {copiedUrl ? "Copied!" : "Copy base link"}
          </button>
        </div>
      </div>
    </div>
  );
}
