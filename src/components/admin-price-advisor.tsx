"use client";

import { useMemo, useState } from "react";
import { calculateUsedPrice, type PricingField, usedPricingConfig as config } from "@/lib/pricing-advisor";

function defaultValues(categoryKey: string, currentRcv: string) {
  const values: Record<string, string | number> = {};
  for (const [key, field] of Object.entries(config.universalFields)) values[key] = field.default ?? "";
  values.rcv = Number(currentRcv) > 0 ? Number(currentRcv) : "";
  const category = config.categories[categoryKey];
  for (const moduleKey of category?.modules || []) {
    for (const [key, field] of Object.entries(config.modules[moduleKey]?.fields || {})) values[key] = field.default ?? "";
  }
  return values;
}

function FieldControl({ id, field, value, onChange }: { id: string; field: PricingField; value: string | number; onChange: (value: string | number) => void }) {
  return <label className="advisor-field"><span>{field.label}{field.unit ? ` (${field.unit})` : ""}</span>{field.type === "select"
    ? <select value={String(value)} onChange={e => onChange(e.target.value)}>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    : <input type="number" min={field.min} max={field.max} step={field.step || 1} value={value} onChange={e => onChange(e.target.value)} />}{(field.help || field.note) && <small>{field.help || field.note}</small>}</label>;
}

export function AdminPriceAdvisor({ categoryKey, currentNewPrice, onApply }: { categoryKey: string; currentNewPrice: string; onApply: (price: number, newPrice: number) => void }) {
  const [values, setValues] = useState<Record<string, string | number>>(() => categoryKey ? defaultValues(categoryKey, currentNewPrice) : {});
  const [bonuses, setBonuses] = useState<string[]>([]);
  const category = categoryKey ? config.categories[categoryKey] : null;

  const result = useMemo(() => calculateUsedPrice(categoryKey, values, bonuses), [categoryKey, values, bonuses]);

  const update = (key: string, value: string | number) => setValues(current => ({ ...current, [key]: value }));
  const baseFields = Object.entries(config.universalFields).filter(([, field]) => field.role === "base" || field.section === "base" || field.section === "condition");
  const marketFields = Object.entries(config.universalFields).filter(([, field]) => field.section === "market");

  return <details className="price-advisor"><summary><span>✦ پیشنهاد هوشمند قیمت دست‌دوم</span><small>اختیاری — قیمت فعلی را فقط با تأیید شما تغییر می‌دهد</small></summary><div className="advisor-body">{category ? <><div className="advisor-grid">{baseFields.map(([key, field]) => <FieldControl key={key} id={key} field={field} value={values[key] ?? field.default ?? ""} onChange={value => update(key, value)} />)}</div>{category.modules.map(moduleKey => { const module = config.modules[moduleKey]; return <section className="advisor-section" key={moduleKey}><h4>{module.label}</h4>{module.note && <p>{module.note}</p>}<div className="advisor-grid">{Object.entries(module.fields).map(([key, field]) => <FieldControl key={key} id={key} field={{ ...field, label: field.label.replace("{{profile.usageLabel}}", category.profile.usageLabel) }} value={values[key] ?? field.default ?? ""} onChange={value => update(key, value)} />)}</div></section>; })}<section className="advisor-section"><h4>بازار و شرایط فروش</h4><div className="advisor-grid">{marketFields.map(([key, field]) => <FieldControl key={key} id={key} field={field} value={values[key] ?? field.default ?? ""} onChange={value => update(key, value)} />)}</div></section>{category.bonuses.length > 0 && <section className="advisor-section"><h4>مزیت‌ها و متعلقات</h4><div className="advisor-bonuses">{category.bonuses.map(bonus => <label key={bonus.id}><input type="checkbox" checked={bonuses.includes(bonus.id)} onChange={e => setBonuses(current => e.target.checked ? [...current, bonus.id] : current.filter(id => id !== bonus.id))} /> {bonus.label} <small>+٪{Math.round(bonus.bonus * 100).toLocaleString("fa-IR")}</small></label>)}</div></section>}{result ? <div className="advisor-result"><div><span>کف مذاکره</span><strong>{result.floor.toLocaleString("fa-IR")}</strong><small>تومان</small></div><div className="recommended"><span>ارزش منصفانه</span><strong>{result.fair.toLocaleString("fa-IR")}</strong><small>تومان</small></div><div><span>قیمت پیشنهادی آگهی</span><strong>{result.list.toLocaleString("fa-IR")}</strong><small>تومان</small></div><p>ضریب نهایی: ٪{(result.coefficient * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از قیمت نو معادل امروز</p><div className="advisor-actions"><button type="button" className="admin-action" onClick={() => onApply(result.fair, result.newEquivalent)}>اعمال ارزش منصفانه</button><button type="button" className="admin-main-button" onClick={() => onApply(result.list, result.newEquivalent)}>اعمال قیمت آگهی</button></div></div> : <div className="advisor-empty">برای محاسبه، «قیمت نو معادل امروز» را وارد کنید.</div>}</> : <div className="advisor-empty">ابتدا دسته‌بندی محصول را از بالای فرم انتخاب کنید.</div>}</div></details>;
}
