import { adminConfigured, makeAdminCookie, verifyPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!adminConfigured()) return Response.json({ error: "برای فعال شدن مدیریت، متغیر ADMIN_PASSWORD را روی سرور تنظیم کنید." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!verifyPassword(String(body.password || ""))) return Response.json({ error: "رمز درست نیست. دوباره تلاش کنید." }, { status: 401 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": makeAdminCookie() } });
}

export async function DELETE() {
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": "dobare_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" } });
}
