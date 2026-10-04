import { db } from "@/db";
import { productGroupItems, products } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { setGroupStatus } from "@/lib/group-status";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// تغییر وضعیت وسیله از پنل مدیریت:
//   sell → واگذار شد (فروخته شد، دائم غیرقابل خرید)
//   open → آزاد کن / بازگردانی (دوباره قابل خرید می‌شود)
export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  try {
    const body = await request.json();
    const id = Number(body.id);
    const action = String(body.action || "");
    const kind = body.kind === "group" ? "group" : "product";
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
    if (action !== "sell" && action !== "open") return Response.json({ error: "عملیات نامعتبر است." }, { status: 400 });

    if (kind === "product") {
      const [membership] = await db.select().from(productGroupItems).where(eq(productGroupItems.productId, id)).limit(1);
      if (membership) return Response.json({ error: "وضعیت این کالا باید از طریق گروه آن تغییر کند." }, { status: 409 });
    }
    const updated = kind === "group"
      ? await setGroupStatus(id, action)
      : (await db.update(products)
          .set(action === "sell" ? { available: false, reservedAt: null } : { available: true, reservedAt: null })
          .where(eq(products.id, id)).returning())[0];
    if (!updated) return Response.json({ error: kind === "group" ? "گروه پیدا نشد." : "کالا پیدا نشد." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Status change failed:", error);
    return Response.json({ error: "تغییر وضعیت ممکن نشد." }, { status: 500 });
  }
}
