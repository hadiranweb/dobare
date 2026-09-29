import { db } from "@/db";
import { inquiries, products } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { RESERVATION_HOURS } from "@/lib/reservation";
import { deleteLocalImages, isLocalImageUrl } from "@/lib/storage";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const unauthorized = () => Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });

export async function GET(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  const [items, leads] = await Promise.all([db.select().from(products).orderBy(desc(products.id)), db.select().from(inquiries).orderBy(desc(inquiries.createdAt))]);
  return Response.json({ products: items, inquiries: leads, reservationHours: RESERVATION_HOURS });
}

function parseProduct(body: Record<string, unknown>) {
  const title = String(body.title || "").trim().slice(0, 120);
  const description = String(body.description || "").trim().slice(0, 600);
  const category = String(body.category || "متفرقه").trim().slice(0, 60);
  const condition = String(body.condition || "تمیز و سالم").trim().slice(0, 60);
  const imageUrl = String(body.imageUrl || "").trim();
  const thumbUrl = String(body.thumbUrl || "").trim();
  const price = Number(body.price);
  let resolvedThumb: string | null = null;
  if (imageUrl.startsWith("/uploads/")) {
    // عکس آپلودشده‌ی محلی — نام فایل باید توسط خود سیستم تولید شده باشد
    if (!isLocalImageUrl(imageUrl)) throw new Error("آدرس عکس محلی معتبر نیست.");
    if (thumbUrl && !isLocalImageUrl(thumbUrl)) throw new Error("آدرس نسخه‌ی کوچک معتبر نیست.");
    resolvedThumb = thumbUrl || null;
  } else {
    // عکس خارجی (لینک مستقیم) — نسخه‌ی کوچک ندارد و همان لینک استفاده می‌شود
    try { const url = new URL(imageUrl); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); } catch { throw new Error("آدرس عکس معتبر نیست."); }
  }
  if (!title || !description || !Number.isInteger(price) || price < 0) throw new Error("نام، توضیح و قیمت معتبر وارد کنید.");
  const available = body.available !== false;
  // اگر از طریق فرم «موجود» علامت بخورد، هر رزروی هم پاک می‌شود
  return { title, description, category, condition, imageUrl, thumbUrl: resolvedThumb, price, available, ...(available ? { reservedAt: null } : {}) };
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const item = parseProduct(await request.json());
    const [created] = await db.insert(products).values(item).returning();
    return Response.json({ product: created });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "اطلاعات نامعتبر است." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) throw new Error("شناسه نامعتبر است.");
    const item = parseProduct(body);
    const [previous] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    const [updated] = await db.update(products).set(item).where(eq(products.id, id)).returning();
    if (!updated) return Response.json({ error: "کالا پیدا نشد." }, { status: 404 });
    // اگر عکس عوض شده، فایل‌های قدیمیِ محلی از دیسک پاک می‌شوند
    if (previous && (previous.imageUrl !== updated.imageUrl || previous.thumbUrl !== updated.thumbUrl)) {
      await deleteLocalImages([previous.imageUrl, previous.thumbUrl]);
    }
    return Response.json({ product: updated });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "اطلاعات نامعتبر است." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const [removed] = await db.delete(products).where(eq(products.id, id)).returning();
  // فایل‌های عکس محلیِ کالای حذفشده هم پاک می‌شوند
  if (removed) await deleteLocalImages([removed.imageUrl, removed.thumbUrl]);
  return Response.json({ ok: true });
}
