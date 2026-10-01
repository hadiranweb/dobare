type BrandMarkProps = {
  className?: string;
  priority?: boolean;
};

/** نشان رسمی دوباره برای تم روشن فعلی سایت. */
export function BrandMark({ className = "", priority = false }: BrandMarkProps) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <img
        src="/brand/logo-monochrome-light.svg"
        alt=""
        width="732"
        height="666"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </span>
  );
}
