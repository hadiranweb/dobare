// محدودسازی نرخ درخواست‌ها در حافظه — مناسب استقرار تک‌کانتینری
// پشت Caddy قرار می‌گیریم، پس IP واقعی خریدار از هدر X-Forwarded-For خوانده می‌شود

const buckets = new Map<string, number[]>();
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000; // بزرگ‌ترین پنجره‌ی استفاده‌شده در کل پروژه

export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

// اگر تعداد درخواست‌های «key» در پنجره‌ی «windowMs» از «limit» گذشته باشد، اجازه نمی‌دهد
export function take(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    const retryAfterSec = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    if (buckets.size > 2000) sweep(now);
    return { allowed: false, retryAfterSec };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 2000) sweep(now);
  return { allowed: true, retryAfterSec: 0 };
}

// پاک‌سازی شمارنده (مثلاً بعد از ورود موفق، تلاش‌های ناموفق فراموش می‌شوند)
export function reset(key: string): void {
  buckets.delete(key);
}

// حذف کلیدهایی که دیگر پنجره‌شان گذشته تا حافظه بی‌دلیل رشد نکند
function sweep(now: number) {
  for (const [key, hits] of buckets) {
    if (hits.every(t => now - t >= MAX_WINDOW_MS)) buckets.delete(key);
  }
}
