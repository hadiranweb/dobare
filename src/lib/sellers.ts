export type SellerKey = "primary" | "secondary";

export type Seller = {
  key: SellerKey;
  name: string;
  phone?: string;
  telegram?: string;
};

export function normalizeIranPhone(input: string) {
  const latin = input
    .replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/[\s()-]/g, "");
  if (/^\+989\d{9}$/.test(latin)) return "0" + latin.slice(3);
  if (/^989\d{9}$/.test(latin)) return "0" + latin.slice(2);
  return latin;
}

function cleanName(value: string, fallback: string) {
  return String(value || "").trim().slice(0, 80) || fallback;
}

function cleanTelegram(value: string) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/\/+$/, "");
}

export function getSellers(): Seller[] {
  const primaryPhone = normalizeIranPhone(process.env.SELLER_PHONE || "");
  const primaryTelegram = cleanTelegram(process.env.SELLER_TELEGRAM || "");
  const sellers: Seller[] = [{
    key: "primary",
    name: cleanName(process.env.SELLER_NAME || "", "فروشنده دوباره"),
    ...(/^09\d{9}$/.test(primaryPhone) ? { phone: primaryPhone } : {}),
    ...(primaryTelegram ? { telegram: primaryTelegram } : {}),
  }];

  const secondaryName = cleanName(process.env.SELLER_2_NAME || "", "");
  const secondaryPhone = normalizeIranPhone(process.env.SELLER_2_PHONE || "");
  // فروشنده‌ی دوم فقط وقتی در پنل نمایش داده می‌شود که نام و شماره‌ی معتبر هر دو تنظیم شده باشند.
  if (secondaryName && /^09\d{9}$/.test(secondaryPhone)) {
    sellers.push({ key: "secondary", name: secondaryName, phone: secondaryPhone });
  }
  return sellers;
}

export function getSeller(key: unknown): Seller {
  const sellers = getSellers();
  return sellers.find(s => s.key === key) || sellers[0];
}

export function isConfiguredSeller(key: unknown): key is SellerKey {
  return getSellers().some(s => s.key === key);
}
