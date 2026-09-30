import { existsSync } from "node:fs";
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
    out.sharp = `FAIL: ${error instanceof Error ? error.message.split("\n")[0].slice(0, 200) : "unknown"}`;
  }

  const checks: Record<string, string> = {
    "پروژه ریشه (next start)": ".next/server/app/api/admin/data/route.js",
    "standalone": ".next/standalone/server.js",
    "standalone/data-route": ".next/standalone/.next/server/app/api/admin/data/route.js",
    "node_modules/sharp": "node_modules/sharp/package.json",
    "node_modules/@img": "node_modules/@img/sharp-linux-x64/package.json",
    "src route": "src/app/api/admin/data/route.ts",
    "public": "public/hero.webp",
  };
  const files: Record<string, boolean> = {};
  for (const [label, rel] of Object.entries(checks)) {
    try { files[label] = existsSync(join(process.cwd(), rel)); } catch { files[label] = false; }
  }
  out.files = files;
  out.envKeysWithLiara = Object.keys(process.env).filter(k => k.toUpperCase().includes("LIARA"));
  return Response.json(out);
}
