import { isAdmin } from "@/lib/admin-auth";
import { telegramCall, telegramToken } from "@/lib/telegram";

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
    const origin = String(body.url || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
    const url = `${origin}/api/telegram/webhook`;
    const res = await telegramCall("setWebhook", { url, secret_token: secret, allowed_updates: ["message", "callback_query"] });
    if (res?.ok) return Response.json({ ok: true, message: `بات وصل شد ✅ وب‌هوک: ${url}` });
    return Response.json({ error: `اتصال نشد: ${res?.description || "توکن بات را بررسی کنید."}` }, { status: 502 });
  }
  if (action === "delete") {
    const res = await telegramCall("deleteWebhook", { drop_pending_updates: false });
    if (res?.ok) return Response.json({ ok: true, message: "وب‌هوک قطع شد. اعلان‌ها همان‌طور ارسال می‌شوند." });
    return Response.json({ error: `قطع نشد: ${res?.description || "خطای نامشخص"}` }, { status: 502 });
  }
  const res = await telegramCall("getWebhookInfo", {});
  const info = (res?.result || {}) as { url?: string; pending_update_count?: number; last_error_message?: string };
  if (info.url) {
    return Response.json({ ok: true, message: `وصل است: ${info.url}${info.pending_update_count ? ` (${info.pending_update_count.toLocaleString("fa-IR")} در انتظار)` : ""}${info.last_error_message ? ` — آخرین خطا: ${info.last_error_message}` : ""}` });
  }
  return Response.json({ ok: true, message: "وب‌هوک وصل نیست — دکمه‌ی «اتصال بات» را بزنید." });
}
