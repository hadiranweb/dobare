-- عکس‌های چندگانه‌ی هر کالا (تا ۱۰ عکس) — عکس اول = کاور (در ستون‌های image_url/thumb_url محصولات همیشه عکس اول می‌ماند)
CREATE TABLE "product_images" (
  "id" serial PRIMARY KEY,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "image_url" text NOT NULL,
  "thumb_url" text,
  "position" integer NOT NULL DEFAULT 0
);

CREATE INDEX "product_images_product_id_idx" ON "product_images" ("product_id");

-- انتقال عکس فعلی هر کالا به‌عنوان عکس اول
INSERT INTO "product_images" ("product_id", "image_url", "thumb_url", "position")
  SELECT "id", "image_url", "thumb_url", 0 FROM "products" WHERE "image_url" <> '';
