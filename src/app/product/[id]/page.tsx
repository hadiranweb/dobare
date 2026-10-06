import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ListingPage } from "@/components/listing-page";
import { ListingStructuredData } from "@/components/listing-structured-data";
import { getProductGroupId, getPublicListing, serializePublicListing } from "@/lib/public-listing";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
const parseId = (value: string) => /^\d+$/.test(value) ? Number(value) : NaN;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: rawId } = await params;
  const listing = await getPublicListing("product", parseId(rawId));
  if (!listing) return { title: "وسیله پیدا نشد | دوباره" };
  return {
    title: `${listing.title} | دوباره`,
    description: listing.description.slice(0, 160),
    alternates: { canonical: `/product/${listing.id}` },
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      type: "website",
      url: `/product/${listing.id}`,
      images: [{ url: listing.imageUrl, alt: listing.title }],
    },
    twitter: { card: "summary_large_image", title: listing.title, description: listing.description.slice(0, 160), images: [listing.imageUrl] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();
  const listing = await getPublicListing("product", id);
  if (!listing) {
    const groupId = await getProductGroupId(id);
    if (groupId) redirect(`/group/${groupId}`);
    notFound();
  }
  const serialized = serializePublicListing(listing);
  return <><ListingStructuredData listing={serialized} /><ListingPage listing={serialized} /></>;
}
