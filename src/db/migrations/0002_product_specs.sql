-- مشخصات تکمیلی کالا: قیمت نو (برای مقایسه) و جدول مشخصات دلخواه (رنگ، ابعاد، کارکرد و ...)
ALTER TABLE "products" ADD COLUMN "new_price" integer;
ALTER TABLE "products" ADD COLUMN "specs" jsonb;
