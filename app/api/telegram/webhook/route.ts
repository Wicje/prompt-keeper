import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  tgSendMessage,
  tgDownloadFile,
  ensureTelegramWebhook,
  tgUserForChat,
} from "@/lib/telegram";
import { capturePrompt } from "@/lib/capture";

export const maxDuration = 30;

export const runtime = "nodejs";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    caption?: string;
    photo?: { file_id: string }[];
  };
}

const HELP = [
  "Prompt Keeper bot",
  "",
  "/link <CODE>  connect this chat to your account (code from the Integrations page)",
  "/recent      show your last 5 prompts",
  "/help        this message",
  "",
  "Any other message is saved to your vault as a new prompt.",
  "Send a photo with a caption and it is saved with the photo as the reference image.",
].join("\n");

function truncate(text: string, max = 90): string {
  const flat = text.replace(/\s+/g, " ");
  return flat.length > max ? flat.slice(0, max) + "…" : flat;
}

async function reply(chatId: number, text: string) {
  await tgSendMessage(chatId, text);
}

async function handleLink(supabase: NonNullable<ReturnType<typeof createServiceClient>>, chatId: number, code: string) {
  if (!code) {
    await reply(chatId, "Send the code from the Integrations page:\n/link <CODE>");
    return;
  }
  const { data } = await supabase
    .from("telegram_link_codes")
    .select("user_id")
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) {
    await reply(
      chatId,
      "That code is invalid or expired. Open the Integrations page in Prompt Keeper and generate a fresh one."
    );
    return;
  }

  const { error } = await supabase
    .from("telegram_users")
    .upsert({ chat_id: chatId, user_id: data.user_id });

  await supabase.from("telegram_link_codes").delete().eq("code", code);

  if (error) {
    await reply(chatId, "Something went wrong while linking. Try again.");
    return;
  }
  await reply(
    chatId,
    "Linked! Now send me any prompt and it's saved to your vault. Send /help for options."
  );
}

async function handleRecent(supabase: NonNullable<ReturnType<typeof createServiceClient>>, chatId: number) {
  const userId = await tgUserForChat(supabase, chatId);
  if (!userId) {
    await reply(chatId, "This chat is not linked yet. Send /help to get started.");
    return;
  }
  const { data } = await supabase
    .from("prompts")
    .select("id, prompt_text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!data || data.length === 0) {
    await reply(chatId, "No saved prompts yet. Send me a prompt!");
    return;
  }
  const lines = data.map(
    (p, i) =>
      `${i + 1}. ${p.created_at.slice(0, 16).replace("T", " ")} — ${truncate(p.prompt_text, 60)}`
  );
  await reply(chatId, ["Your last prompts:", ...lines].join("\n"));
}

async function handleText(supabase: NonNullable<ReturnType<typeof createServiceClient>>, chatId: number, text: string) {
  const userId = await tgUserForChat(supabase, chatId);
  if (!userId) {
    await reply(
      chatId,
      "This chat is not linked yet. Open the Integrations page, copy the code, then send /link <CODE> here."
    );
    return;
  }

  const result = await capturePrompt(supabase, userId, {
    promptText: text,
    aiSource: null,
  });

  if (result.duplicate) {
    await reply(chatId, `Already saved (${truncate(text)}).`);
    return;
  }
  if (!result.ok) {
    await reply(chatId, `Could not save: ${result.error ?? "unknown error"}`);
    return;
  }
  await reply(chatId, `Saved ✓ ${truncate(text)}`);
}

async function handlePhoto(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  chatId: number,
  fileId: string,
  caption: string
) {
  const userId = await tgUserForChat(supabase, chatId);
  if (!userId) {
    await reply(chatId, "This chat is not linked yet. Send /link <CODE> to connect.");
    return;
  }

  const buffer = await tgDownloadFile(fileId);
  if (!buffer) {
    await reply(chatId, "Could not download that image. Try again.");
    return;
  }

  // Telegram photos come through as JPEG (or PNG). Detect from magic bytes.
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
  const mimeType = isPng ? "image/png" : "image/jpeg";

  const result = await capturePrompt(supabase, userId, {
    promptText: caption,
    aiSource: null,
    referenceFile: { buffer, mimeType },
  });

  if (result.duplicate) {
    await reply(chatId, `Already saved (${truncate(caption)}).`);
    return;
  }
  if (!result.ok) {
    await reply(chatId, `Could not save: ${result.error ?? "unknown error"}`);
    return;
  }
  await reply(chatId, `Saved ✓ with reference image (${truncate(caption)}).`);
}

async function handleUpdate(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  update: TelegramUpdate
) {
  const msg = update.message;
  if (!msg?.chat?.id) return;
  const chatId = msg.chat.id;
  const text = (msg.text ?? "").trim();
  const caption = (msg.caption ?? "").trim();
  const photo = msg.photo?.[msg.photo.length - 1];

  if (text.startsWith("/")) {
    const [cmd, arg] = text.split(/\s+/);
    switch (cmd) {
      case "/start":
      case "/help":
        await reply(chatId, HELP);
        return;
      case "/link":
        await handleLink(supabase, chatId, (arg ?? "").toUpperCase());
        return;
      case "/recent":
        await handleRecent(supabase, chatId);
        return;
      default:
        await reply(chatId, "Unknown command. Send /help");
    }
    return;
  }

  if (photo) {
    if (!caption) {
      await reply(chatId, "Add a caption with the prompt and send it again — the photo becomes the reference image.");
      return;
    }
    await handlePhoto(supabase, chatId, photo.file_id, caption);
    return;
  }

  if (text) {
    await handleText(supabase, chatId, text);
  }
}

/** POST /api/telegram/webhook — receives Telegram updates for the bot. */
export async function POST(request: Request) {
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Keep the webhook pointed at this deployment, whatever env it runs under.
  await ensureTelegramWebhook();

  try {
    await handleUpdate(supabase, update);
  } catch (e) {
    console.error("telegram webhook error", e);
  }

  return NextResponse.json({ ok: true });
}