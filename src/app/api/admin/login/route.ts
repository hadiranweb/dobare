import { adminConfigured, makeAdminCookie, verifyPassword } from "@/lib/admin-auth";
import { clientIp, reset, take } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!adminConfigured()) return Response.json({ error: "برای فعال شدن مدیریت، متغیر ADMIN_PASSWORD را روی سرور تنظیم کنید." }, { status: 503 });
  // محافظت در برابر حدس رمز: حداکثر ۵ تلاش ناموفق در ۱۵ دقیقه برای هر IP
  const ip = clientIp(request);
  const key = `login:${ip}`;
  const attempt = take(key, 5, 15 * 60 * 1000);
  if (!attempt.allowed) return Response.json(
    { error: "چند بار رمز رو اشتباه زدی. برای امنیت، حدود ۱۵ دقیقه صبر کن و بعد دوباره تلاش کن." },
    { status: 429, headers: { "Retry-After": String(attempt.retryAfterSec) } }
  );
  const body = await request.json().catch(() => ({}));
  if (!verifyPassword(String(body.password || ""))) return Response.json({ error: "رمز درست نیست. دوباره تلاش کنید." }, { status: 401 });
  reset(key); // ورود موفق — شمارنده‌ی تلاش‌های این IP فراموش می‌شود
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": makeAdminCookie() } });
}

export async function DELETE() {
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": "dobare_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" } });
}
