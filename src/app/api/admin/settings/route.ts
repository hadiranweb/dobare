import { isAdmin } from "@/lib/admin-auth";
import { getUsdRate, updateUsdRateAndPrices } from "@/lib/price-engine";

export const dynamic = "force-dynamic";

// تنظیمات داشبورد — میانگین قیمت دلار هفته
// ذخیره‌ی نرخ و بازمحاسبه‌ی همه‌ی قیمت‌ها در یک تراکنش انجام می‌شود.
export async function GET(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  return Response.json({ usdRate: await getUsdRate() });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  try {
    const body = await request.json();
    const rate = Number(body.usdRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return Response.json({ error: "میانگین دلار باید عددی بزرگ‌تر از صفر باشد." }, { status: 400 });
    }
    const rounded = Math.round(rate);
    if (rounded <= 0) return Response.json({ error: "میانگین دلار معتبر نیست." }, { status: 400 });
    const updatedCount = await updateUsdRateAndPrices(rounded);
    return Response.json({ ok: true, usdRate: rounded, updatedCount });
  } catch (error) {
    console.error("Settings update failed:", error);
    return Response.json({ error: "ذخیره‌ی تنظیمات ممکن نشد." }, { status: 500 });
  }
}
