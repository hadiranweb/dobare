import type { Metadata } from "next";
import { ProductCatalog } from "@/components/product-catalog";
import { getProducts } from "@/lib/products";
import { serializePublicListing } from "@/lib/public-listing";
import { releaseExpiredReservations } from "@/lib/reservation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "وسایل دوست‌داشتنی | دوباره",
  description: "فهرست وسایل نو و کارکرده‌ی فروشی در بازارچه‌ی شخصی دوباره.",
  alternates: { canonical: "/product" },
  openGraph: { title: "وسایل دوست‌داشتنی | دوباره", description: "فهرست وسایل نو و کارکرده‌ی فروشی در بازارچه‌ی شخصی دوباره.", url: "/product", type: "website" },
};

export default async function ProductDirectoryPage() {
  await releaseExpiredReservations();
  const listings = await getProducts();
  return <ProductCatalog listings={listings.map(serializePublicListing)} />;
}
