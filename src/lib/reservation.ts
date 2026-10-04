import { db } from "@/db";
import { productGroups, products } from "@/db/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";

// مدت رزرو وسیله پس از ثبت درخواست (بر حسب ساعت) — با متغیر محیطی RESERVATION_HOURS قابل تغییر است
const rawHours = Number(process.env.RESERVATION_HOURS);
export const RESERVATION_HOURS = Number.isFinite(rawHours) && rawHours > 0 ? rawHours : 6;
export const RESERVATION_MS = RESERVATION_HOURS * 60 * 60 * 1000;

// آزادسازی رزروهای منقضی‌شده: هر وسیله‌ای که رزرو شده، فروخته نشده و مدتش گذشته، دوباره قابل خرید می‌شود
export async function releaseExpiredReservations() {
  const cutoff = new Date(Date.now() - RESERVATION_MS);
  const released = await db
    .update(products)
    .set({ available: true, reservedAt: null })
    .where(and(eq(products.available, false), isNotNull(products.reservedAt), lte(products.reservedAt, cutoff)))
    .returning({ id: products.id });
  const releasedGroups = await db
    .update(productGroups)
    .set({ available: true, reservedAt: null })
    .where(and(eq(productGroups.available, false), isNotNull(productGroups.reservedAt), lte(productGroups.reservedAt, cutoff)))
    .returning({ id: productGroups.id });
  const total = released.length + releasedGroups.length;
  if (total) console.log(`⏱ ${total} رزرو منقضی آزاد شد.`);
  return total;
}
