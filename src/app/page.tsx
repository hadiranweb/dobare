import { getProducts } from "@/lib/products";
import Storefront from "@/components/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();
  return <Storefront initialProducts={products.map(({ id, title, description, price, sellerName, newPrice, specs, imageUrl, thumbUrl, images, category, condition, available, reservedAt }) => ({ id, title, description, price, sellerName, newPrice: newPrice ?? null, specs: specs ?? [], imageUrl, thumbUrl, images: images.map(img => ({ imageUrl: img.imageUrl, thumbUrl: img.thumbUrl })), category, condition, available, reservedAt: reservedAt ? reservedAt.toISOString() : null }))} />;
}
