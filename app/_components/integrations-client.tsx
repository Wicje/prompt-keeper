"use client";

import { useState } from "react";
import {
  generateTelegramLinkCode,
  generateCaptureKey,
} from "@/lib/actions/integrations";

interface Props {
  botUsername?: string | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {}
        );
      }}
      className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {message}
    </div>
  );
}

export default function IntegrationsClient({ botUsername }: Props) {
  const [busy, setBusy] = useState(false);
  const [branch, setBranch] = useState<"link" | "key" | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [keyToken, setKeyToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onLink() {
    setBusy(true);
    setBranch("link");
    setError(null);
    const res = await generateTelegramLinkCode();
    setBusy(false);
    if ("error" in res && res.error) setError(res.error);
    else setLinkCode(res.code ?? null);
  }

  async function onKey() {
    setBusy(true);
    setBranch("key");
    setError(null);
    const res = await generateCaptureKey();
    setBusy(false);
    if ("error" in res && res.error) setError(res.error);
    else setKeyToken(res.token ?? null);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Telegram bot</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Chat with a bot to save prompts from your phone or desktop. Message
          it any prompt, or send a photo with a prompt caption.
        </p>
        <ErrorBanner message={error} />
        {botUsername ? (
          <p className="mt-3 text-sm">
            Bot:{" "}
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              @{botUsername}
            </a>
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            The bot token isn&apos;t set yet — add{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              TELEGRAM_BOT_TOKEN
            </code>{" "}
            to the server env to finish setup.
          </p>
        )}
        <button
          onClick={onLink}
          disabled={busy}
          className="mt-4 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {linkCode || branch === "link" ? "Get a fresh code" : "Get link code"}
        </button>
        {linkCode && (
          <div className="mt-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Send this to the bot (expires in 10 minutes):
            </p>
            <div className="mt-1 flex items-center gap-3">
              <code className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-lg font-bold tracking-widest dark:border-zinc-700 dark:bg-zinc-900">
                {linkCode}
              </code>
              <CopyButton text={`/link ${linkCode}`} />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Capture key</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A personal key that lets the Chrome extension and a custom ChatGPT
          action save straight into your vault via{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            /api/external/capture
          </code>
          .
        </p>
        <ErrorBanner message={error} />
        <button
          onClick={onKey}
          disabled={busy}
          className="mt-4 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {keyToken ? "Rotate (invalidates old key)" : "Generate my capture key"}
        </button>
        {keyToken && (
          <div className="mt-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Your key (shown once — copy it now):
            </p>
            <div className="mt-1 flex items-center gap-3">
              <code className="max-w-full break-all rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                {keyToken}
              </code>
              <CopyButton text={keyToken} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}