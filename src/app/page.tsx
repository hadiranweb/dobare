import { getProducts } from "@/lib/products";
import Storefront from "@/components/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const listings = await getProducts();
  const serialized = listings.map(item => ({
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
    images: item.images.map(img => ({ imageUrl: img.imageUrl, thumbUrl: img.thumbUrl })),
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
      images: member.images,
      category: member.category,
      condition: member.condition,
    })) : [],
  }));
  return <Storefront initialProducts={serialized} />;
}
