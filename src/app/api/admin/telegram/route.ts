import { isAdmin } from "@/lib/admin-auth";
import { TELEGRAM_NETWORK_ERROR, telegramCall, telegramToken } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// مدیریت وب‌هوک بات تلگرام از پنل — set / delete / info
export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!telegramToken() || !secret) {
    return Response.json({ error: "ابتدا TELEGRAM_BOT_TOKEN و TELEGRAM_WEBHOOK_SECRET را در متغیرهای برنامه تنظیم کنید." }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "info");

  if (action === "set") {
    // ۱) توکن معتبر است؟ (getMe)
    const me = await telegramCall("getMe", {});
    if (me?.description === TELEGRAM_NETWORK_ERROR) {
      return Response.json(
        {
          error:
            "سرور لیارا به api.telegram.org دسترسی ندارد (دیتاسنتر ایران پشت فیلتر است). راه‌حل: طبق docs/telegram-proxy.md یک پروکسی رایگان Cloudflare بسازید و آدرسش را در متغیر TELEGRAM_API_BASE در لیارا بگذارید.",
        },
        { status: 502 },
      );
    }
    if (!me?.ok) {
      return Response.json({ error: `توکن بات معتبر نیست: ${me?.description || "پاسخی از تلگرام نیامد"}` }, { status: 400 });
    }
    const bot = ((me.result as { username?: string })?.username) || "";

    // ۲) ثبت وب‌هوک
    const origin = String(body.url || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
    const url = `${origin}/api/telegram/webhook`;
    const res = await telegramCall("setWebhook", { url, secret_token: secret, allowed_updates: ["message", "callback_query"] });
    if (!res?.ok) {
      return Response.json({ error: `اتصال نشد: ${res?.description || "خطای نامشخص"}` }, { status: 502 });
    }

    // ۳) پیام تست به چت اعلان‌ها
    const chatId = String(process.env.TELEGRAM_CHAT_ID || "").trim();
    let extra: string;
    if (chatId) {
      const test = await telegramCall("sendMessage", {
        chat_id: chatId,
        text: "✅ بات «دوباره» وصل شد. از این به بعد اعلان درخواست‌های خرید همین‌جا می‌آید.",
      });
      extra = test?.ok
        ? " — پیام تست به چت شما ارسال شد 📩"
        : ` — ولی پیام تست ارسال نشد (${test?.description === TELEGRAM_NETWORK_ERROR ? "قطعی شبکه" : "TELEGRAM_CHAT_ID را بررسی کنید"}).`;
    } else {
      extra = " — توجه: TELEGRAM_CHAT_ID تنظیم نشده؛ بدون آن اعلان درخواست‌ها ارسال نمی‌شود.";
    }
    return Response.json({ ok: true, message: `بات وصل شد ✅${bot ? ` (@${bot})` : ""}${extra}` });
  }

  if (action === "delete") {
    const res = await telegramCall("deleteWebhook", { drop_pending_updates: false });
    if (res?.ok) return Response.json({ ok: true, message: "وب‌هوک قطع شد. اعلان‌ها همان‌طور ارسال می‌شوند." });
    return Response.json({ error: `قطع نشد: ${res?.description || "خطای نامشخص"}` }, { status: 502 });
  }

  const res = await telegramCall("getWebhookInfo", {});
  if (res?.description === TELEGRAM_NETWORK_ERROR) {
    return Response.json(
      { error: "سرور لیارا به api.telegram.org دسترسی ندارد — راه‌حل: پروکسی طبق docs/telegram-proxy.md و تنظیم TELEGRAM_API_BASE." },
      { status: 502 },
    );
  }
  const info = (res?.result || {}) as { url?: string; pending_update_count?: number; last_error_message?: string };
  if (info.url) {
    return Response.json({ ok: true, message: `وصل است: ${info.url}${info.pending_update_count ? ` (${info.pending_update_count.toLocaleString("fa-IR")} در انتظار)` : ""}${info.last_error_message ? ` — آخرین خطا: ${info.last_error_message}` : ""}` });
  }
  return Response.json({ ok: true, message: "وب‌هوک وصل نیست — دکمه‌ی «اتصال بات» را بزنید." });
}
