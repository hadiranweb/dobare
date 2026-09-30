import type { NextConfig } from "next";

// خروجی standalone برای اجرای سبک (لیارا Next و ایمیج داکر VPS)
const nextConfig: NextConfig = {
  output: "standalone",
  // pg ماژول بومی/CJS است و نباید باندل شود
  serverExternalPackages: ["pg", "sharp"],
  // اسکریپت مایگریشن و فایل‌های SQL باید در خروجی standalone حاضر باشند
  outputFileTracingIncludes: {
    "/**": ["./scripts/apply-migrations.mjs", "./src/db/migrations/**"],
  },
};

export default nextConfig;
