import type { NextConfig } from "next";

// خروجی standalone برای اجرای سبک (لیارا Next و ایمیج داکر VPS)
const nextConfig: NextConfig = {
  output: "standalone",
  // build لیارا فقط کد برنامه را typecheck می‌کند؛ typecheck کامل (شامل drizzle.config) در CI اجرا می‌شود.
  typescript: { tsconfigPath: "tsconfig.build.json" },
  // pg ماژول بومی/CJS است و نباید باندل شود
  serverExternalPackages: ["pg", "sharp"],
  // اسکریپت مایگریشن، فایل‌های SQL و باینری‌های بومی sharp باید در خروجی standalone حاضر باشند
  outputFileTracingIncludes: {
    "/**": [
      "./scripts/apply-migrations.mjs",
      "./src/db/migrations/**",
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
    ],
  },
};

export default nextConfig;
