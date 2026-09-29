import { readFile } from "node:fs/promises";
import { localPathFromUrl, UPLOAD_URL_PREFIX } from "@/lib/storage";

// سرو کردن عکس‌های آپلودشده از پوشه‌ی ذخیره‌سازی (volume) با کش یک‌ساله
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const filePath = localPathFromUrl(UPLOAD_URL_PREFIX + segments.map(decodeURIComponent).join("/"));
  if (!filePath) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
