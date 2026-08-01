/**
 * Programmatic landing pages: category × property type × location.
 * URL shape: /kenya/{type}-{category}-in-{location}
 * e.g. /kenya/apartments-for-rent-in-kilimani
 */
import type { Category, PropertyType } from "@/lib/mock-data";
import { KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { toSlug } from "@/lib/location-slug";

export const SEO_CATEGORIES: { label: Category; slug: string; verb: string }[] = [
  { label: "For Sale", slug: "for-sale", verb: "buy" },
  { label: "For Rent", slug: "for-rent", verb: "rent" },
  { label: "For Lease", slug: "for-lease", verb: "lease" },
];

export const SEO_TYPES: { label: PropertyType; slug: string }[] = [
  { label: "Houses", slug: "houses" },
  { label: "Apartments", slug: "apartments" },
  { label: "Land / Plots", slug: "land" },
  { label: "Commercial", slug: "commercial" },
  { label: "Office Spaces", slug: "office-spaces" },
  { label: "Shops", slug: "shops" },
  { label: "Warehouses", slug: "warehouses" },
  { label: "Farms", slug: "farms" },
  { label: "Airbnbs", slug: "airbnbs" },
  { label: "Holiday Homes", slug: "holiday-homes" },
];

/** Locations that get their own programmatic pages (towns + counties). */
export const SEO_LOCATIONS: { county: string; town?: string }[] = [
  { county: "Nairobi" },
  { county: "Nairobi", town: "Karen" },
  { county: "Nairobi", town: "Kilimani" },
  { county: "Nairobi", town: "Westlands" },
  { county: "Nairobi", town: "Lavington" },
  { county: "Nairobi", town: "Runda" },
  { county: "Nairobi", town: "Langata" },
  { county: "Kiambu" },
  { county: "Kiambu", town: "Ruiru" },
  { county: "Kiambu", town: "Kikuyu" },
  { county: "Kiambu", town: "Juja" },
  { county: "Kajiado" },
  { county: "Kajiado", town: "Kitengela" },
  { county: "Kajiado", town: "Ngong" },
  { county: "Machakos" },
  { county: "Machakos", town: "Syokimau" },
  { county: "Machakos", town: "Athi River" },
  { county: "Mombasa" },
  { county: "Mombasa", town: "Nyali" },
  { county: "Mombasa", town: "Bamburi" },
  { county: "Nakuru" },
  { county: "Kisumu" },
  { county: "Uasin Gishu" },
].filter((l) => !l.town || (KENYA_SUBLOCATIONS[l.county] ?? []).includes(l.town));

/** Type/category pairs that make commercial sense (avoids nonsense pages). */
function allowed(type: PropertyType, category: Category): boolean {
  if (type === "Airbnbs" || type === "Holiday Homes") return category !== "For Lease";
  if (type === "Land / Plots" || type === "Farms") return category !== "For Rent";
  if (type === "Warehouses" || type === "Office Spaces" || type === "Shops") return category !== "For Sale" || true;
  return true;
}

export type SeoCombo = {
  slug: string;
  category: Category;
  categorySlug: string;
  type: PropertyType;
  typeSlug: string;
  county: string;
  town?: string;
  locationLabel: string;
};

function buildSlug(typeSlug: string, categorySlug: string, locationSlug: string) {
  return `${typeSlug}-${categorySlug}-in-${locationSlug}`;
}

export function allCombos(): SeoCombo[] {
  const out: SeoCombo[] = [];
  for (const loc of SEO_LOCATIONS) {
    const locationLabel = loc.town ?? loc.county;
    const locationSlug = toSlug(locationLabel);
    for (const t of SEO_TYPES) {
      for (const c of SEO_CATEGORIES) {
        if (!allowed(t.label, c.label)) continue;
        out.push({
          slug: buildSlug(t.slug, c.slug, locationSlug),
          category: c.label,
          categorySlug: c.slug,
          type: t.label,
          typeSlug: t.slug,
          county: loc.county,
          town: loc.town,
          locationLabel,
        });
      }
    }
  }
  return out;
}

let cache: Map<string, SeoCombo> | null = null;
export function findCombo(slug: string): SeoCombo | null {
  if (!cache) cache = new Map(allCombos().map((c) => [c.slug, c] as const));
  return cache.get(slug.toLowerCase()) ?? null;
}

export function comboHeading(c: SeoCombo): string {
  const t = c.type === "Land / Plots" ? "Land & plots" : c.type;
  return `${t} ${c.category.toLowerCase()} in ${c.locationLabel}`;
}

export function comboTitle(c: SeoCombo): string {
  return `${comboHeading(c)} — prices & listings | Foxwood Properties`.slice(0, 70);
}

export function comboDescription(c: SeoCombo): string {
  return `Browse verified ${c.type.toLowerCase()} ${c.category.toLowerCase()} in ${c.locationLabel}, Kenya. Live median prices, photos, amenities and direct agent contact on Foxwood Properties.`.slice(
    0,
    158,
  );
}
