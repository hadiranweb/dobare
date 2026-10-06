"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Send, Share2 } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import type { SerializedPublicListing } from "@/lib/public-listing";

const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);

export function ListingPage({ listing }: { listing: SerializedPublicListing }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [showInquiry, setShowInquiry] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [contact, setContact] = useState<{ name: string; phone?: string; telegram?: string } | null>(null);
  const [reservationHours, setReservationHours] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const images = listing.images.length ? listing.images : [{ imageUrl: listing.imageUrl, thumbUrl: listing.thumbUrl }];

  const share = async () => {
    const data = { title: `${listing.title} | دوباره`, text: listing.description, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch { setError("کپی‌کردن لینک ممکن نشد."); }
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: listing.kind, ...(listing.kind === "group" ? { groupId: listing.id } : { productId: listing.id }), phone, name, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ثبت درخواست ممکن نشد.");
      setContact(data.contact || null);
      setReservationHours(typeof data.reservationHours === "number" ? data.reservationHours : null);
      setSuccess(true);
    } catch (err) { setError(err instanceof Error ? err.message : "ثبت درخواست ممکن نشد."); }
    finally { setSubmitting(false); }
  };

  return <div className="site-shell listing-shell">
    <header className="header"><div className="header-inner container"><Link href="/" className="brand" aria-label="دوباره، صفحه اصلی"><BrandMark priority /><span>دوباره<span className="brand-dot">.</span></span></Link><Link href="/product" className="header-cta listing-back"><ArrowRight size={17} /> برگشت به ویترین</Link></div></header>

    <main className="listing-page container">
      <div className="listing-toolbar"><Link href="/product"><ArrowRight size={16} /> همه‌ی وسایل</Link><button type="button" onClick={share}>{copied ? <Check size={16} /> : <Share2 size={16} />}{copied ? "لینک کپی شد" : "اشتراک‌گذاری"}</button></div>
      <article className="listing-card">
        <section className="listing-gallery">
          <div className={listing.kind === "group" ? "listing-main-image group-listing-image" : "listing-main-image"}><img src={images[imageIndex]?.imageUrl || listing.imageUrl} alt={`${listing.title} — تصویر ${(imageIndex + 1).toLocaleString("fa-IR")}`} /></div>
          {images.length > 1 && <div className="listing-thumbnails">{images.map((image, index) => <button type="button" key={`${image.imageUrl}-${index}`} className={index === imageIndex ? "active" : ""} onClick={() => setImageIndex(index)} aria-label={`نمایش تصویر ${(index + 1).toLocaleString("fa-IR")}`}><img src={image.thumbUrl || image.imageUrl} alt="" /></button>)}</div>}
        </section>

        <section className="listing-info">
          <div className="pd-chips"><span className="pd-chip">{listing.category}</span><span className="pd-chip pd-chip-seller">فروشنده: {listing.sellerName}</span><span className="pd-chip pd-chip-condition">✦ {listing.condition}</span></div>
          <h1>{listing.title}</h1>
          <div className="pd-price-row"><div className="pd-price-main"><div className="price"><strong>{formatPrice(listing.price)}</strong><span>تومان</span></div>{listing.newPrice ? <s className="pd-new-price">نو: {formatPrice(listing.newPrice)} تومان</s> : null}{listing.newPrice && listing.newPrice > listing.price ? <span className="pd-discount">٪{Math.round((1 - listing.price / listing.newPrice) * 100).toLocaleString("fa-IR")} ارزان‌تر از نو</span> : null}</div><span className={success ? "pd-status reserved" : listing.available ? "pd-status available" : listing.reservedAt ? "pd-status reserved" : "pd-status sold"}>{success ? "🟠 برای شما رزرو شد" : listing.available ? "🟢 موجود" : listing.reservedAt ? "🟠 رزرو شده" : "⚪ واگذار شده"}</span></div>
          <p className="listing-description">{listing.description}</p>

          {listing.kind === "group" && <div className="group-members listing-members"><h4>این بسته شامل چیست؟</h4>{listing.members.map(member => <div className="group-member" key={member.id}><div className="group-member-head"><img src={member.thumbUrl || member.imageUrl} alt={member.title} /><div><strong>{member.title}</strong><span>{member.category} · {formatPrice(member.price)} تومان</span><p>{member.description}</p></div></div>{member.specs.length > 0 && <div className="group-member-specs">{member.specs.map((spec, index) => <span key={`${spec.key}-${index}`}><b>{spec.key}</b>{spec.value}</span>)}</div>}</div>)}</div>}
          {listing.specs.length > 0 && <div className="pd-specs"><h4>مشخصات</h4>{listing.specs.map((spec, index) => <div className="pd-spec-row" key={`${spec.key}-${index}`}><span className="pd-spec-key">{spec.key}</span><span className="pd-spec-value">{spec.value}</span></div>)}</div>}

          {!showInquiry && listing.available && <button type="button" className="button button-primary listing-cta" onClick={() => setShowInquiry(true)}>می‌خوامش! شماره‌ام رو بذار <ArrowLeft size={18} /></button>}
          {!listing.available && <div className="pd-status-note">{listing.reservedAt ? "این مورد فعلاً توسط شخص دیگری رزرو شده است؛ اگر آزاد شود دوباره قابل درخواست خواهد بود." : "این مورد واگذار شده و دیگر موجود نیست."}</div>}

          {showInquiry && !success && <div className="listing-inquiry"><div className="listing-inquiry-head"><h2>بذار باهات تماس بگیرم ☎</h2><p>شماره موبایلت را ثبت کن تا برای هماهنگی با تو تماس بگیرم.</p></div><form onSubmit={submit}><label htmlFor="direct-phone">شماره موبایل شما</label><input id="direct-phone" type="tel" inputMode="tel" dir="ltr" placeholder="0912 123 4567" value={phone} onChange={event => setPhone(event.target.value)} required autoFocus /><label htmlFor="direct-name">نام شما <small>(اختیاری)</small></label><input id="direct-name" value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder="مثلاً سارا" /><label htmlFor="direct-message">پیام کوتاه <small>(اختیاری)</small></label><textarea id="direct-message" value={message} maxLength={500} rows={3} onChange={event => setMessage(event.target.value)} placeholder="مثلاً عصرها بعد از ۶ پاسخ می‌دهم" /><div className="privacy-note"><span>🔒</span> اطلاعاتت فقط برای هماهنگی همین مورد استفاده می‌شود.</div>{error && <div className="form-error">{error}</div>}<div className="listing-form-actions"><button type="button" onClick={() => setShowInquiry(false)}>انصراف</button><button className="button button-primary" disabled={submitting}>{submitting ? "در حال ثبت..." : "ثبت شماره"}<ArrowLeft size={17} /></button></div></form></div>}
          {success && <div className="listing-success"><div className="success-icon"><Check size={30} /></div><h2>شماره‌ات رسید!</h2><p>«{listing.title}» تا {reservationHours?.toLocaleString("fa-IR") || "۶"} ساعت برایت رزرو شد.</p>{contact && <div className="contact-card"><span className="contact-title">فروشنده: <strong>{contact.name}</strong></span>{contact.phone && <a className="contact-phone" href={`tel:${contact.phone}`} dir="ltr">{contact.phone}</a>}<div className="contact-actions">{contact.telegram && <a className="button contact-telegram" href={`https://t.me/${contact.telegram}`} target="_blank" rel="noreferrer">تلگرام <Send size={16} /></a>}<Link className="button button-primary" href="/">بازگشت به ویترین</Link></div></div>}</div>}
        </section>
      </article>
    </main>
    <footer className="footer"><div className="container footer-inner"><Link href="/" className="brand footer-brand"><BrandMark /><span>دوباره<span className="brand-dot">.</span></span></Link><span>حس‌های خوب، وسایل خوب‌تر</span><Link href="/product">دیدن همه‌ی وسایل</Link></div></footer>
  </div>;
}
