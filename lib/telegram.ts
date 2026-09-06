import type { ServiceClient } from "@/lib/supabase/service";

export function tgBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

function tgApi(method: string, params: Record<string, unknown> = {}) {
  const token = tgBotToken();
  if (!token) return Promise.resolve(null);
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
    .then(async (r) => {
      const json = await r.json();
      return json.ok ? json.result : null;
    })
    .catch(() => null);
}

export async function tgSendMessage(
  chatId: number | string,
  text: string,
  opts: { parseMode?: "Markdown" | "HTML" } = {}
): Promise<boolean> {
  const result = await tgApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: opts.parseMode ?? "Markdown",
  });
  return result !== null && result !== undefined;
}

export async function tgGetMe(): Promise<{ id: number; username: string } | null> {
  return (await tgApi("getMe")) ?? null;
}

export async function tgGetFile(fileId: string): Promise<{ file_path: string } | null> {
  return (await tgApi("getFile", { file_id: fileId })) ?? null;
}

export async function tgDownloadFile(fileId: string): Promise<Buffer | null> {
  const token = tgBotToken();
  const file = await tgGetFile(fileId);
  if (!token || !file) return null;
  try {
    const res = await fetch(
      `https://api.telegram.org/file/bot${token}/${file.file_path}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Ensures Telegram calls this deployment's webhook URL. Safe to call often. */
export async function ensureTelegramWebhook(): Promise<string | null> {
  const token = tgBotToken();
  if (!token) return null;

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!productionUrl) return null;
  const webhookUrl = `https://${productionUrl}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

  const info = await tgApi("getWebhookInfo");
  if (info && info.url === webhookUrl) return webhookUrl;

  await tgApi("setWebhook", {
    url: webhookUrl,
    secret_token: secret || undefined,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  return webhookUrl;
}

/** Looks up the user linked to a Telegram chat. */
export async function tgUserForChat(
  supabase: ServiceClient,
  chatId: number
): Promise<string | null> {
  const { data } = await supabase
    .from("telegram_users")
    .select("user_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data?.user_id ?? null;
}