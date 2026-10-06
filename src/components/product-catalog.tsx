"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import type { SerializedPublicListing } from "@/lib/public-listing";

const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);

export function ProductCatalog({ listings }: { listings: SerializedPublicListing[] }) {
  const [category, setCategory] = useState("همه‌ی وسایل");
  const categories = ["همه‌ی وسایل", ...Array.from(new Set(listings.map(item => item.category)))];
  const visible = listings.filter(item => category === "همه‌ی وسایل" || item.category === category);

  return <div className="site-shell catalog-shell">
    <header className="header"><div className="header-inner container"><Link href="/" className="brand" aria-label="دوباره، صفحه اصلی"><BrandMark priority /><span>دوباره<span className="brand-dot">.</span></span></Link><nav className="nav catalog-nav"><Link href="/">صفحه اصلی</Link><Link href="/#how-it-works">چطور کار می‌کند؟</Link><Link href="/#about">داستان ما</Link></nav><Link href="/" className="header-cta"><ArrowRight size={17} /> بازگشت به خانه</Link></div></header>

    <main className="products-section catalog-page container">
      <div className="section-heading catalog-heading"><div><div className="section-kicker"><span>✳</span> بازارچه‌ی شخصی دوباره</div><h1>وسایل دوست‌داشتنی</h1><p>هر مورد صفحه‌ی اختصاصی خودش را دارد؛ برای دیدن تصاویر و جزئیات روی آن بزن.</p></div><div className="section-count">{listings.length.toLocaleString("fa-IR")} مورد در ویترین <span>↙</span></div></div>
      <div className="filters" role="group" aria-label="فیلتر دسته‌بندی">{categories.map(item => <button type="button" key={item} className={category === item ? "filter active" : "filter"} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="product-grid">{visible.map((listing, index) => <Link className="product-card catalog-card" href={`/${listing.kind === "group" ? "group" : "product"}/${listing.id}`} key={`${listing.kind}-${listing.id}`} aria-label={`مشاهده ${listing.title}`}>
        <div className={listing.kind === "group" ? `product-image-wrap group-collage collage-${Math.min(listing.images.length, 4)}` : "product-image-wrap"}>{listing.kind === "group" ? listing.images.slice(0, 4).map((image, imageIndex) => <img key={`${image.imageUrl}-${imageIndex}`} src={image.thumbUrl || image.imageUrl} alt={`${listing.title} — تصویر ${(imageIndex + 1).toLocaleString("fa-IR")}`} loading={index > 2 ? "lazy" : "eager"} />) : <img src={listing.thumbUrl || listing.imageUrl} alt={listing.title} loading={index > 2 ? "lazy" : "eager"} />}<span className={listing.available ? "condition-badge" : listing.reservedAt ? "condition-badge reserved" : "condition-badge sold"}><span className="badge-dot" />{listing.available ? listing.condition : listing.reservedAt ? "رزرو شده" : "واگذار شده"}</span>{listing.kind === "group" ? <span className="photo-count">بسته‌ی {listing.members.length.toLocaleString("fa-IR")}‌تایی</span> : listing.images.length > 1 ? <span className="photo-count">📷 {listing.images.length.toLocaleString("fa-IR")}</span> : null}</div>
        <div className="product-content"><div className="product-category">{listing.category}</div><h2>{listing.title}</h2><p>{listing.description}</p><div className="product-bottom"><div className="price"><strong>{formatPrice(listing.price)}</strong><span>تومان</span>{listing.newPrice ? <s className="card-new-price">نو: {formatPrice(listing.newPrice)} تومان</s> : null}</div><span className={listing.available ? "interest-button" : "interest-button disabled"}>{listing.available ? <ArrowLeft size={20} /> : listing.reservedAt ? <Clock size={18} /> : <Check size={18} />}</span></div></div>
      </Link>)}</div>
      {visible.length === 0 && <div className="empty-state">فعلاً موردی در این دسته وجود ندارد.</div>}
    </main>

    <footer className="footer"><div className="container footer-inner"><Link href="/" className="brand footer-brand"><BrandMark /><span>دوباره<span className="brand-dot">.</span></span></Link><span>حس‌های خوب، وسایل خوب‌تر</span><Link href="/">بازگشت به خانه</Link></div></footer>
  </div>;
}
