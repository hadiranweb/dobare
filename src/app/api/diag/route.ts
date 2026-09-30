import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

// ⚠️ endpoint تشخیصی موقت — بعد از رفع مشکل حذف می‌شود
// فقط اطلاعات غیرحساس برمی‌گرداند: نسخه‌ها، وجود فایل‌ها، وضعیت لود sharp
export async function GET() {
  const out: Record<string, unknown> = {};
  out.node = process.version;
  out.platform = `${process.platform}/${process.arch}`;
  out.cwd = process.cwd();

  try {
    const sharp = (await import("sharp")).default;
    out.sharp = `ok (vips ${sharp.versions.vips})`;
  } catch (error) {
    out.sharp = `FAIL: ${error instanceof Error ? error.message.slice(0, 600) : "unknown"}`;
  }

  const checks: Record<string, string> = {
    "next-server-route": ".next/server/app/api/admin/data/route.js",
    "node_modules/sharp": "node_modules/sharp/package.json",
    "node_modules/@img": "node_modules/@img/sharp-linux-x64/package.json",
    "sharp-wasm32": "node_modules/@img/sharp-wasm32/package.json",
    "native-.node": "node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.5.node",
    "libvips-.so": "node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.18.7",
    "public": "public/hero.webp",
  };
  const files: Record<string, boolean> = {};
  for (const [label, rel] of Object.entries(checks)) {
    try { files[label] = existsSync(join(process.cwd(), rel)); } catch { files[label] = false; }
  }
  out.files = files;
  try { out.imgPackages = readdirSync("node_modules/@img"); } catch { out.imgPackages = "missing"; }
  out.envKeysWithLiara = Object.keys(process.env).filter(k => k.toUpperCase().includes("LIARA"));
  return Response.json(out);
}
