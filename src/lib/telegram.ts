// Helper های Bot API تلگرام — ارسال پیام و دکمه‌های مدیریتی
const apiBase = () => process.env.TELEGRAM_API_BASE || "https://api.telegram.org";

export function telegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

export type TelegramResponse = { ok?: boolean; result?: unknown; description?: string } | null;

export async function telegramCall(method: string, payload: Record<string, unknown>): Promise<TelegramResponse> {
  const token = telegramToken();
  if (!token) return null;
  try {
    const res = await fetch(`${apiBase()}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    return (await res.json().catch(() => null)) as TelegramResponse;
  } catch (error) {
    console.error(`Telegram ${method} failed:`, error);
    return null;
  }
}

// شناسه‌های چت مجاز برای دستورهای مدیریتی (پیش‌فرض: همان چت اعلان‌ها)
export function adminChatIds(): string[] {
  const ids = new Set<string>();
  for (const id of String(process.env.TELEGRAM_ADMIN_IDS || "").split(",").map(s => s.trim()).filter(Boolean)) ids.add(id);
  const chatId = String(process.env.TELEGRAM_CHAT_ID || "").trim();
  if (chatId) ids.add(chatId);
  return [...ids];
}

// دکمه‌های تغییر وضعیت کالا — زیر پیام اعلان درخواست و پیام‌های تأیید
export function statusKeyboard(productId: number) {
  return {
    inline_keyboard: [[
      { text: "فروخته شد ✅", callback_data: `sell:${productId}` },
      { text: "آزاد کن 🔓", callback_data: `open:${productId}` },
    ]],
  };
}
