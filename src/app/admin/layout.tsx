import type { ReactNode } from "react";

// صفحه‌ی ادمین همیشه تازه از سرور بیاید — هیچ کشی (مرورگر/CDN) روی HTML آن نمی‌نشیند
// تا بعد از هر دیپلوی، مرورگر هرگز به فایل‌های JS قدیمی اشاره نکند
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
