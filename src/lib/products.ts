import { db } from "@/db";
import { products } from "@/db/schema";
import { asc } from "drizzle-orm";

// فروشگاه از اول خالی شروع می‌شود — وسایل واقعی از پنل مدیریت (/admin) اضافه می‌شوند
export async function getProducts() {
  return db.select().from(products).orderBy(asc(products.id));
}
