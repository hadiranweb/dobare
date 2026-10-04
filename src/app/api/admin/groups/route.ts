import { db } from "@/db";
import { productGroupItems, productGroups, products } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { getUsdRate } from "@/lib/price-engine";
import { isConfiguredSeller } from "@/lib/sellers";
import { and, eq, inArray, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";
const unauthorized = () => Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });

function parseIds(value: unknown) {
  const ids = Array.isArray(value) ? [...new Set(value.map(Number))] : [];
  if (ids.length < 2 || ids.length > 20 || ids.some(id => !Number.isInteger(id) || id < 1)) {
    throw new Error("برای گروه بین ۲ تا ۲۰ کالای معتبر انتخاب کنید.");
  }
  return ids;
}

async function parseGroup(body: Record<string, unknown>, currentGroupId?: number) {
  const title = String(body.title || "").trim().slice(0, 120);
  const description = String(body.description || "").trim().slice(0, 600);
  const memberIds = parseIds(body.memberIds);
  if (!title || !description) throw new Error("عنوان و توضیح گروه را وارد کنید.");

  const members = await db.select().from(products).where(inArray(products.id, memberIds));
  if (members.length !== memberIds.length) throw new Error("یکی از کالاهای انتخاب‌شده پیدا نشد.");
  if (members.some(p => !p.available || p.reservedAt)) throw new Error("فقط کالاهای موجود و آزاد را می‌توان گروه کرد.");
  const sellerKey = members[0].sellerKey;
  if (!isConfiguredSeller(sellerKey) || members.some(p => p.sellerKey !== sellerKey)) {
    throw new Error("تمام اعضای گروه باید یک فروشنده مشترک داشته باشند.");
  }
  const conflicts = await db.select().from(productGroupItems).where(
    currentGroupId
      ? and(inArray(productGroupItems.productId, memberIds), ne(productGroupItems.groupId, currentGroupId))
      : inArray(productGroupItems.productId, memberIds)
  );
  if (conflicts.length) throw new Error("یکی از کالاها قبلاً عضو گروه دیگری است.");

  const usdRate = await getUsdRate();
  if (!usdRate) throw new Error("ابتدا میانگین قیمت دلار هفته را ثبت کنید.");
  const ratioRaw = body.usdRatio;
  const hasRatio = ratioRaw !== null && ratioRaw !== undefined && String(ratioRaw).trim() !== "";
  let usdRatio: number;
  let price: number;
  if (hasRatio) {
    usdRatio = Number(ratioRaw);
    if (!Number.isFinite(usdRatio) || usdRatio <= 0) throw new Error("نسبت دلاری گروه معتبر نیست.");
    price = Math.round(usdRatio * usdRate);
  } else {
    price = Number(body.price);
    if (!Number.isInteger(price) || price <= 0 || price > 2_147_483_647) throw new Error("قیمت گروه معتبر نیست.");
    usdRatio = price / usdRate;
  }
  if (!Number.isSafeInteger(price) || price <= 0 || price > 2_147_483_647) throw new Error("قیمت محاسبه‌شده گروه معتبر نیست.");
  return { values: { title, description, price, usdRatio, sellerKey }, memberIds };
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const parsed = await parseGroup(await request.json());
    const created = await db.transaction(async tx => {
      const locked = await tx.select().from(products).where(inArray(products.id, parsed.memberIds)).for("update");
      if (locked.length !== parsed.memberIds.length || locked.some(p => !p.available || p.sellerKey !== parsed.values.sellerKey)) throw new Error("وضعیت یکی از کالاها تغییر کرده؛ دوباره تلاش کنید.");
      const existing = await tx.select().from(productGroupItems).where(inArray(productGroupItems.productId, parsed.memberIds));
      if (existing.length) throw new Error("یکی از کالاها قبلاً عضو گروه دیگری است.");
      const [group] = await tx.insert(productGroups).values(parsed.values).returning();
      await tx.insert(productGroupItems).values(parsed.memberIds.map((productId, position) => ({ groupId: group.id, productId, position })));
      return group;
    });
    return Response.json({ group: created });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "ساخت گروه ممکن نشد." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) throw new Error("شناسه گروه نامعتبر است.");
    const [current] = await db.select().from(productGroups).where(eq(productGroups.id, id)).limit(1);
    if (!current) return Response.json({ error: "گروه پیدا نشد." }, { status: 404 });
    if (current.reservedAt) throw new Error("گروه رزروشده را ابتدا آزاد کنید.");
    const parsed = await parseGroup(body, id);
    const updated = await db.transaction(async tx => {
      const [lockedGroup] = await tx.select().from(productGroups).where(eq(productGroups.id, id)).limit(1).for("update");
      if (!lockedGroup || lockedGroup.reservedAt) throw new Error("گروه رزروشده را ابتدا آزاد کنید.");
      const locked = await tx.select().from(products).where(inArray(products.id, parsed.memberIds)).for("update");
      if (locked.length !== parsed.memberIds.length || locked.some(p => !p.available || p.sellerKey !== parsed.values.sellerKey)) throw new Error("وضعیت یکی از کالاها تغییر کرده؛ دوباره تلاش کنید.");
      const conflicts = await tx.select().from(productGroupItems).where(and(inArray(productGroupItems.productId, parsed.memberIds), ne(productGroupItems.groupId, id)));
      if (conflicts.length) throw new Error("یکی از کالاها قبلاً عضو گروه دیگری است.");
      const [group] = await tx.update(productGroups).set(parsed.values).where(eq(productGroups.id, id)).returning();
      await tx.delete(productGroupItems).where(eq(productGroupItems.groupId, id));
      await tx.insert(productGroupItems).values(parsed.memberIds.map((productId, position) => ({ groupId: id, productId, position })));
      return group;
    });
    return Response.json({ group: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "ویرایش گروه ممکن نشد." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) throw new Error("شناسه گروه نامعتبر است.");
    const removed = await db.transaction(async tx => {
      const [current] = await tx.select().from(productGroups).where(eq(productGroups.id, id)).limit(1).for("update");
      if (!current) return null;
      if (current.reservedAt) throw new Error("گروه رزروشده را ابتدا آزاد کنید.");
      await tx.delete(productGroups).where(eq(productGroups.id, id));
      return current;
    });
    if (!removed) return Response.json({ error: "گروه پیدا نشد." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "حذف گروه ممکن نشد." }, { status: 400 });
  }
}
