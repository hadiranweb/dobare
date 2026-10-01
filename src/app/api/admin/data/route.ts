import { db } from "@/db";
import { inquiries, productImages, products } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { RESERVATION_HOURS } from "@/lib/reservation";
import { deleteLocalImages, isLocalImageUrl } from "@/lib/storage";
import { asc, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const MAX_IMAGES = 10;
const unauthorized = () => Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });

async function productsWithImages() {
  const [items, images] = await Promise.all([
    db.select().from(products).orderBy(desc(products.id)),
    db.select().from(productImages).orderBy(asc(productImages.position), asc(productImages.id)),
  ]);
  const byProduct = new Map<number, { imageUrl: string; thumbUrl: string | null }[]>();
  for (const img of images) {
    const list = byProduct.get(img.productId) || [];
    list.push({ imageUrl: img.imageUrl, thumbUrl: img.thumbUrl });
    byProduct.set(img.productId, list);
  }
  return items.map(p => ({
    ...p,
    images: byProduct.get(p.id)?.length ? byProduct.get(p.id)! : [{ imageUrl: p.imageUrl, thumbUrl: p.thumbUrl }],
  }));
}

export async function GET(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  const [items, leads] = await Promise.all([productsWithImages(), db.select().from(inquiries).orderBy(desc(inquiries.createdAt))]);
  return Response.json({ products: items, inquiries: leads, reservationHours: RESERVATION_HOURS });
}

// اعتبارسنجی یک عکس: آپلود محلی (نام تولیدشده توسط خود سیستم) یا لینک خارجی http(s)
function validateImage(url: string, thumbUrl: string | null) {
  if (url.startsWith("/uploads/")) {
    if (!isLocalImageUrl(url)) throw new Error("آدرس عکس محلی معتبر نیست.");
    if (thumbUrl && !isLocalImageUrl(thumbUrl)) throw new Error("آدرس نسخه‌ی کوچک معتبر نیست.");
    return { imageUrl: url, thumbUrl: thumbUrl || null };
  }
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error("آدرس عکس معتبر نیست.");
  }
  return { imageUrl: url, thumbUrl: null };
}

function parseProduct(body: Record<string, unknown>) {
  const title = String(body.title || "").trim().slice(0, 120);
  const description = String(body.description || "").trim().slice(0, 600);
  const category = String(body.category || "متفرقه").trim().slice(0, 60);
  const condition = String(body.condition || "تمیز و سالم").trim().slice(0, 60);
  const price = Number(body.price);
  if (!title || !description || !Number.isInteger(price) || price < 0) throw new Error("نام، توضیح و قیمت معتبر وارد کنید.");

  // فهرست عکس‌ها: آرایه‌ی images (تا ۱۰ عکس) یا حالت تک‌عکسی‌ی قدیمی (imageUrl)
  const rawList: Array<Record<string, unknown>> = Array.isArray(body.images)
    ? body.images
    : body.imageUrl
      ? [{ imageUrl: body.imageUrl, thumbUrl: body.thumbUrl }]
      : [];
  if (rawList.length < 1) throw new Error("حداقل یک عکس لازم است.");
  if (rawList.length > MAX_IMAGES) throw new Error(`حداکثر ${MAX_IMAGES} عکس برای هر وسیله مجاز است.`);
  const images = rawList.map(item => validateImage(String(item.imageUrl || "").trim(), item.thumbUrl ? String(item.thumbUrl).trim() : null));

  const available = body.available !== false;
  // کاور (ستون‌های محصول) همیشه عکس اول است — بقیه‌ی بخش‌های برنامه (کارت‌ها، بات، ...) فقط همین را می‌بینند
  return {
    values: { title, description, category, condition, imageUrl: images[0].imageUrl, thumbUrl: images[0].thumbUrl, price, available, ...(available ? { reservedAt: null } : {}) },
    images,
  };
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const { values, images } = parseProduct(await request.json());
    const [created] = await db.insert(products).values(values).returning();
    await db.insert(productImages).values(images.map((img, i) => ({ productId: created.id, imageUrl: img.imageUrl, thumbUrl: img.thumbUrl, position: i })));
    return Response.json({ product: created });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "اطلاعات نامعتبر است." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) throw new Error("شناسه نامعتبر است.");
    const { values, images } = parseProduct(body);
    const [previous] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    const previousImages = await db.select().from(productImages).where(eq(productImages.productId, id));
    const [updated] = await db.update(products).set(values).where(eq(products.id, id)).returning();
    if (!updated) return Response.json({ error: "کالا پیدا نشد." }, { status: 404 });
    // جایگزینی فهرست عکس‌ها
    await db.delete(productImages).where(eq(productImages.productId, id));
    await db.insert(productImages).values(images.map((img, i) => ({ productId: id, imageUrl: img.imageUrl, thumbUrl: img.thumbUrl, position: i })));
    // فایل‌های محلی که دیگر در فهرست نیستند از دیسک پاک می‌شوند (هم عکس اصلی هم thumbnail)
    const kept = new Set(images.flatMap(i => [i.imageUrl, i.thumbUrl]).filter((u): u is string => Boolean(u)));
    const orphans = [
      ...(previous ? [previous.imageUrl, previous.thumbUrl] : []),
      ...previousImages.flatMap(i => [i.imageUrl, i.thumbUrl]),
    ].filter((u): u is string => Boolean(u) && !kept.has(u!));
    await deleteLocalImages(orphans);
    return Response.json({ product: updated });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "اطلاعات نامعتبر است." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const rows = await db.select().from(productImages).where(eq(productImages.productId, id));
  const [removed] = await db.delete(products).where(eq(products.id, id)).returning();
  // فایل‌های عکس محلیِ کالای حذفشده هم پاک می‌شوند
  await deleteLocalImages([...(removed ? [removed.imageUrl, removed.thumbUrl] : []), ...rows.flatMap(r => [r.imageUrl, r.thumbUrl])]);
  return Response.json({ ok: true });
}
