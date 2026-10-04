import { db } from "@/db";
import { productGroupItems, productGroups, productImages, products } from "@/db/schema";
import { getSeller } from "@/lib/sellers";
import { asc } from "drizzle-orm";

export type ProductImage = { imageUrl: string; thumbUrl: string | null };

export async function getProducts() {
  const [items, images, groups, links] = await Promise.all([
    db.select().from(products).orderBy(asc(products.id)),
    db.select().from(productImages).orderBy(asc(productImages.position), asc(productImages.id)),
    db.select().from(productGroups).orderBy(asc(productGroups.id)),
    db.select().from(productGroupItems).orderBy(asc(productGroupItems.position)),
  ]);
  const byProduct = new Map<number, ProductImage[]>();
  for (const img of images) {
    const list = byProduct.get(img.productId) || [];
    list.push({ imageUrl: img.imageUrl, thumbUrl: img.thumbUrl });
    byProduct.set(img.productId, list);
  }
  const fullProducts = items.map(p => ({
    ...p,
    kind: "product" as const,
    sellerName: getSeller(p.sellerKey).name,
    images: byProduct.get(p.id)?.length ? byProduct.get(p.id)! : [{ imageUrl: p.imageUrl, thumbUrl: p.thumbUrl }],
  }));
  const productById = new Map(fullProducts.map(p => [p.id, p]));
  const groupedIds = new Set(links.map(link => link.productId));
  const groupListings = groups.map(group => {
    const members = links
      .filter(link => link.groupId === group.id)
      .map(link => productById.get(link.productId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const coverImages = members.slice(0, 4).map(p => ({ imageUrl: p.imageUrl, thumbUrl: p.thumbUrl }));
    return {
      ...group,
      kind: "group" as const,
      sellerName: getSeller(group.sellerKey).name,
      newPrice: null,
      specs: [],
      imageUrl: coverImages[0]?.imageUrl || "",
      thumbUrl: coverImages[0]?.thumbUrl || null,
      images: coverImages,
      category: "فروش گروهی",
      condition: `${members.length.toLocaleString("fa-IR")} وسیله با هم`,
      members,
    };
  }).filter(group => group.members.length >= 2);
  return [...groupListings, ...fullProducts.filter(product => !groupedIds.has(product.id))];
}
