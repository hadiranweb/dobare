-- گروه فروش: چند کالای هم‌فروشنده در یک کارت و یک تراکنش رزرو/فروش
CREATE TABLE "product_groups" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "price" integer NOT NULL,
  "usd_ratio" double precision NOT NULL,
  "seller_key" text NOT NULL DEFAULT 'primary',
  "available" boolean NOT NULL DEFAULT true,
  "reserved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "product_group_items" (
  "group_id" integer NOT NULL REFERENCES "product_groups"("id") ON DELETE CASCADE,
  "product_id" integer NOT NULL UNIQUE REFERENCES "products"("id") ON DELETE RESTRICT,
  "position" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("group_id", "product_id")
);

ALTER TABLE "inquiries" ADD COLUMN "group_id" integer REFERENCES "product_groups"("id") ON DELETE SET NULL;
