type BrandMarkProps = {
  className?: string;
  priority?: boolean;
};

/**
 * نشان رسمی دوباره با نسخه‌ی مناسب زمینه‌ی روشن/تیره.
 * نسخه‌ی تیره از طریق prefers-color-scheme آماده است و با پیاده‌سازی تم نیز هماهنگ می‌ماند.
 */
export function BrandMark({ className = "", priority = false }: BrandMarkProps) {
  return (
    <picture className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <source media="(prefers-color-scheme: dark)" srcSet="/brand/logo-monochrome-dark.svg" />
      <img
        src="/brand/logo-monochrome-light.svg"
        alt=""
        width="800"
        height="800"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
