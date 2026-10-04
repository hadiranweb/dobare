import { db } from "@/db";
import { inquiries, productGroupItems, productGroups, products } from "@/db/schema";
import { RESERVATION_HOURS, releaseExpiredReservations } from "@/lib/reservation";
import { clientIp, take } from "@/lib/rate-limit";
import { statusKeyboard, telegramCall } from "@/lib/telegram";
import { getSeller, normalizeIranPhone } from "@/lib/sellers";
import { and, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

const tooMany = (sec: number) => Response.json(
  { error: "این‌قدر تند! یه کم صبر کن و بعد دوباره تلاش کن." },
  { status: 429, headers: { "Retry-After": String(sec) } }
);

class InquiryError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const burst = take(`inquiry:${ip}:burst`, 3, 10 * 60 * 1000);
    if (!burst.allowed) return tooMany(burst.retryAfterSec);
    const daily = take(`inquiry:${ip}:daily`, 10, 24 * 60 * 60 * 1000);
    if (!daily.allowed) return tooMany(daily.retryAfterSec);

    await releaseExpiredReservations();
    const body = await request.json();
    const productId = body.kind === "group" ? null : Number(body.productId);
    const groupId = body.kind === "group" ? Number(body.groupId) : null;
    const phone = normalizeIranPhone(String(body.phone || ""));
    const name = String(body.name || "").trim().slice(0, 80);
    const message = String(body.message || "").trim().slice(0, 500);
    if (!/^09\d{9}$/.test(phone)) throw new InquiryError("لطفاً یک شماره موبایل معتبر وارد کن.", 400);

    let listing: { id: number; title: string; price: number; sellerKey: string; kind: "product" | "group" };
    if (groupId !== null) {
      if (!Number.isInteger(groupId) || groupId < 1) throw new InquiryError("گروه پیدا نشد.", 400);
      listing = await db.transaction(async tx => {
        const [group] = await tx.select().from(productGroups).where(eq(productGroups.id, groupId)).limit(1).for("update");
        if (!group) throw new InquiryError("گروه پیدا نشد.", 404);
        if (!group.available) throw new InquiryError(group.reservedAt ? "این گروه فعلاً رزرو شده است." : "این گروه دیگر موجود نیست.", 409);
        const links = await tx.select().from(productGroupItems).where(eq(productGroupItems.groupId, groupId));
        const memberIds = links.map(link => link.productId);
        if (memberIds.length < 2) throw new InquiryError("اعضای گروه کامل نیستند.", 409);
        const members = await tx.select().from(products).where(inArray(products.id, memberIds)).for("update");
        if (members.length !== memberIds.length || members.some(item => !item.available)) {
          throw new InquiryError("یکی از وسایل این گروه دیگر موجود نیست.", 409);
        }
        const reservedAt = new Date();
        await tx.update(products).set({ available: false, reservedAt }).where(inArray(products.id, memberIds));
        const [updated] = await tx.update(productGroups).set({ available: false, reservedAt }).where(eq(productGroups.id, groupId)).returning();
        return { id: updated.id, title: updated.title, price: updated.price, sellerKey: updated.sellerKey, kind: "group" as const };
      });
    } else {
      if (!Number.isInteger(productId) || Number(productId) < 1) throw new InquiryError("وسیله پیدا نشد.", 400);
      const [membership] = await db.select().from(productGroupItems).where(eq(productGroupItems.productId, Number(productId))).limit(1);
      if (membership) throw new InquiryError("این وسیله فقط همراه گروه خودش فروخته می‌شود.", 409);
      const [product] = await db.update(products).set({ available: false, reservedAt: new Date() })
        .where(and(eq(products.id, Number(productId)), eq(products.available, true))).returning();
      if (!product) {
        const [current] = await db.select().from(products).where(eq(products.id, Number(productId))).limit(1);
        if (!current) throw new InquiryError("وسیله پیدا نشد.", 404);
        throw new InquiryError(current.reservedAt ? "این وسیله فعلاً رزرو شده. یه چیز دیگه رو ببین یا بعداً دوباره سر بزن!" : "این وسیله دیگه موجود نیست.", 409);
      }
      listing = { id: product.id, title: product.title, price: product.price, sellerKey: product.sellerKey, kind: "product" };
    }

    const seller = getSeller(listing.sellerKey);
    await db.insert(inquiries).values({
      productId: listing.kind === "product" ? listing.id : null,
      groupId: listing.kind === "group" ? listing.id : null,
      productTitle: listing.title,
      sellerKey: seller.key,
      phone,
      name: name || null,
      message: message || null,
    });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (token && chatId) {
      const lines = ["🔔 درخواست جدید در دوباره", "", `${listing.kind === "group" ? "گروه" : "وسیله"}: ${listing.title}`, `فروشنده: ${seller.name}`, `قیمت: ${listing.price.toLocaleString("fa-IR")} تومان`, `رزرو: تا ${RESERVATION_HOURS} ساعت`];
      if (name) lines.push(`نام خریدار: ${name}`);
      lines.push(`شماره تماس: ${phone}`);
      if (message) lines.push(`پیام: ${message}`);
      await telegramCall("sendMessage", { chat_id: chatId, text: lines.join("\n"), reply_markup: statusKeyboard(listing.id, listing.kind) });
    }

    const contact: { name: string; phone?: string; telegram?: string } = { name: seller.name };
    if (seller.phone) contact.phone = seller.phone;
    if (seller.telegram) contact.telegram = seller.telegram;
    return Response.json({ ok: true, contact, reservationHours: RESERVATION_HOURS });
  } catch (error) {
    if (error instanceof InquiryError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Inquiry submission failed:", error);
    return Response.json({ error: "مشکلی پیش اومد. لطفاً دوباره تلاش کن." }, { status: 500 });
  }
}
