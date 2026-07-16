import type { ReactNode } from "react";

interface PageHeroProps {
  image: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
}

export function PageHero({ image, eyebrow, title, subtitle, children, align = "left", size = "md" }: PageHeroProps) {
  const padY = size === "lg" ? "py-20 md:py-32" : size === "sm" ? "py-12 md:py-16" : "py-16 md:py-24";
  const alignCls = align === "center" ? "text-center mx-auto" : "";
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0">
        <img src={image} alt="" className="h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, color-mix(in oklab, var(--primary) 92%, black) 0%, color-mix(in oklab, var(--primary) 70%, black) 55%, color-mix(in oklab, var(--secondary) 55%, black) 100%)",
            opacity: 0.85,
          }}
        />
        <div className="absolute inset-0 hero-grid-bg opacity-30" />
      </div>
      <div className={`relative container-page ${padY} text-white`}>
        <div className={`max-w-3xl ${alignCls}`}>
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/25">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> {eyebrow}
            </span>
          )}
          <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="mt-4 text-white/85 text-base md:text-lg max-w-2xl">{subtitle}</p>}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}
