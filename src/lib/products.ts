import { db } from "@/db";
import { productImages, products } from "@/db/schema";
import { asc } from "drizzle-orm";

// فروشگاه از اول خالی شروع می‌شود — وسایل واقعی از پنل مدیریت (/admin) اضافه می‌شوند
export type ProductImage = { imageUrl: string; thumbUrl: string | null };

export async function getProducts() {
  const [items, images] = await Promise.all([
    db.select().from(products).orderBy(asc(products.id)),
    db.select().from(productImages).orderBy(asc(productImages.position), asc(productImages.id)),
  ]);
  const byProduct = new Map<number, ProductImage[]>();
  for (const img of images) {
    const list = byProduct.get(img.productId) || [];
    list.push({ imageUrl: img.imageUrl, thumbUrl: img.thumbUrl });
    byProduct.set(img.productId, list);
  }
  // هر کالا حداقل یک عکس دارد؛ برای اطمینان کاور به‌عنوان fallback
  return items.map(p => ({
    ...p,
    images: byProduct.get(p.id)?.length ? byProduct.get(p.id)! : [{ imageUrl: p.imageUrl, thumbUrl: p.thumbUrl }],
  }));
}
