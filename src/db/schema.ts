import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// مشخصات تکمیلی کالا — قیمت نو (اختیاری) و جدول مشخصات { key, value }
export type ProductSpec = { key: string; value: string };

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  // قیمت نو‌ی محصول (اختیاری) — برای نمایش مقایسه‌ای «چند ارزون‌تر از نو» به خریدار
  newPrice: integer("new_price"),
  // جدول مشخصات دلخواه: سطرهای «عنوان/مقدار» مثل رنگ، ابعاد، کارکرد — ترتیب حفظ می‌شود
  specs: jsonb("specs").$type<ProductSpec[]>(),
  imageUrl: text("image_url").notNull(), // کاور = عکس اول
  thumbUrl: text("thumb_url"),
  category: text("category").notNull().default("متفرقه"),
  condition: text("condition").notNull().default("تمیز و سالم"),
  available: boolean("available").notNull().default(true),
  reservedAt: timestamp("reserved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// عکس‌های هر کالا (تا ۱۰ عکس) — position صفر = کاور
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  thumbUrl: text("thumb_url"),
  position: integer("position").notNull().default(0),
});

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productTitle: text("product_title").notNull(),
  phone: text("phone").notNull(),
  name: text("name"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
