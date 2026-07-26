import { Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, MapPin, Sparkles } from "lucide-react";
import type { Business } from "@/lib/directory";

export function BusinessCard({
  b,
  categoryName,
  propertyCount,
}: {
  b: Business;
  categoryName?: string;
  propertyCount?: number;
}) {
  const areas = [b.town, b.county].filter(Boolean).join(", ") || (b.counties ?? []).slice(0, 2).join(", ");

  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {b.logo_url ? (
            <img
              src={b.logo_url}
              alt={`${b.name} logo`}
              loading="lazy"
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Building2 className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{b.name}</h3>
            {b.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                <BadgeCheck className="h-3 w-3" /> Verified
              </span>
            )}
            {b.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                <Sparkles className="h-3 w-3" /> Featured
              </span>
            )}
          </div>
          {categoryName && <p className="mt-0.5 text-xs text-muted-foreground">{categoryName}</p>}
          {areas && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {areas}
            </p>
          )}
        </div>
      </div>

      {b.short_description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{b.short_description}</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {typeof propertyCount === "number" ? `${propertyCount} propert${propertyCount === 1 ? "y" : "ies"}` : "\u00a0"}
        </span>
        <Link
          to="/companies/$slug"
          params={{ slug: b.slug }}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          View Profile
        </Link>
      </div>
    </article>
  );
}
