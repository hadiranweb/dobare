import { db } from "@/db";
import { appSettings, productGroups, products } from "@/db/schema";
import { eq, isNotNull, isNull, sql } from "drizzle-orm";
import { psychologicalPrice } from "@/lib/psychological-price";

// ── موتور قیمت ─────────────────────────────────────────────
// میانگین قیمت دلار در هفته در تنظیمات داشبورد ثبت می‌شود (کلید usd_rate در app_settings).
// هر کالا یک «نسبت دلاری» دارد؛ قیمت تومانی کالا = نسبت × نرخ دلار.
// تغییر نرخ و بازمحاسبه‌ی همه‌ی قیمت‌ها در یک تراکنش انجام می‌شود.

export const USD_RATE_KEY = "usd_rate";

export async function getUsdRate(): Promise<number | null> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, USD_RATE_KEY)).limit(1);
  if (!row) return null;
  const n = Number(row.value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * نرخ را ذخیره و تمام قیمت‌ها را اتمیک بازمحاسبه می‌کند.
 * محصول قدیمیِ بدون نسبت، ابتدا از روی قیمت فعلی نسبت می‌گیرد:
 * - اولین ثبت نرخ: price / newRate تا قیمت فعلی ثابت بماند.
 * - تغییرهای بعدی: price / previousRate تا همراه بقیه با نرخ تازه تغییر کند.
 */
export async function updateUsdRateAndPrices(rate: number): Promise<number> {
  return db.transaction(async tx => {
    const [previousSetting] = await tx
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, USD_RATE_KEY))
      .limit(1);
    const parsedPrevious = Number(previousSetting?.value);
    const previousRate = Number.isFinite(parsedPrevious) && parsedPrevious > 0 ? parsedPrevious : null;
    const ratioBaseRate = previousRate ?? rate;

    // مهاجرت امن کالاهای قبلی: قبل از بازمحاسبه، نسبت گمشده را از قیمت فعلی بساز.
    await tx
      .update(products)
      .set({ usdRatio: sql`${products.price}::double precision / ${ratioBaseRate}` })
      .where(isNull(products.usdRatio));

    await tx
      .insert(appSettings)
      .values({ key: USD_RATE_KEY, value: String(rate) })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: String(rate) } });

    const productPrices = await tx
      .select({ id: products.id, usdRatio: products.usdRatio })
      .from(products)
      .where(isNotNull(products.usdRatio));
    const groupPrices = await tx
      .select({ id: productGroups.id, usdRatio: productGroups.usdRatio })
      .from(productGroups);

    // قیمت روان‌شناختی در آخرین مرحله و روی قیمت فروش نهایی اعمال می‌شود.
    // نسبت دلاری دست‌نخورده می‌ماند تا تغییر بعدی نرخ از همان لنگر ارزی محاسبه شود.
    for (const item of productPrices) {
      const price = psychologicalPrice(Number(item.usdRatio) * rate);
      if (!Number.isSafeInteger(price) || price <= 0 || price > 2_147_483_647) throw new Error("قیمت محاسبه‌شده‌ی کالا معتبر نیست.");
      await tx.update(products).set({ price }).where(eq(products.id, item.id));
    }
    for (const group of groupPrices) {
      const price = psychologicalPrice(Number(group.usdRatio) * rate);
      if (!Number.isSafeInteger(price) || price <= 0 || price > 2_147_483_647) throw new Error("قیمت محاسبه‌شده‌ی گروه معتبر نیست.");
      await tx.update(productGroups).set({ price }).where(eq(productGroups.id, group.id));
    }

    return productPrices.length + groupPrices.length;
  });
}
