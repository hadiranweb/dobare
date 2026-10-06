import { db } from "@/db";
import { productGroupItems } from "@/db/schema";
import { getProducts } from "@/lib/products";
import { releaseExpiredReservations } from "@/lib/reservation";
import { eq } from "drizzle-orm";
import { cache } from "react";

export type PublicListing = Awaited<ReturnType<typeof getProducts>>[number];

export const getPublicListing = cache(async (kind: "product" | "group", id: number): Promise<PublicListing | null> => {
  if (!Number.isInteger(id) || id < 1) return null;
  await releaseExpiredReservations();
  const listings = await getProducts();
  return listings.find(item => item.kind === kind && item.id === id) ?? null;
});

export async function getProductGroupId(productId: number): Promise<number | null> {
  if (!Number.isInteger(productId) || productId < 1) return null;
  const [membership] = await db
    .select({ groupId: productGroupItems.groupId })
    .from(productGroupItems)
    .where(eq(productGroupItems.productId, productId))
    .limit(1);
  return membership?.groupId ?? null;
}

export function serializePublicListing(item: PublicListing) {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    description: item.description,
    price: item.price,
    sellerName: item.sellerName,
    newPrice: item.newPrice ?? null,
    specs: item.specs ?? [],
    imageUrl: item.imageUrl,
    thumbUrl: item.thumbUrl,
    images: item.images.map(image => ({ imageUrl: image.imageUrl, thumbUrl: image.thumbUrl })),
    category: item.category,
    condition: item.condition,
    available: item.available,
    reservedAt: item.reservedAt ? item.reservedAt.toISOString() : null,
    members: item.kind === "group" ? item.members.map(member => ({
      id: member.id,
      title: member.title,
      description: member.description,
      price: member.price,
      specs: member.specs ?? [],
      imageUrl: member.imageUrl,
      thumbUrl: member.thumbUrl,
      images: member.images.map(image => ({ imageUrl: image.imageUrl, thumbUrl: image.thumbUrl })),
      category: member.category,
      condition: member.condition,
    })) : [],
  };
}

export type SerializedPublicListing = ReturnType<typeof serializePublicListing>;
