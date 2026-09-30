import { db } from "@/db";
import { inquiries, products } from "@/db/schema";
import { RESERVATION_HOURS, releaseExpiredReservations } from "@/lib/reservation";
import { clientIp, take } from "@/lib/rate-limit";
import { statusKeyboard, telegramCall } from "@/lib/telegram";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const tooMany = (sec: number) => Response.json(
  { error: "این‌قدر تند! یه کم صبر کن و بعد دوباره تلاش کن." },
  { status: 429, headers: { "Retry-After": String(sec) } }
);

function normalizePhone(input: string) {
  const latin = input.replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[\s()-]/g, "");
  if (/^\+989\d{9}$/.test(latin)) return "0" + latin.slice(3);
  if (/^989\d{9}$/.test(latin)) return "0" + latin.slice(2);
  return latin;
}

export async function POST(request: Request) {
  try {
    // ضد اسپم: حداکثر ۳ درخواست در ۱۰ دقیقه و ۱۰ درخواست در ۲۴ ساعت برای هر IP
    const ip = clientIp(request);
    const burst = take(`inquiry:${ip}:burst`, 3, 10 * 60 * 1000);
    if (!burst.allowed) return tooMany(burst.retryAfterSec);
    const daily = take(`inquiry:${ip}:daily`, 10, 24 * 60 * 60 * 1000);
    if (!daily.allowed) return tooMany(daily.retryAfterSec);

    // قبل از بررسی، رزروهای منقضی‌شده را آزاد کن
    await releaseExpiredReservations();

    const body = await request.json();
    const productId = Number(body.productId);
    const phone = normalizePhone(String(body.phone || ""));
    const name = String(body.name || "").trim().slice(0, 80);
    const message = String(body.message || "").trim().slice(0, 500);
    if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "لطفاً یک شماره موبایل معتبر وارد کن." }, { status: 400 });
    if (!Number.isInteger(productId) || productId < 1) return Response.json({ error: "وسیله پیدا نشد." }, { status: 400 });

    // رزرو اتمیک: فقط اگر همین لحظه موجود بود، رزرو می‌شود (دو درخواست همزمان با هم جلو نمی‌روند)
    const [product] = await db.update(products).set({ available: false, reservedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.available, true))).returning();
    if (!product) {
      const [current] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      if (!current) return Response.json({ error: "وسیله پیدا نشد." }, { status: 404 });
      return Response.json({ error: current.reservedAt ? "این وسیله فعلاً رزرو شده. یه چیز دیگه رو ببین یا بعداً دوباره سر بزن!" : "این وسیله دیگه موجود نیست." }, { status: 409 });
    }

    await db.insert(inquiries).values({ productId, productTitle: product.title, phone, name: name || null, message: message || null });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const lines = ["🔔 درخواست جدید در دوباره", "", `وسیله: ${product.title}`, `قیمت: ${product.price.toLocaleString("fa-IR")} تومان`, `رزرو: تا ${RESERVATION_HOURS} ساعت`];
      if (name) lines.push(`نام خریدار: ${name}`);
      lines.push(`شماره تماس: ${phone}`);
      if (message) lines.push(`پیام: ${message}`);
      // دکمه‌های تغییر وضعیت، مستقیم زیر پیام — بدون باز کردن پنل
      await telegramCall("sendMessage", { chat_id: chatId, text: lines.join("\n"), reply_markup: statusKeyboard(product.id) });
    }

    // اطلاعات تماس فروشنده فقط بعد از ثبت موفق در اختیار خریدار قرار می‌گیرد
    const contact: { phone?: string; telegram?: string } = {};
    const sellerPhone = normalizePhone(process.env.SELLER_PHONE || "");
    if (/^09\d{9}$/.test(sellerPhone)) contact.phone = sellerPhone;
    const sellerTelegram = String(process.env.SELLER_TELEGRAM || "").trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "").replace(/\/+$/, "");
    if (sellerTelegram) contact.telegram = sellerTelegram;
    return Response.json({ ok: true, contact, reservationHours: RESERVATION_HOURS });
  } catch (error) {
    console.error("Inquiry submission failed:", error);
    return Response.json({ error: "مشکلی پیش اومد. لطفاً دوباره تلاش کن." }, { status: 500 });
  }
}
