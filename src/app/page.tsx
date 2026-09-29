import { getProducts } from "@/lib/products";
import Storefront from "@/components/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();
  return <Storefront initialProducts={products.map(({ id, title, description, price, imageUrl, category, condition, available }) => ({ id, title, description, price, imageUrl, category, condition, available }))} />;
}
