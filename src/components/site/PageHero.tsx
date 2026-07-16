import type { CSSProperties, ReactNode } from "react";

interface PageHeroProps {
  image: string;
  imageAlt?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  align?: "left" | "center";
  size?: "xs" | "sm" | "md" | "lg";
  /** CSS gradient angle in degrees. Default 120. */
  gradientAngle?: number;
  /** Overlay opacity, 0-1. Default 0.85. */
  overlayOpacity?: number;
  /** eager for LCP heroes, lazy for below-the-fold. Default eager. */
  loading?: "eager" | "lazy";
  className?: string;
}

const SIZE_PAD: Record<NonNullable<PageHeroProps["size"]>, string> = {
  xs: "py-8 sm:py-10 md:py-14",
  sm: "py-10 sm:py-14 md:py-16",
  md: "py-14 sm:py-16 md:py-24",
  lg: "py-16 sm:py-20 md:py-32",
};

const TITLE_SIZE: Record<NonNullable<PageHeroProps["size"]>, string> = {
  xs: "text-2xl sm:text-3xl md:text-4xl",
  sm: "text-3xl sm:text-4xl md:text-5xl",
  md: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
  lg: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl",
};

export function PageHero({
  image,
  imageAlt = "",
  eyebrow,
  title,
  subtitle,
  children,
  actions,
  align = "left",
  size = "md",
  gradientAngle = 120,
  overlayOpacity = 0.85,
  loading = "eager",
  className = "",
}: PageHeroProps) {
  const alignCls = align === "center" ? "text-center mx-auto items-center" : "";
  const overlayStyle: CSSProperties = {
    background: `linear-gradient(${gradientAngle}deg, color-mix(in oklab, var(--primary) 92%, black) 0%, color-mix(in oklab, var(--primary) 70%, black) 55%, color-mix(in oklab, var(--secondary) 55%, black) 100%)`,
    opacity: overlayOpacity,
  };
  const isEager = loading === "eager";
  return (
    <section className={`relative overflow-hidden border-b border-border ${className}`}>
      <div className="absolute inset-0">
        <img
          src={image}
          alt={imageAlt}
          width={1920}
          height={800}
          loading={loading}
          decoding="async"
          {...(isEager ? { fetchPriority: "high" as any } : {})}
          sizes="100vw"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={overlayStyle} aria-hidden="true" />
        <div className="absolute inset-0 hero-grid-bg opacity-30" aria-hidden="true" />
      </div>
      <div className={`relative container-page ${SIZE_PAD[size]} text-white`}>
        <div className={`flex flex-col max-w-3xl ${alignCls}`}>
          {eyebrow && (
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wider ring-1 ring-white/25">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> {eyebrow}
            </span>
          )}
          <h1 className={`mt-3 sm:mt-4 font-extrabold leading-[1.05] tracking-tight ${TITLE_SIZE[size]}`}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 sm:mt-4 text-white/85 text-sm sm:text-base md:text-lg max-w-2xl">
              {subtitle}
            </p>
          )}
          {actions && <div className="mt-5 sm:mt-6 flex flex-wrap gap-2">{actions}</div>}
          {children && <div className="mt-5 sm:mt-6 w-full">{children}</div>}
        </div>
      </div>
    </section>
  );
}
