import { db } from "@/db";
import { inquiries, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function normalizePhone(input: string) {
  const latin = input.replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[\s()-]/g, "");
  if (/^\+989\d{9}$/.test(latin)) return "0" + latin.slice(3);
  if (/^989\d{9}$/.test(latin)) return "0" + latin.slice(2);
  return latin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productId = Number(body.productId);
    const phone = normalizePhone(String(body.phone || ""));
    const name = String(body.name || "").trim().slice(0, 80);
    const message = String(body.message || "").trim().slice(0, 500);
    if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "لطفاً یک شماره موبایل معتبر وارد کن." }, { status: 400 });
    if (!Number.isInteger(productId) || productId < 1) return Response.json({ error: "وسیله پیدا نشد." }, { status: 400 });
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product || !product.available) return Response.json({ error: "این وسیله دیگه موجود نیست." }, { status: 404 });
    await db.insert(inquiries).values({ productId, productTitle: product.title, phone, name: name || null, message: message || null });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const lines = ["🔔 درخواست جدید در دوباره", "", `وسیله: ${product.title}`, `قیمت: ${product.price.toLocaleString("fa-IR")} تومان`];
      if (name) lines.push(`نام خریدار: ${name}`);
      lines.push(`شماره تماس: ${phone}`);
      if (message) lines.push(`پیام: ${message}`);
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }), signal: AbortSignal.timeout(5000) });
      } catch (error) { console.error("Telegram notification failed:", error); }
    }

    // اطلاعات تماس فروشنده فقط بعد از ثبت موفق در اختیار خریدار قرار می‌گیرد
    const contact: { phone?: string; telegram?: string } = {};
    const sellerPhone = normalizePhone(process.env.SELLER_PHONE || "");
    if (/^09\d{9}$/.test(sellerPhone)) contact.phone = sellerPhone;
    const sellerTelegram = String(process.env.SELLER_TELEGRAM || "").trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "").replace(/\/+$/, "");
    if (sellerTelegram) contact.telegram = sellerTelegram;
    return Response.json({ ok: true, contact });
  } catch (error) {
    console.error("Inquiry submission failed:", error);
    return Response.json({ error: "مشکلی پیش اومد. لطفاً دوباره تلاش کن." }, { status: 500 });
  }
}
