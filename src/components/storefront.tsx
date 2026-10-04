"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Heart, Leaf, Menu, Phone, Send, Sparkles, X } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";

type ProductImage = { imageUrl: string; thumbUrl: string | null };
type ProductSpec = { key: string; value: string };
type GroupMember = { id: number; title: string; description: string; price: number; specs: ProductSpec[]; imageUrl: string; thumbUrl: string | null; images: ProductImage[]; category: string; condition: string };
type Product = { id: number; kind: "product" | "group"; title: string; description: string; price: number; sellerName: string; newPrice: number | null; specs: ProductSpec[]; imageUrl: string; thumbUrl: string | null; images: ProductImage[]; category: string; condition: string; available: boolean; reservedAt: string | null; members: GroupMember[] };
const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);
const heroImage = "/hero.webp";

export default function Storefront({ initialProducts }: { initialProducts: Product[] }) {
  const [category, setCategory] = useState("همه‌ی وسایل");
  const [selected, setSelected] = useState<Product | null>(null);
  const [view, setView] = useState<"details" | "inquiry">("details");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState<{ name: string; phone?: string; telegram?: string } | null>(null);
  const [reservationHours, setReservationHours] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const categories = ["همه‌ی وسایل", ...Array.from(new Set(initialProducts.map(p => p.category)))];
  const visible = initialProducts.filter(p => category === "همه‌ی وسایل" || p.category === category);

  const selectedImages = selected?.images?.length ? selected.images : selected ? [{ imageUrl: selected.imageUrl, thumbUrl: selected.thumbUrl }] : [];

  // گالری سوایپی — track با جهت LTR تا رفتار اسکرول در همه مرورگرها یکسان باشد
  const onGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.max(0, Math.min(selectedImages.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
    if (i !== galleryIndex) setGalleryIndex(i);
  };
  const goToImage = (i: number) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setGalleryIndex(i);
  };

  // با هر باز شدن مودال، گالری به عکس اول برمی‌گردد
  useEffect(() => {
    const el = galleryRef.current;
    if (el) el.scrollLeft = 0;
    setGalleryIndex(0);
  }, [selected?.id, view]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (view === "details" && selectedImages.length > 1) {
        const el = galleryRef.current;
        if (!el) return;
        if (e.key === "ArrowLeft") el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
        if (e.key === "ArrowRight") el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [selected, view, selectedImages.length]);

  const resetInquiryState = () => { setPhone(""); setName(""); setMessage(""); setError(""); setSuccess(false); setContact(null); setReservationHours(null); };
  // کلیک روی کارت → جزئیات کامل با گالری
  const openProduct = (product: Product) => { setSelected(product); setView("details"); resetInquiryState(); };
  // دکمه‌ی کوچک گوشه‌ی کارت → مستقیم فرم ثبت شماره
  const openInterest = (product: Product) => { setSelected(product); setView("inquiry"); resetInquiryState(); };
  const submitInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: selected.kind, ...(selected.kind === "group" ? { groupId: selected.id } : { productId: selected.id }), phone, name, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "مشکلی پیش اومد. لطفاً دوباره تلاش کن.");
      setSuccess(true);
      setContact(data.contact || null);
      setReservationHours(typeof data.reservationHours === "number" ? data.reservationHours : null);
    } catch (err) { setError(err instanceof Error ? err.message : "مشکلی پیش اومد."); }
    finally { setSubmitting(false); }
  };

  return <div className="site-shell">
    <header className="header" id="top">
      <div className="header-inner container">
        <a href="#top" className="brand" aria-label="دوباره، صفحه اصلی"><BrandMark priority /><span>دوباره<span className="brand-dot">.</span></span></a>
        <nav className={menuOpen ? "nav nav-open" : "nav"} aria-label="منوی اصلی">
          <a href="#products" onClick={() => setMenuOpen(false)}>وسایل دوست‌داشتنی</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>چطور کار می‌کنه؟</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>داستان ما</a>
        </nav>
        <a className="header-cta" href="#products">یه نگاهی بنداز <ArrowUpLeft size={17} /></a>
        <button className="mobile-menu" aria-label="باز کردن منو" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </header>

    <main>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> یه بازارچه‌ی کوچیک و خودمونی <Sparkles size={16} /></div>
          <h1>چیزهای خوب،<br /><span>یه زندگی تازه.</span></h1>
          <p className="hero-description">بعضی چیزها هنوز کلی قصه برای گفتن دارن. اینجا وسایلی رو می‌بینی که دیگه به کار من نمیان، اما شاید دقیقاً همون چیزی باشن که تو دنبالش بودی.</p>
          <div className="hero-actions"><a href="#products" className="button button-primary">ببین چی اینجاست <ArrowLeft size={19} /></a><a href="#how-it-works" className="text-link">چطور کار می‌کنه؟ <ChevronDown size={17} /></a></div>
          <div className="hero-note"><span className="mini-avatars"><span>✿</span><span>♥</span><span>✦</span></span><span>ساده، بی‌واسطه و از دلِ خونه</span></div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo-wrap"><img className="hero-photo" src={heroImage} alt="گوشه‌ای گرم و دنج از خانه با وسایل دوست‌داشتنی" /><div className="hero-photo-overlay" /></div>
          <div className="hero-sticker"><Heart size={25} fill="currentColor" strokeWidth={1.5} /><span>با عشق<br />نگه‌داری شده</span></div>
          <div className="hero-image-caption"><span className="caption-dot" /> هر چیزی، یه فرصت دوباره داره</div>
          <div className="hero-sparkle sparkle-one">✳</div><div className="hero-sparkle sparkle-two">✦</div>
        </div>
      </section>

      <section className="promise-strip" aria-label="ویژگی‌های دوباره"><div className="container promise-inner"><span><Heart size={18} /> وسایل با قصه و خاطره</span><i /><span><Leaf size={19} /> انتخابی مهربون با زمین</span><i /><span><Phone size={18} /> یک تماس ساده، بدون دردسر</span></div></section>

      <section className="products-section container" id="products">
        <div className="section-heading"><div><div className="section-kicker"><span>✳</span> از خونه‌ی من به خونه‌ی تو</div><h2>وسایل دوست‌داشتنی</h2><p>روی هر کارت بزن تا جزئیات، عکس‌ها و مشخصاتش رو ببینی.</p></div>{initialProducts.length > 0 && <div className="section-count">{new Intl.NumberFormat("fa-IR").format(initialProducts.length)} تا چیزِ خوب اینجاست <span>↙</span></div>}</div>
        <div className="filters" role="group" aria-label="فیلتر دسته‌بندی">{categories.map(c => <button type="button" key={c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}</div>
        <div className="product-grid">{visible.map((product, index) => <article className="product-card" key={product.id} tabIndex={0} role="button" aria-label={`جزئیات ${product.title}`} onClick={() => openProduct(product)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProduct(product); } }}>
          <div className={product.kind === "group" ? `product-image-wrap group-collage collage-${Math.min(product.images.length, 4)}` : "product-image-wrap"}>{product.kind === "group" ? product.images.slice(0, 4).map((img, i) => <img key={`${img.imageUrl}-${i}`} src={img.thumbUrl || img.imageUrl} alt={`${product.title} — عضو ${(i + 1).toLocaleString("fa-IR")}`} loading={index > 2 ? "lazy" : "eager"} />) : <img src={product.thumbUrl || product.imageUrl} alt={product.title} loading={index > 2 ? "lazy" : "eager"} />}<span className={product.available ? "condition-badge" : product.reservedAt ? "condition-badge reserved" : "condition-badge sold"}><span className="badge-dot" /> {product.available ? product.condition : product.reservedAt ? "رزرو شده" : "واگذار شده"}</span>{product.kind === "group" ? <span className="photo-count">بسته‌ی {product.members.length.toLocaleString("fa-IR")}‌تایی</span> : product.images?.length > 1 && <span className="photo-count">📷 {product.images.length.toLocaleString("fa-IR")}</span>}</div>
          <div className="product-content"><div className="product-category">{product.category}</div><h3>{product.title}</h3><p>{product.description}</p><div className="product-bottom"><div className="price"><strong>{formatPrice(product.price)}</strong><span>تومان</span>{product.newPrice ? <s className="card-new-price">نو: {formatPrice(product.newPrice)} تومان</s> : null}</div><button className="interest-button" onClick={e => { e.stopPropagation(); openInterest(product); }} disabled={!product.available} aria-label={product.available ? `درخواست ${product.title}` : product.reservedAt ? `${product.title} فعلاً رزرو شده` : `${product.title} واگذار شده`}>{product.available ? <ArrowUpLeft size={21} /> : product.reservedAt ? <Clock size={19} /> : <Check size={19} />}</button></div></div>
        </article>)}</div>
        {visible.length === 0 && <div className="empty-state">{initialProducts.length === 0 ? "هنوز وسیله‌ای برای فروش نذاشتم؛ به‌زودی دوباره سر بزن!" : "فعلاً وسیله‌ای در این دسته نیست. یه سر به بقیه‌ی وسایل بزن!"}</div>}
        <div className="below-grid-note"><span>✦</span> هر وسیله فقط یکیه؛ اگه چیزی دلت رو برد، معطل نکن! <span>✦</span></div>
      </section>

      <section className="how-section" id="how-it-works"><div className="container how-inner"><div className="how-intro"><div className="section-kicker">راحت‌تر از چیزی که فکر می‌کنی</div><h2>همین‌قدر<br /><em>ساده‌ست!</em></h2><p>اینجا خبری از سبد خرید و حساب کاربری و کارهای پیچیده نیست. فقط یه ارتباط ساده و انسانی.</p><div className="scribble-arrow">⤹</div></div><div className="steps"><div className="step"><span className="step-number">۰۱</span><div className="step-icon">👀</div><div><h3>یه گشتی بزن</h3><p>روی هر کارت بزن تا جزئیات و همه‌ی عکس‌هاش رو ببینی.</p></div></div><div className="step"><span className="step-number">۰۲</span><div className="step-icon">📱</div><div><h3>شماره‌ت رو بذار</h3><p>فقط شماره‌ت رو ثبت کن تا بدونم کدوم وسیله رو می‌خوای.</p></div></div><div className="step"><span className="step-number">۰۳</span><div className="step-icon">☕</div><div><h3>با هم حرف می‌زنیم</h3><p>باهات تماس می‌گیرم و بقیه‌اش رو خودمون هماهنگ می‌کنیم.</p></div></div></div></div></section>

      <section className="about-section container" id="about"><div className="about-icon"><Heart size={28} fill="currentColor" /></div><div><h2>از یه خونه، برای یه خونه‌ی دیگه.</h2><p>اینجا یه فروشگاه بزرگ نیست؛ یه گوشه‌ی کوچیکه برای وسایلی که هنوز می‌تونن به کار کسی بیان. شاید خونه‌ی بعدی‌شون، خونه‌ی تو باشه.</p></div><a href="#products" className="about-link">دیدن وسایل <ArrowLeft size={18} /></a></section>
    </main>
    <footer className="footer"><div className="container footer-inner"><a href="#top" className="brand footer-brand" aria-label="دوباره، برگشت به بالای صفحه"><BrandMark /><span>دوباره<span className="brand-dot">.</span></span></a><span>چیزهای خوب، یک زندگی تازه ♡</span><a href="#top">برگشت به بالا ↑</a></div></footer>

    {selected && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><div className={view === "details" && !success ? "modal pd-modal" : "modal"} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="بستن" onClick={() => setSelected(null)}><X size={21} /></button>
      {success ? <div className="success-view"><div className="success-icon"><Check size={32} /></div><h2 id="modal-title">شماره‌ت رسید! ♡</h2><p>چه خوب که «{selected.title}» رو پسندیدی. به‌زودی باهات تماس می‌گیرم تا با هم هماهنگ کنیم.</p>{reservationHours ? <div className="reserve-note">⏳ این وسیله تا {reservationHours.toLocaleString("fa-IR")} ساعت برات رزرو شد؛ اگه هماهنگ نشدیم، بعدش دوباره آزاد می‌شه.</div> : null}{contact ? <div className="contact-card"><span className="contact-title">فروشنده‌ی این وسیله: <strong>{contact.name}</strong></span><span className="contact-subtitle">اگر عجله داری، مستقیم تماس بگیر:</span>{contact.phone && <a className="contact-phone" href={`tel:${contact.phone}`} dir="ltr">{contact.phone.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3")}</a>}<div className="contact-actions">{contact.telegram && <a className="button contact-telegram" href={`https://t.me/${contact.telegram}`} target="_blank" rel="noreferrer">تلگرام <Send size={16} /></a>}<button className="button button-primary" onClick={() => setSelected(null)}>بله <Check size={16} /></button></div></div> : <button className="button button-primary" onClick={() => setSelected(null)}>خیلی هم عالی <ArrowLeft size={18} /></button>}</div>
        : view === "details" ? <>
          <div className="pd-gallery">
            <div className="pd-track" ref={galleryRef} onScroll={onGalleryScroll} dir="ltr">
              {selectedImages.map((img, i) => <div className="pd-slide" key={`${img.imageUrl}-${i}`}><img src={img.imageUrl} alt={`${selected.title} — عکس ${(i + 1).toLocaleString("fa-IR")}`} loading={i === 0 ? "eager" : "lazy"} /></div>)}
            </div>
            {selectedImages.length > 1 && <>
              <button className="pd-nav pd-prev" aria-label="عکس قبلی" onClick={() => goToImage((galleryIndex - 1 + selectedImages.length) % selectedImages.length)}><ChevronRight size={22} /></button>
              <button className="pd-nav pd-next" aria-label="عکس بعدی" onClick={() => goToImage((galleryIndex + 1) % selectedImages.length)}><ChevronLeft size={22} /></button>
              <span className="pd-counter">{(galleryIndex + 1).toLocaleString("fa-IR")} از {selectedImages.length.toLocaleString("fa-IR")}</span>
            </>}
          </div>
          {selectedImages.length > 1 && <div className="pd-thumbs" role="tablist" aria-label="عکس‌های وسیله">{selectedImages.map((img, i) => <button key={`${img.imageUrl}-t${i}`} className={i === galleryIndex ? "pd-thumb active" : "pd-thumb"} style={{ backgroundImage: `url(${img.thumbUrl || img.imageUrl})` }} aria-label={`عکس ${(i + 1).toLocaleString("fa-IR")}`} onClick={() => goToImage(i)} />)}</div>}
          <div className="pd-info">
            <div className="pd-chips"><span className="pd-chip">{selected.category}</span><span className="pd-chip pd-chip-seller">فروشنده: {selected.sellerName}</span><span className="pd-chip pd-chip-condition">✦ {selected.condition}</span></div>
            <h2 id="modal-title">{selected.title}</h2>
            <div className="pd-price-row">
              <div className="pd-price-main">
                <div className="price"><strong>{formatPrice(selected.price)}</strong><span>تومان</span></div>
                {selected.newPrice ? <s className="pd-new-price" dir="rtl">نو: {formatPrice(selected.newPrice)} تومان</s> : null}
                {selected.newPrice && selected.newPrice > selected.price ? <span className="pd-discount">٪{Math.round((1 - selected.price / selected.newPrice) * 100).toLocaleString("fa-IR")} ارزون‌تر از نو</span> : null}
              </div>
              <span className={selected.available ? "pd-status available" : selected.reservedAt ? "pd-status reserved" : "pd-status sold"}>{selected.available ? "🟢 موجود" : selected.reservedAt ? "🟠 رزرو شده" : "⚪ واگذار شده"}</span>
            </div>
            <p className="pd-desc">{selected.description}</p>
            {selected.kind === "group" && <div className="group-members"><h4>این بسته شامل چیست؟</h4>{selected.members.map(member => <div className="group-member" key={member.id}><div className="group-member-head"><img src={member.thumbUrl || member.imageUrl} alt={member.title} /><div><strong>{member.title}</strong><span>{member.category} · {formatPrice(member.price)} تومان</span><p>{member.description}</p></div></div>{member.images.length > 1 && <div className="group-member-images">{member.images.map((img, i) => <img key={`${img.imageUrl}-${i}`} src={img.thumbUrl || img.imageUrl} alt={`${member.title} — عکس ${(i + 1).toLocaleString("fa-IR")}`} />)}</div>}{member.specs.length > 0 && <div className="group-member-specs">{member.specs.map((spec, i) => <span key={`${spec.key}-${i}`}><b>{spec.key}</b>{spec.value}</span>)}</div>}</div>)}</div>}
            {selected.specs?.length > 0 && <div className="pd-specs"><h4>مشخصات</h4>{selected.specs.map((s, i) => <div className="pd-spec-row" key={`${s.key}-${i}`}><span className="pd-spec-key">{s.key}</span><span className="pd-spec-value">{s.value}</span></div>)}</div>}
            {selected.available
              ? <button className="button button-primary pd-cta" onClick={() => setView("inquiry")}>می‌خوامش! شماره‌ام رو بذار ☎ <ArrowLeft size={18} /></button>
              : <div className="pd-status-note">{selected.reservedAt ? "این وسیله فعلاً توسط شخص دیگری رزرو شده؛ اگه آزاد شد دوباره اینجا دیده می‌شه." : "این وسیله واگذار شده و دیگه موجود نیست."}</div>}
          </div>
        </>
        : <>
          <div className="modal-top"><img src={selectedImages[0]?.imageUrl || selected.imageUrl} alt={selected.title} /><div><span>این یکی رو پسندیدی؟</span><h2 id="modal-title">{selected.title}</h2><p>{formatPrice(selected.price)} تومان</p></div></div>
          <div className="modal-body">
            {view === "inquiry" && selected.available && <button className="pd-back" onClick={() => setView("details")}><ChevronRight size={16} /> برگشت به جزئیات</button>}
            <h3>بذار باهات تماس بگیرم ☎</h3>
            <p>فقط شماره موبایلت رو بذار. برای هماهنگی این وسیله باهات تماس می‌گیرم؛ همین و بس!</p>
            <form onSubmit={submitInterest}><label htmlFor="phone">شماره موبایل شما</label><input id="phone" type="tel" inputMode="tel" dir="ltr" placeholder="0912 123 4567" value={phone} onChange={e => setPhone(e.target.value)} required autoFocus /><label htmlFor="buyer-name">نام شما <span className="optional-tag">(اختیاری)</span></label><input id="buyer-name" type="text" className="optional-field" maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً سارا" /><label htmlFor="buyer-message">یه پیام کوتاه <span className="optional-tag">(اختیاری)</span></label><textarea id="buyer-message" className="optional-field" rows={2} maxLength={500} value={message} onChange={e => setMessage(e.target.value)} placeholder="مثلاً: عصرها بعد از ۶ پاسخ می‌دم..." /><div className="privacy-note"><span>🔒</span> اطلاعات‌ت فقط برای هماهنگی همین وسیله استفاده می‌شه.</div>{error && <div className="form-error" role="alert">{error}</div>}<button className="button button-primary modal-submit" disabled={submitting}>{submitting ? "در حال ثبت..." : "شماره‌م رو ثبت کن"}<ArrowLeft size={18} /></button></form>
          </div>
        </>}
    </div></div>}
  </div>;
}
