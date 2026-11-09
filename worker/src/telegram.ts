import type { Db } from "./db";
import type { Env } from "./env";

/** Sends plain text to the owner. Returns the Telegram message id, or null when delivery did not happen. */
export async function notifyAdmin(env: Env, body: string): Promise<number | null> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
        text: body.slice(0, 4000),
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; result?: { message_id?: number } };
    if (!data.ok || !data.result?.message_id) {
      console.error("telegram_rejected", res.status);
      return null;
    }
    return data.result.message_id;
  } catch (error) {
    console.error("telegram_unreachable", String(error));
    return null;
  }
}

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id?: number };
    reply_to_message?: { message_id?: number };
  };
}

/** Handles an authenticated webhook update: a swipe-reply from the owner goes back to the visitor. */
export async function handleUpdate(env: Env, db: Db, update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text || message.chat?.id === undefined) return;
  const chatId = String(message.chat.id);

  if (!env.TELEGRAM_ADMIN_CHAT_ID) {
    if (message.text.startsWith("/start")) await reply(env, chatId, `Chat id: ${chatId}\nSave it as TELEGRAM_ADMIN_CHAT_ID.`);
    return;
  }
  if (chatId !== env.TELEGRAM_ADMIN_CHAT_ID) return;

  const repliedTo = message.reply_to_message?.message_id;
  if (!repliedTo) {
    if (message.text.startsWith("/status")) {
      const open = await db.count("messages", { direction: "eq.in", status: "eq.new" });
      await reply(env, chatId, `Unread messages: ${open}`);
    }
    return;
  }

  const original = await db.one("messages", { tg_message_id: `eq.${repliedTo}` });
  if (!original) {
    await reply(env, chatId, "That message has no conversation attached, so nothing was sent.");
    return;
  }
  await db.insert("messages", {
    sid: original.sid,
    direction: "out",
    body: message.text.slice(0, 4000),
    status: "read",
  });
  await db.update("messages", { id: `eq.${original.id}` }, { status: "read" });
  await reply(env, chatId, "Sent to the visitor.");
}

async function reply(env: Env, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
