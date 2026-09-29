"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, LogOut, Plus, Trash2, X } from "lucide-react";
import "./admin.css";

type Product = { id: number; title: string; description: string; price: number; imageUrl: string; category: string; condition: string; available: boolean };
type Inquiry = { id: number; productTitle: string; phone: string; name: string | null; message: string | null; createdAt: string };
type Form = Omit<Product, "id">;
const blank: Form = { title: "", description: "", price: 0, imageUrl: "", category: "خانه و دکور", condition: "تمیز و سالم", available: true };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [tab, setTab] = useState<"products" | "inquiries">("products");
  const [editing, setEditing] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    if (res.ok) { const data = await res.json(); setProducts(data.products); setInquiries(data.inquiries); setLoggedIn(true); }
    else setLoggedIn(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage("");
    try { const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setPassword(""); await load(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "خطا در ورود"); }
    finally { setBusy(false); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage("");
    try { const res = await fetch("/api/admin/data", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ...(editing ? { id: editing } : {}) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setFormOpen(false); setEditing(null); setForm(blank); await load(); setMessage("کالا با موفقیت ذخیره شد."); }
    catch (err) { setMessage(err instanceof Error ? err.message : "ذخیره نشد."); }
    finally { setBusy(false); }
  };
  const remove = async (id: number) => {
    if (!window.confirm("این کالا حذف شود؟ درخواست‌های ثبت‌شده باقی می‌مانند.")) return;
    const res = await fetch(`/api/admin/data?id=${id}`, { method: "DELETE" });
    if (res.ok) { await load(); setMessage("کالا حذف شد."); } else setMessage("حذف کالا ممکن نشد.");
  };
  const toggleAvailable = async (p: Product) => { await fetch("/api/admin/data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, available: !p.available }) }); await load(); };
  const logout = async () => { await fetch("/api/admin/login", { method: "DELETE" }); setLoggedIn(false); };
  const edit = (p: Product) => { setForm({ title: p.title, description: p.description, price: p.price, imageUrl: p.imageUrl, category: p.category, condition: p.condition, available: p.available }); setEditing(p.id); setFormOpen(true); setMessage(""); };
  const add = () => { setForm(blank); setEditing(null); setFormOpen(true); setMessage(""); };

  return <main className="admin-page"><div className="admin-container"><div className="admin-top"><a href="/" className="admin-logo">↻ دوباره<span>.</span> <small>مدیریت</small></a><a href="/" className="admin-back"><ArrowRight size={16} /> برگشت به ویترین</a></div>
    {loggedIn === null ? <div className="admin-login">در حال بارگذاری...</div> : !loggedIn ? <div className="admin-login"><div className="admin-lock">✳</div><h1>سلام، صاحبِ دوباره!</h1><p>برای مدیریت وسایل و دیدن درخواست‌ها، رمزت رو وارد کن.</p><form onSubmit={login}><label>رمز مدیریت</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز عبور" required /><button disabled={busy} className="admin-main-button">{busy ? "یک لحظه..." : "ورود به مدیریت"} <ArrowRight size={18} /></button></form>{message && <div className="admin-message error">{message}</div>}</div> : <div className="admin-dashboard"><div className="admin-heading"><div><div className="section-kicker">گوشه‌ی مخصوص صاحب‌خونه</div><h1>مدیریت دوباره</h1><p>وسایل و درخواست‌ها، همه همین‌جا دم دستت هستن.</p></div><button className="admin-logout" onClick={logout}><LogOut size={17} /> خروج</button></div><div className="admin-stats"><div><strong>{products.length.toLocaleString("fa-IR")}</strong><span>کل وسایل</span></div><div><strong>{products.filter(p => p.available).length.toLocaleString("fa-IR")}</strong><span>وسایل موجود</span></div><div><strong>{inquiries.length.toLocaleString("fa-IR")}</strong><span>درخواست تماس</span></div></div><div className="admin-toolbar"><div className="admin-tabs"><button className={tab === "products" ? "selected" : ""} onClick={() => setTab("products")}>وسایل من</button><button className={tab === "inquiries" ? "selected" : ""} onClick={() => setTab("inquiries")}>درخواست‌ها <span>{inquiries.length.toLocaleString("fa-IR")}</span></button></div>{tab === "products" && <button className="admin-main-button add-button" onClick={add}><Plus size={18} /> افزودن وسیله</button>}</div>{message && !formOpen && <div className="admin-message">{message}</div>}
    {tab === "products" ? <div className="admin-list">{products.map(p => <div className="admin-item" key={p.id}><img src={p.imageUrl} alt={p.title} /><div className="admin-item-detail"><strong>{p.title}</strong><span>{p.category} · {p.price.toLocaleString("fa-IR")} تومان</span></div><button className={p.available ? "admin-status available" : "admin-status"} onClick={() => toggleAvailable(p)}>{p.available ? "موجود" : "واگذار شده"}</button><button className="admin-edit" onClick={() => edit(p)}>ویرایش</button><button className="admin-delete" aria-label={`حذف ${p.title}`} onClick={() => remove(p.id)}><Trash2 size={17} /></button></div>)}{products.length === 0 && <div className="admin-empty">هنوز وسیله‌ای ثبت نشده. اولین وسیله رو اضافه کن!</div>}</div> : <div className="admin-list">{inquiries.map(i => <div className="admin-inquiry" key={i.id}><div className="inquiry-icon">☎</div><div><strong>{i.productTitle}</strong>{i.name && <span className="inquiry-name">{i.name}</span>}{i.message && <span className="inquiry-message">{i.message}</span>}<span>{new Date(i.createdAt).toLocaleString("fa-IR")}</span></div><a href={`tel:${i.phone}`} dir="ltr">{i.phone} ☎</a></div>)}{inquiries.length === 0 && <div className="admin-empty">هنوز کسی شماره‌ای ثبت نکرده.</div>}</div>}</div>}
  </div>
  {formOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setFormOpen(false); }}><div className="admin-form-modal"><button className="modal-close" onClick={() => setFormOpen(false)} aria-label="بستن"><X size={20} /></button><h2>{editing ? "ویرایش وسیله" : "یه وسیله‌ی تازه"}</h2><p>مشخصات وسیله رو اینجا بنویس تا توی ویترین دیده بشه.</p><form onSubmit={save}><label>نام وسیله<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثلاً صندلی چوبی" /></label><label>آدرس عکس<input required type="url" dir="ltr" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/photo.jpg" /></label><div className="admin-form-row"><label>قیمت (تومان)<input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></label><label>دسته‌بندی<input required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="خانه و دکور" /></label></div><label>وضعیت وسیله<input value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} placeholder="تمیز و سالم" /></label><label>توضیح کوتاه<textarea required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="یه چند خط خودمونی درباره‌ی این وسیله..." /></label><label className="admin-checkbox"><input type="checkbox" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} /> این وسیله موجود است</label>{message && <div className="admin-message error">{message}</div>}<button disabled={busy} className="admin-main-button admin-save">{busy ? "در حال ذخیره..." : "ذخیره وسیله"} <Check size={18} /></button></form></div></div>}</main>;
}
