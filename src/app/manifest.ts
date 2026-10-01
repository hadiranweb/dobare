import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "دوباره | چیزهای خوب، یک زندگی تازه",
    short_name: "دوباره",
    description: "ویترین آنلاین وسایل دست دوم دوباره",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f2",
    theme_color: "#faf8f2",
    lang: "fa",
    dir: "rtl",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
