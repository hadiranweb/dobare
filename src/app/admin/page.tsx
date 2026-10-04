"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, ChevronRight, LogOut, Plus, Trash2, X } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import "./admin.css";

type ProductImage = { imageUrl: string; thumbUrl: string | null };
type ProductSpec = { key: string; value: string };
type Seller = { key: "primary" | "secondary"; name: string };
type Product = { id: number; title: string; description: string; price: number; sellerKey: Seller["key"]; usdRatio: number | null; newPrice: number | null; specs: ProductSpec[]; imageUrl: string; thumbUrl: string | null; images: ProductImage[]; category: string; condition: string; available: boolean; reservedAt: string | null };
type Inquiry = { id: number; productTitle: string; sellerKey: Seller["key"]; phone: string; name: string | null; message: string | null; createdAt: string };
type PriceMode = "toman" | "ratio";
type Form = { title: string; description: string; price: number; sellerKey: Seller["key"]; usdRatio: string; priceMode: PriceMode; newPrice: string; specs: { key: string; value: string }[]; category: string; condition: string; available: boolean; images: { imageUrl: string; thumbUrl: string }[] };
const MAX_IMAGES = 15;
const MAX_SPECS = 15;
const blank: Form = { title: "", description: "", price: 0, sellerKey: "primary", usdRatio: "", priceMode: "toman", newPrice: "", specs: [], images: [], category: "خانه و دکور", condition: "تمیز و سالم", available: true };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([{ key: "primary", name: "فروشنده دوباره" }]);
  const [tab, setTab] = useState<"products" | "inquiries">("products");
  const [editing, setEditing] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reserveHours, setReserveHours] = useState(6);
  const [now, setNow] = useState(() => Date.now());
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [tgMessage, setTgMessage] = useState("");
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [rateDraft, setRateDraft] = useState("");
  const [rateBusy, setRateBusy] = useState(false);
  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/data?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) { const data = await res.json(); setProducts(data.products); setInquiries(data.inquiries); setSellers(Array.isArray(data.sellers) && data.sellers.length ? data.sellers : [{ key: "primary", name: "فروشنده دوباره" }]); setReserveHours(typeof data.reservationHours === "number" ? data.reservationHours : 6); setUsdRate(typeof data.usdRate === "number" ? data.usdRate : null); setRateDraft(typeof data.usdRate === "number" ? String(data.usdRate) : ""); setLoggedIn(true); }
    else { setLoggedIn(false); if (res.status === 500) setMessage("ورود درست بود، ولی پنل نمی‌تواند به دیتابیس وصل شود. متغیر DATABASE_URL را در تنظیمات برنامه (کنسول لیارا) بررسی کنید."); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/data?t=${Date.now()}`, { cache: "no-store", signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setProducts(data.products);
        setInquiries(data.inquiries);
        setSellers(Array.isArray(data.sellers) && data.sellers.length ? data.sellers : [{ key: "primary", name: "فروشنده دوباره" }]);
        setReserveHours(typeof data.reservationHours === "number" ? data.reservationHours : 6);
        setUsdRate(typeof data.usdRate === "number" ? data.usdRate : null);
        setRateDraft(typeof data.usdRate === "number" ? String(data.usdRate) : "");
        setLoggedIn(true);
      })
      .catch((error: unknown) => { if (controller.signal.aborted) return; setLoggedIn(false); if (error instanceof Error && error.message === "500") setMessage("ورود درست بود، ولی پنل نمی‌تواند به دیتابیس وصل شود. متغیر DATABASE_URL را در تنظیمات برنامه (کنسول لیارا) بررسی کنید."); });
    return () => controller.abort();
  }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage("");
    try { const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setPassword(""); await load(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "خطا در ورود"); }
    finally { setBusy(false); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage("");
    try { const payload = { ...form, usdRatio: form.priceMode === "ratio" ? form.usdRatio : null, ...(editing ? { id: editing } : {}) }; const res = await fetch("/api/admin/data", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setFormOpen(false); setEditing(null); setForm(blank); await load(); setMessage("کالا با موفقیت ذخیره شد."); }
    catch (err) { setMessage(err instanceof Error ? err.message : "ذخیره نشد."); }
    finally { setBusy(false); }
  };
  const remove = async (id: number) => {
    if (!window.confirm("این کالا حذف شود؟ درخواست‌های ثبت‌شده باقی می‌مانند.")) return;
    const res = await fetch(`/api/admin/data?id=${id}`, { method: "DELETE" });
    if (res.ok) { await load(); setMessage("کالا حذف شد."); } else setMessage("حذف کالا ممکن نشد.");
  };
  const setStatus = async (id: number, action: "sell" | "open") => {
    const res = await fetch("/api/admin/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (res.ok) { await load(); setMessage(action === "sell" ? "به‌عنوان واگذار شده علامت خورد." : "وسیله آزاد شد و دوباره قابل خرید است."); }
    else setMessage("تغییر وضعیت ممکن نشد.");
  };
  const remainingLabel = (iso: string) => {
    const ms = new Date(iso).getTime() + reserveHours * 3600000 - now;
    if (ms <= 0) return "در حال آزادسازی";
    const h = Math.floor(ms / 3600000);
    const m = Math.ceil((ms % 3600000) / 60000);
    return h >= 1 ? `~${h.toLocaleString("fa-IR")} ساعت مانده` : `${m.toLocaleString("fa-IR")} دقیقه مانده`;
  };
  const logout = async () => { await fetch("/api/admin/login", { method: "DELETE" }); setLoggedIn(false); };
  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault(); setRateBusy(true); setMessage("");
    try {
      const rate = Number(rateDraft);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error("میانگین دلار باید عددی بزرگ‌تر از صفر باشد.");
      const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usdRate: rate }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ذخیره‌ی نرخ ممکن نشد.");
      await load();
      setMessage(`نرخ دلار ذخیره شد و قیمت ${Number(data.updatedCount || 0).toLocaleString("fa-IR")} کالا به‌روز شد.`);
    } catch (err) { setMessage(err instanceof Error ? err.message : "ذخیره‌ی نرخ ممکن نشد."); }
    finally { setRateBusy(false); }
  };
  const tgAction = async (action: "set" | "info" | "delete") => {
    setTgMessage("در حال ارتباط با تلگرام...");
    try {
      const res = await fetch("/api/admin/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await res.json();
      setTgMessage(data.message || data.error || "پاسخ نامشخص.");
    } catch { setTgMessage("ارتباط برقرار نشد."); }
  };
  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const room = MAX_IMAGES - form.images.length;
    if (room <= 0) { setMessage(`حداکثر ${MAX_IMAGES.toLocaleString("fa-IR")} عکس برای هر وسیله مجاز است.`); return; }
    const chosen = files.slice(0, room);
    setMessage(files.length > room ? `فقط ${room.toLocaleString("fa-IR")} عکس اضافه شد (سقف ${MAX_IMAGES.toLocaleString("fa-IR")} عکس).` : "");
    setUploading(true);
    try {
      const uploaded: { imageUrl: string; thumbUrl: string }[] = [];
      for (const file of chosen) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "آپلود نشد.");
        uploaded.push({ imageUrl: data.image, thumbUrl: data.thumb || "" });
      }
      setForm(f => ({ ...f, images: [...f.images, ...uploaded] }));
      setShowUrlInput(false);
    } catch (err) { setMessage(err instanceof Error ? err.message : "آپلود نشد."); }
    finally { setUploading(false); }
  };
  const removeImage = (index: number) => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  const moveImage = (index: number, dir: -1 | 1) => setForm(f => {
    const j = index + dir;
    if (j < 0 || j >= f.images.length) return f;
    const images = [...f.images];
    [images[index], images[j]] = [images[j], images[index]];
    return { ...f, images };
  });
  const addUrlImage = () => {
    const url = urlDraft.trim();
    if (!/^https?:\/\//.test(url)) { setMessage("پیوند عکس باید با http یا https شروع شود."); return; }
    if (form.images.length >= MAX_IMAGES) { setMessage(`حداکثر ${MAX_IMAGES.toLocaleString("fa-IR")} عکس مجاز است.`); return; }
    setForm(f => ({ ...f, images: [...f.images, { imageUrl: url, thumbUrl: "" }] }));
    setUrlDraft(""); setShowUrlInput(false); setMessage("");
  };
  const edit = (p: Product) => { setForm({ title: p.title, description: p.description, price: p.price, sellerKey: p.sellerKey || "primary", usdRatio: p.usdRatio != null ? String(p.usdRatio) : "", priceMode: p.usdRatio != null ? "ratio" : "toman", newPrice: p.newPrice != null ? String(p.newPrice) : "", specs: (p.specs || []).map(s => ({ key: s.key, value: s.value })), images: (p.images?.length ? p.images : [{ imageUrl: p.imageUrl, thumbUrl: p.thumbUrl }]).map(i => ({ imageUrl: i.imageUrl, thumbUrl: i.thumbUrl || "" })), category: p.category, condition: p.condition, available: p.available }); setEditing(p.id); setFormOpen(true); setMessage(""); };
  const add = () => { setForm(blank); setEditing(null); setFormOpen(true); setMessage(""); };

  return <main className="admin-page"><div className="admin-container"><div className="admin-top"><Link href="/" className="admin-logo" aria-label="دوباره، برگشت به ویترین"><BrandMark priority /><span className="admin-wordmark">دوباره<span className="admin-logo-dot">.</span></span><small>مدیریت</small></Link><Link href="/" className="admin-back"><ArrowRight size={16} /> برگشت به ویترین</Link></div>
    {loggedIn === null ? <div className="admin-login">در حال بارگذاری...</div> : !loggedIn ? <div className="admin-login"><div className="admin-lock"><BrandMark priority /></div><h1>سلام، صاحبِ دوباره!</h1><p>برای مدیریت وسایل و دیدن درخواست‌ها، رمزت رو وارد کن.</p><form onSubmit={login}><label>رمز مدیریت</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز عبور" required /><button disabled={busy} className="admin-main-button">{busy ? "یک لحظه..." : "ورود به مدیریت"} <ArrowRight size={18} /></button></form>{message && <div className="admin-message error">{message}</div>}</div> : <div className="admin-dashboard"><div className="admin-heading"><div><div className="section-kicker">گوشه‌ی مخصوص صاحب‌خونه</div><h1>مدیریت دوباره</h1><p>وسایل و درخواست‌ها، همه همین‌جا دم دستت هستن.</p></div><button className="admin-logout" onClick={logout}><LogOut size={17} /> خروج</button></div><div className="admin-stats"><div><strong>{products.length.toLocaleString("fa-IR")}</strong><span>کل وسایل</span></div><div><strong>{products.filter(p => p.available).length.toLocaleString("fa-IR")}</strong><span>وسایل موجود</span></div><div><strong>{inquiries.length.toLocaleString("fa-IR")}</strong><span>درخواست تماس</span></div></div><div className="admin-rate"><div className="rate-info"><strong>💵 میانگین قیمت دلار هفته</strong><span>{usdRate ? `نرخ فعلی: ${usdRate.toLocaleString("fa-IR")} تومان` : "هنوز نرخی ثبت نشده؛ پیش از ثبت کالا نرخ را وارد کنید."}</span></div><form className="rate-form" onSubmit={saveRate}><input required type="number" min="1" step="1" value={rateDraft} onChange={e => setRateDraft(e.target.value)} placeholder="مثلاً ۹۵۰۰۰" aria-label="میانگین قیمت دلار به تومان" /><button className="admin-main-button" disabled={rateBusy}>{rateBusy ? "در حال محاسبه..." : "ذخیره و به‌روزرسانی قیمت‌ها"}</button></form></div><div className="admin-telegram"><div className="tg-info"><strong>🤖 بات تلگرام</strong><span>مدیریت با پیام و دکمه — بعد از تنظیم متغیرها در لیارا، «اتصال بات» را بزنید</span></div><div className="tg-actions"><button className="admin-action" onClick={() => tgAction("set")}>اتصال بات</button><button className="admin-action" onClick={() => tgAction("info")}>وضعیت</button><button className="admin-action warn" onClick={() => tgAction("delete")}>قطع اتصال</button></div>{tgMessage && <div className="tg-message">{tgMessage}</div>}</div><div className="admin-toolbar"><div className="admin-tabs"><button className={tab === "products" ? "selected" : ""} onClick={() => setTab("products")}>وسایل من</button><button className={tab === "inquiries" ? "selected" : ""} onClick={() => setTab("inquiries")}>درخواست‌ها <span>{inquiries.length.toLocaleString("fa-IR")}</span></button></div>{tab === "products" && <button className="admin-main-button add-button" onClick={add}><Plus size={18} /> افزودن وسیله</button>}</div>{message && !formOpen && <div className="admin-message">{message}</div>}
    {tab === "products" ? <div className="admin-list">{products.map(p => <div className="admin-item" key={p.id}><img src={p.imageUrl} alt={p.title} /><div className="admin-item-detail"><strong>{p.title}</strong><span>{p.category} · فروشنده: {sellers.find(s => s.key === p.sellerKey)?.name || "فروشنده دوباره"} · {p.price.toLocaleString("fa-IR")} تومان</span></div><span className={p.available ? "admin-status available" : p.reservedAt ? "admin-status reserved" : "admin-status sold"}>{p.available ? "موجود" : p.reservedAt ? `رزرو ⏳ ${remainingLabel(p.reservedAt)}` : "واگذار شده"}</span><div className="admin-item-actions">{p.available ? <button className="admin-action warn" onClick={() => setStatus(p.id, "sell")}>فروخته شد</button> : p.reservedAt ? <><button className="admin-action" onClick={() => setStatus(p.id, "open")}>آزاد کن</button><button className="admin-action warn" onClick={() => setStatus(p.id, "sell")}>فروخته شد</button></> : <button className="admin-action" onClick={() => setStatus(p.id, "open")}>بازگردانی</button>}</div><button className="admin-edit" onClick={() => edit(p)}>ویرایش</button><button className="admin-delete" aria-label={`حذف ${p.title}`} onClick={() => remove(p.id)}><Trash2 size={17} /></button></div>)}{products.length === 0 && <div className="admin-empty">هنوز وسیله‌ای ثبت نشده. اولین وسیله رو اضافه کن!</div>}</div> : <div className="admin-list">{inquiries.map(i => <div className="admin-inquiry" key={i.id}><div className="inquiry-icon">☎</div><div><strong>{i.productTitle}</strong><span>فروشنده: {sellers.find(s => s.key === i.sellerKey)?.name || "فروشنده دوباره"}</span>{i.name && <span className="inquiry-name">{i.name}</span>}{i.message && <span className="inquiry-message">{i.message}</span>}<span>{new Date(i.createdAt).toLocaleString("fa-IR")}</span></div><a href={`tel:${i.phone}`} dir="ltr">{i.phone} ☎</a></div>)}{inquiries.length === 0 && <div className="admin-empty">هنوز کسی شماره‌ای ثبت نکرده.</div>}</div>}</div>}
  </div>
  {formOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setFormOpen(false); }}><div className="admin-form-modal"><button className="modal-close" onClick={() => setFormOpen(false)} aria-label="بستن"><X size={20} /></button><h2>{editing ? "ویرایش وسیله" : "یه وسیله‌ی تازه"}</h2><p>مشخصات وسیله رو اینجا بنویس تا توی ویترین دیده بشه.</p><form onSubmit={save}><label>نام وسیله<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثلاً صندلی چوبی" /></label><label>فروشنده<select required value={form.sellerKey} onChange={e => setForm({ ...form, sellerKey: e.target.value as Seller["key"] })}>{sellers.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}</select><span className="seller-field-hint">نام و شماره‌ی فروشنده دوم از تنظیمات لیارا خوانده می‌شود.</span></label><div className="image-field"><label>عکس‌های وسیله <span className="image-count-tag">{form.images.length.toLocaleString("fa-IR")} از {MAX_IMAGES.toLocaleString("fa-IR")}</span></label><div className="picker-grid">{form.images.map((img, i) => <div className={i === 0 ? "picker-thumb cover" : "picker-thumb"} key={`${img.imageUrl}-${i}`}><img src={img.thumbUrl || img.imageUrl} alt={`عکس ${(i + 1).toLocaleString("fa-IR")} ${form.title}`} />{i === 0 && <span className="cover-tag">کاور</span>}<div className="picker-thumb-actions"><button type="button" aria-label="بردن به عنوان عکس کاور" disabled={i === 0} onClick={() => moveImage(i, -1)}><ChevronRight size={14} /></button><button type="button" aria-label={`حذف عکس ${(i + 1).toLocaleString("fa-IR")}`} onClick={() => removeImage(i)}><X size={13} /></button><button type="button" aria-label="بردن به انتهای فهرست" disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)}><ChevronLeft size={14} /></button></div></div>)}{form.images.length === 0 && <div className="picker-empty">عکسی انتخاب نشده — حداقل یک عکس لازم است</div>}</div><div className="picker-actions"><label className={uploading || form.images.length >= MAX_IMAGES ? "admin-action upload-btn busy" : "admin-action upload-btn"}>{uploading ? "در حال پردازش..." : form.images.length >= MAX_IMAGES ? "سقف عکس‌ها پر شده" : "افزودن عکس از دستگاه"}<input type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={pickFile} disabled={uploading || form.images.length >= MAX_IMAGES} /></label><button type="button" className="picker-toggle" onClick={() => setShowUrlInput(v => !v)}>{showUrlInput ? "بستن لینک" : "یا پیوند عکس"}</button></div><span className="picker-hint">اولین عکس، کاورِ کارت است — با فلش‌ها جابه‌جا کنید · عکس‌ها خودکار بهینه و فشرده می‌شوند (هر کدام حداکثر ۸ مگابایت)</span>{showUrlInput && <div className="picker-url-row"><input className="picker-url-input" type="url" dir="ltr" value={urlDraft} onChange={e => setUrlDraft(e.target.value)} placeholder="https://example.com/photo.jpg" /><button type="button" className="admin-action" onClick={addUrlImage} disabled={form.images.length >= MAX_IMAGES}>افزودن پیوند</button></div>}</div><div className="price-engine-field"><label>روش قیمت‌گذاری</label><div className="price-mode-toggle"><button type="button" className={form.priceMode === "toman" ? "selected" : ""} onClick={() => setForm({ ...form, priceMode: "toman" })}>قیمت تومانی</button><button type="button" className={form.priceMode === "ratio" ? "selected" : ""} onClick={() => setForm({ ...form, priceMode: "ratio" })}>نسبت دلاری</button></div></div><div className="admin-form-row"><label>{form.priceMode === "toman" ? "قیمت (تومان)" : "نسبت دلاری"}<input required type="number" min={form.priceMode === "toman" ? "1" : "0.000001"} step={form.priceMode === "toman" ? "1" : "any"} value={form.priceMode === "toman" ? form.price : form.usdRatio} onChange={e => form.priceMode === "toman" ? setForm({ ...form, price: Number(e.target.value) }) : setForm({ ...form, usdRatio: e.target.value })} placeholder={form.priceMode === "toman" ? "قیمت فروش" : "مثلاً ۲٫۵"} />{usdRate && form.priceMode === "toman" && form.price > 0 && <span className="price-live-hint">نسبت دلاری: {(form.price / usdRate).toLocaleString("fa-IR", { maximumFractionDigits: 6 })}</span>}{usdRate && form.priceMode === "ratio" && Number(form.usdRatio) > 0 && <span className="price-live-hint">قیمت نهایی: {Math.round(Number(form.usdRatio) * usdRate).toLocaleString("fa-IR")} تومان</span>}{!usdRate && <span className="price-live-hint price-warning">ابتدا نرخ دلار را در داشبورد ثبت کنید.</span>}</label><label>قیمت نو (اختیاری)<input type="number" min="0" value={form.newPrice} onChange={e => setForm({ ...form, newPrice: e.target.value })} placeholder="قیمتِ نو‌ی این وسیله" /></label></div><div className="admin-form-row"><label>دسته‌بندی<input required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="خانه و دکور" /></label><label>وضعیت ظاهری<input value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} placeholder="تمیز و سالم" /></label></div><label>توضیح کوتاه<textarea required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="یه چند خط خودمونی درباره‌ی این وسیله..." /></label><div className="specs-field"><label>جدول مشخصات (اختیاری) <span className="image-count-tag">{form.specs.length.toLocaleString("fa-IR")} سطر</span></label><span className="specs-hint">این جدول در پاپ‌آپ جزئیات کالا به خریدار نشان داده می‌شود — مثلاً رنگ، ابعاد، مقدار کارکرد و هر چیز دیگری.</span>{form.specs.map((row, i) => <div className="spec-row" key={i}><input value={row.key} maxLength={40} onChange={e => setForm(f => ({ ...f, specs: f.specs.map((r, j) => j === i ? { ...r, key: e.target.value } : r) }))} placeholder="عنوان — مثلاً رنگ" /><input value={row.value} maxLength={120} onChange={e => setForm(f => ({ ...f, specs: f.specs.map((r, j) => j === i ? { ...r, value: e.target.value } : r) }))} placeholder="مقدار — مثلاً سفید" /><button type="button" className="spec-remove" aria-label={`حذف سطر ${(i + 1).toLocaleString("fa-IR")}`} onClick={() => setForm(f => ({ ...f, specs: f.specs.filter((_, j) => j !== i) }))}><X size={14} /></button></div>)}<button type="button" className="admin-action spec-add" onClick={() => setForm(f => ({ ...f, specs: [...f.specs, { key: "", value: "" }] }))} disabled={form.specs.length >= MAX_SPECS}><Plus size={15} /> افزودن سطر</button></div><label className="admin-checkbox"><input type="checkbox" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} /> این وسیله موجود است</label>{message && <div className="admin-message error">{message}</div>}<button disabled={busy} className="admin-main-button admin-save">{busy ? "در حال ذخیره..." : "ذخیره وسیله"} <Check size={18} /></button></form></div></div>}</main>;
}
