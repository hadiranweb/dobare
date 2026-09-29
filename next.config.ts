import type { NextConfig } from "next";

// خروجی standalone برای ایمیج داکر سبک (فقط فایل‌های لازم برای اجرا)
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
