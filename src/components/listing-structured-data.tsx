import type { SerializedPublicListing } from "@/lib/public-listing";

export function ListingStructuredData({ listing }: { listing: SerializedPublicListing }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dobare.liara.run";
  const path = `/${listing.kind === "group" ? "group" : "product"}/${listing.id}`;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: listing.images.map(image => new URL(image.imageUrl, baseUrl).toString()),
    category: listing.category,
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: `${baseUrl}${path}`,
      priceCurrency: "IRR",
      price: listing.price * 10,
      availability: listing.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Person", name: listing.sellerName },
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
