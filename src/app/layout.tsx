import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const title = "دوباره | چیزهای خوب، یک زندگی تازه";
const description = "یک ویترین کوچک و صمیمی برای چیزهای دوست‌داشتنی که آماده‌اند به خانه‌ی تازه‌ای بروند.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://dobare.liara.run"),
  title,
  description,
  applicationName: "دوباره",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/logo-monochrome-light.svg", type: "image/svg+xml" },
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/brand/logo-monochrome-light.svg",
    apple: [{ url: "/brand/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title,
    description,
    siteName: "دوباره",
    type: "website",
    locale: "fa_IR",
    images: [{ url: "/brand/opengraph-logo.png", width: 1200, height: 630, alt: "نشان دوباره" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/brand/opengraph-logo.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#faf8f2",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
