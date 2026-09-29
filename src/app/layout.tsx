import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "دوباره | چیزهای خوب، یک زندگی تازه",
  description: "یک ویترین کوچک و صمیمی برای چیزهای دوست‌داشتنی که آماده‌اند به خانه‌ی تازه‌ای بروند.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
