-- خط پایه‌ی اسکیمای دوباره — معادل src/db/schema.ts
-- توسط scripts/apply-migrations.mjs اعمال می‌شود (هر فایل یک‌بار، داخل یک تراکنش)

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  thumb_url TEXT,
  category TEXT NOT NULL DEFAULT 'متفرقه',
  condition TEXT NOT NULL DEFAULT 'تمیز و سالم',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  reserved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- مقاوم در برابر دیتابیس‌هایی که قبلاً با drizzle-kit push ساخته شده‌اند
ALTER TABLE products ADD COLUMN IF NOT EXISTS thumb_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_title TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS message TEXT;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
