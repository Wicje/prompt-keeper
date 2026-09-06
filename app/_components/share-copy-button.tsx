"use client";

import { useState } from "react";

export function ShareCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={copy}
      className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
    >
      {copied ? "Copied!" : "Copy prompt"}
    </button>
  );
}