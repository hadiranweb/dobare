import { db } from "@/db";
import { inquiries, products } from "@/db/schema";
import { adminChatIds, statusKeyboard, telegramCall, telegramToken } from "@/lib/telegram";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// وب‌هوک تلگرام — دستورهای مدیریتی و دکمه‌های تغییر وضعیت، فقط برای چت‌های مجاز
type TgMessage = { message_id: number; chat: { id: number }; text?: string };
type TgCallback = { id: string; data?: string; message?: TgMessage };
type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallback };

const helpText = [
  "👋 دستیار مدیریت «دوباره»",
  "",
  "کالاها:",
  "/products یا «کالاها» — فهرست وسایل با شماره‌ی هر کالا",
  "/stats یا «آمار» — شمارش وسایل و درخواست‌ها",
  "/inquiries یا «درخواست‌ها» — آخرین درخواست‌های خرید",
  "",
  "تغییر وضعیت:",
  "/sold <شماره> — علامت‌گذاری فروخته شد",
  "/open <شماره> — آزاد کردن رزرو یا بازگردانی",
  "",
  "دکمه‌های زیر پیام هر درخواست جدید هم همین کار را می‌کنند. 🌿",
].join("\n");

const toEnglishDigits = (s: string) => s.replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));

function parseId(text: string): number | null {
  const match = toEnglishDigits(text).match(/\d+/);
  if (!match) return null;
  const id = Number(match[0]);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

const productStatus = (available: boolean, reservedAt: Date | null) => (available ? "🟢 موجود" : reservedAt ? "🟠 رزرو" : "⚪ واگذار شده");

export async function POST(request: Request) {
  // بات تنظیم نیست یا امضای مخفی تلگرام درست نیست — بی‌صدا رد می‌شود (بدون retry تلگرام)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !telegramToken()) return new Response("ok");
  if (request.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("ok");
  const update = (await request.json().catch(() => null)) as TgUpdate | null;
  if (!update) return Response.json({ ok: true });
  try {
    await handle(update);
  } catch (error) {
    console.error("Telegram webhook handler failed:", error);
  }
  return Response.json({ ok: true });
}

async function handle(update: TgUpdate) {
  if (update.message?.text) {
    const chatId = String(update.message.chat.id);
    const text = update.message.text.trim();
    // دستور شناسه — برای همه در دسترس است تا صاحب فروشگاه chat id درست خود را پیدا کند
    if (!adminChatIds().includes(chatId) && (text === "/id" || text === "شناسه" || text.startsWith("/start"))) {
      await telegramCall("sendMessage", {
        chat_id: chatId,
        text: `🔍 شناسه‌ی چت شما: ${chatId}\n\nاگر صاحب فروشگاه «دوباره» هستید، همین عدد را در متغیر TELEGRAM_CHAT_ID در لیارا بگذارید و در پنل دوباره «اتصال بات» را بزنید. 🌿`,
      });
      return;
    }
    if (!adminChatIds().includes(chatId)) return;
    await handleCommand(chatId, text);
  }
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = String(cb.message?.chat.id ?? "");
    if (!adminChatIds().includes(chatId)) {
      await telegramCall("answerCallbackQuery", { callback_query_id: cb.id });
      return;
    }
    const [action, idStr] = (cb.data || "").split(":");
    const id = Number(idStr);
    if ((action === "sell" || action === "open") && Number.isInteger(id) && id >= 1) {
      const [updated] = await db.update(products)
        .set(action === "sell" ? { available: false, reservedAt: null } : { available: true, reservedAt: null })
        .where(eq(products.id, id)).returning();
      const label = !updated ? "کالا پیدا نشد." : action === "sell" ? `«${updated.title}» فروخته شد ✅` : `«${updated.title}» آزاد شد و دوباره قابل خرید است 🔓`;
      await telegramCall("answerCallbackQuery", { callback_query_id: cb.id, text: label });
      if (updated && cb.message) {
        await telegramCall("editMessageReplyMarkup", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
      }
    } else {
      await telegramCall("answerCallbackQuery", { callback_query_id: cb.id, text: "دستور نامفهوم بود." });
    }
  }
}

async function handleCommand(chatId: string, text: string) {
  const lower = text.toLowerCase();
  const firstWord = lower.split(/\s+/)[0].split("@")[0];
  const rest = text.slice(text.split(/\s+/)[0].length);

  if (firstWord === "/start" || firstWord === "/help" || text === "راهنما" || text === "؟" || text === "?") {
    return void (await telegramCall("sendMessage", { chat_id: chatId, text: helpText }));
  }
  if (firstWord === "/products" || text === "کالاها" || text === "وسایل") {
    const items = await db.select().from(products).orderBy(desc(products.id)).limit(20);
    if (items.length === 0) return void (await telegramCall("sendMessage", { chat_id: chatId, text: "هنوز وسیله‌ای ثبت نشده. از پنل مدیریت اضافه کن." }));
    const lines = ["🛍 کالاها (جدیدترین):", ...items.map(p => `${p.id}⃣ ${p.title} — ${p.price.toLocaleString("fa-IR")} ت — ${productStatus(p.available, p.reservedAt)}`)];
    if ((await db.select().from(products)).length > 20) lines.push("… برای بقیه از پنل مدیریت ببین.");
    return void (await telegramCall("sendMessage", { chat_id: chatId, text: lines.join("\n") }));
  }
  if (firstWord === "/stats" || text === "آمار") {
    const [items, leads] = await Promise.all([db.select().from(products), db.select().from(inquiries)]);
    const available = items.filter(p => p.available).length;
    const reserved = items.filter(p => !p.available && p.reservedAt).length;
    const sold = items.length - available - reserved;
    const text = [`📊 آمار دوباره`, `کل وسایل: ${items.length.toLocaleString("fa-IR")}`, `🟢 موجود: ${available.toLocaleString("fa-IR")}`, `🟠 رزرو: ${reserved.toLocaleString("fa-IR")}`, `⚪ واگذار شده: ${sold.toLocaleString("fa-IR")}`, `☎️ درخواست‌ها: ${leads.length.toLocaleString("fa-IR")}`].join("\n");
    return void (await telegramCall("sendMessage", { chat_id: chatId, text }));
  }
  if (firstWord === "/inquiries" || text === "درخواست‌ها") {
    const leads = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(10);
    if (leads.length === 0) return void (await telegramCall("sendMessage", { chat_id: chatId, text: "هنوز درخواستی ثبت نشده." }));
    const lines = ["☎️ آخرین درخواست‌ها:", ...leads.map(i => `«${i.productTitle}» — ${i.phone}${i.name ? ` — ${i.name}` : ""} — ${new Date(i.createdAt).toLocaleDateString("fa-IR")}`)];
    return void (await telegramCall("sendMessage", { chat_id: chatId, text: lines.join("\n") }));
  }
  if (firstWord === "/sold" || firstWord === "/open" || text.startsWith("فروخته") || text.startsWith("آزاد")) {
    const action = firstWord === "/sold" || text.startsWith("فروخته") ? "sell" : "open";
    const id = parseId(rest || text);
    if (id === null) return void (await telegramCall("sendMessage", { chat_id: chatId, text: "شماره‌ی کالا را بنویس؛ مثلاً: /sold 3" }));
    const [updated] = await db.update(products)
      .set(action === "sell" ? { available: false, reservedAt: null } : { available: true, reservedAt: null })
      .where(eq(products.id, id)).returning();
    if (!updated) return void (await telegramCall("sendMessage", { chat_id: chatId, text: `کالایی با شماره‌ی ${id.toLocaleString("fa-IR")} پیدا نشد. با «کالاها» فهرست را ببین.` }));
    const label = action === "sell" ? `«${updated.title}» فروخته شد ✅` : `«${updated.title}» آزاد شد و دوباره قابل خرید است 🔓`;
    return void (await telegramCall("sendMessage", { chat_id: chatId, text: label, reply_markup: statusKeyboard(updated.id) }));
  }
  await telegramCall("sendMessage", { chat_id: chatId, text: "نفهمیدم! «راهنما» را بفرست تا دستورها را ببینی. 🌿" });
}
