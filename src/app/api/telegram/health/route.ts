export const dynamic = "force-dynamic";

// بررسی دسترسی سرور به API تلگرام — عمومی و بدون هیچ секретی (فقط true/false برمی‌گرداند)
// برای تشخیص اینکه آیا نیاز به پروکسی (TELEGRAM_API_BASE) هست یا نه
export async function GET() {
  const targets: Record<string, string> = { "api.telegram.org": "https://api.telegram.org" };
  const proxyBase = (process.env.TELEGRAM_API_BASE || "").trim();
  if (proxyBase) targets["proxy (TELEGRAM_API_BASE)"] = proxyBase.replace(/\/+$/, "");

  const results: Record<string, boolean> = {};
  await Promise.all(
    Object.entries(targets).map(async ([label, base]) => {
      try {
        // هر پاسخی از تلگرام — حتی 401 برای توکن جعلی — یعنی شبکه باز است
        const res = await fetch(`${base}/bot000:reachability-probe/getMe`, { signal: AbortSignal.timeout(6000) });
        results[label] = res.status > 0;
      } catch {
        results[label] = false;
      }
    }),
  );
  return Response.json(results);
}
