import { db } from "@/db";
import { products } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
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
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
    if (action !== "sell" && action !== "open") return Response.json({ error: "عملیات نامعتبر است." }, { status: 400 });

    const [updated] = await db.update(products)
      .set(action === "sell" ? { available: false, reservedAt: null } : { available: true, reservedAt: null })
      .where(eq(products.id, id)).returning();
    if (!updated) return Response.json({ error: "کالا پیدا نشد." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Status change failed:", error);
    return Response.json({ error: "تغییر وضعیت ممکن نشد." }, { status: 500 });
  }
}
