import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// آدرس دیتابیس از متغیر محیطی خوانده می‌شود (روی سرور توسط docker-compose تزریق می‌شود)
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
