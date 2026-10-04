-- اتصال هر کالا و درخواست خرید به فروشنده‌ی انتخاب‌شده در داشبورد
-- اطلاعات نام و شماره در ENV لیارا می‌ماند و داخل دیتابیس ذخیره نمی‌شود.
ALTER TABLE "products" ADD COLUMN "seller_key" text NOT NULL DEFAULT 'primary';
ALTER TABLE "inquiries" ADD COLUMN "seller_key" text NOT NULL DEFAULT 'primary';
