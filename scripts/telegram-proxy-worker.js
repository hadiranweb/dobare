// Telegram Bot API proxy for Cloudflare Workers (free plan).
// Use when your app server (e.g. Iran-based datacenters) cannot reach api.telegram.org.
// Deploy guide: docs/telegram-proxy.md
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Only /bot* paths are proxied (this is NOT an open proxy)
    if (!url.pathname.startsWith("/bot")) {
      return new Response("Not found", { status: 404 });
    }
    const upstream = new URL(url);
    upstream.protocol = "https:";
    upstream.host = "api.telegram.org";
    const init = {
      method: request.method,
      headers: { "Content-Type": request.headers.get("content-type") || "application/json" },
    };
    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = await request.text();
    }
    return fetch(upstream.toString(), init);
  },
};
