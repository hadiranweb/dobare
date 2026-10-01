-- موتور قیمت: نسبت دلاری هر کالا (قیمت تومانی = نسبت × میانگین دلار هفته)
ALTER TABLE "products" ADD COLUMN "usd_ratio" double precision;
