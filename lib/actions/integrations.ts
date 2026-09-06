"use server";

import { randomBytes } from "node:crypto";
import { getAuthedClient } from "@/lib/api-helpers";
import { rotateCaptureToken } from "@/lib/tokens";

export interface ActionResult {
  code?: string;
  token?: string;
  error?: string;
}

const CODE_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes

function retryCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function generateTelegramLinkCode(): Promise<ActionResult> {
  const authed = await getAuthedClient();
  if (!authed) return { error: "Not signed in." };

  let code = retryCode();
  let inserted = false;
  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    const { error } = await authed.supabase.from("telegram_link_codes").insert({
      code,
      user_id: authed.user.id,
      expires_at: new Date(Date.now() + CODE_LIFETIME_MS).toISOString(),
    });
    if (!error) {
      inserted = true;
      break;
    }
    code = retryCode();
  }

  if (!inserted) return { error: "Could not create a link code. Try again." };
  return { code };
}

export async function generateCaptureKey(): Promise<ActionResult> {
  const authed = await getAuthedClient();
  if (!authed) return { error: "Not signed in." };

  try {
    const { token } = await rotateCaptureToken(authed.supabase, authed.user.id);
    return { token };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not generate a key." };
  }
}