import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dobare.liara.run";
  const listings = await getProducts();
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    ...listings.map(item => ({
      url: `${baseUrl}/${item.kind === "group" ? "group" : "product"}/${item.id}`,
      lastModified: item.createdAt,
      changeFrequency: "daily" as const,
      priority: item.available ? 0.8 : 0.4,
    })),
  ];
}
