import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// پیشوند آدرس عمومی عکس‌ها و پوشه‌ی ذخیره‌ی آن‌ها (در داکر با UPLOAD_DIR روی volume اشاره می‌کند)
export const UPLOAD_URL_PREFIX = "/uploads/";
export const storageDir = () => process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");

const NAME_PATTERN = /^[a-f0-9-]{36}(_thumb)?\.webp$/;

// تبدیل آدرس عمومی به مسیر فایل — فقط نام‌های تولیدشده توسط خود سیستم قبول است (ضد path traversal)
export function localPathFromUrl(url: string): string | null {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return null;
  const name = url.slice(UPLOAD_URL_PREFIX.length);
  if (!NAME_PATTERN.test(name)) return null;
  return path.join(storageDir(), name);
}

export function isLocalImageUrl(url: string): boolean {
  return Boolean(localPathFromUrl(url));
}

// ذخیره‌ی عکس: چرخش خودکار بر اساس EXIF، فشرده‌سازی به WebP و ساخت نسخه‌ی کوچک
export async function saveUpload(file: File): Promise<{ image: string; thumb: string; bytes: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) throw new Error("فایل خالی است.");
  const dir = storageDir();
  await mkdir(dir, { recursive: true });
  const id = randomUUID();
  const pipeline = sharp(buffer, { failOn: "none" }).rotate(); // rotate: اصلاح جهت عکس‌های موبایل
  const [mainBuf, thumbBuf] = await Promise.all([
    pipeline.clone().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    pipeline.clone().resize({ width: 560, height: 560, fit: "inside", withoutEnlargement: true }).webp({ quality: 70 }).toBuffer(),
  ]);
  await Promise.all([
    writeFile(path.join(dir, `${id}.webp`), mainBuf),
    writeFile(path.join(dir, `${id}_thumb.webp`), thumbBuf),
  ]);
  return { image: `${UPLOAD_URL_PREFIX}${id}.webp`, thumb: `${UPLOAD_URL_PREFIX}${id}_thumb.webp`, bytes: mainBuf.length + thumbBuf.length };
}

// حذف امن فایل‌های محلی (عکس اصلی و thumbnail) — برای وقتی که عکس عوض یا کالا حذف می‌شود
export async function deleteLocalImages(urls: Array<string | null | undefined>): Promise<void> {
  const targets = urls.filter((u): u is string => typeof u === "string").map(localPathFromUrl).filter((p): p is string => Boolean(p));
  await Promise.all(targets.map(p => unlink(p).catch(() => {})));
}
