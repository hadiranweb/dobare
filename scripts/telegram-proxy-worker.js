// پروکسی Bot API تلگرام روی Cloudflare Workers (رایگان)
// برای وقتی سرور برنامه (مثل دیتاسنترهای ایران) به api.telegram.org دسترسی ندارد.
// راهنمای کامل دیپلوی: docs/telegram-proxy.md
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // فقط مسیرهای بات تلگرام پاس داده می‌شوند (open proxy نیست)
    if (!url.pathname.startsWith("/bot")) {
      return new Response("Not found", { status: 404 });
    }
    const upstream = new URL(url);
    upstream.protocol = "https:";
    upstream.host = "api.telegram.org";
    const init: RequestInit = {
      method: request.method,
      headers: { "Content-Type": request.headers.get("content-type") || "application/json" },
    };
    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = await request.text();
    }
    return fetch(upstream.toString(), init);
  },
};
