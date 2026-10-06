import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/listing-page";
import { ListingStructuredData } from "@/components/listing-structured-data";
import { getPublicListing, serializePublicListing } from "@/lib/public-listing";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
const parseId = (value: string) => /^\d+$/.test(value) ? Number(value) : NaN;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: rawId } = await params;
  const listing = await getPublicListing("group", parseId(rawId));
  if (!listing) return { title: "گروه پیدا نشد | دوباره" };
  return {
    title: `${listing.title} | دوباره`,
    description: listing.description.slice(0, 160),
    alternates: { canonical: `/group/${listing.id}` },
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      type: "website",
      url: `/group/${listing.id}`,
      images: listing.images.slice(0, 4).map(image => ({ url: image.imageUrl, alt: listing.title })),
    },
    twitter: { card: "summary_large_image", title: listing.title, description: listing.description.slice(0, 160), images: [listing.imageUrl] },
  };
}

export default async function GroupPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();
  const listing = await getPublicListing("group", id);
  if (!listing) notFound();
  const serialized = serializePublicListing(listing);
  return <><ListingStructuredData listing={serialized} /><ListingPage listing={serialized} /></>;
}
