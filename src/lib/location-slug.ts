import { KENYA_COUNTIES, KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";

export function toSlug(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const countyBySlug = new Map(KENYA_COUNTIES.map((c) => [toSlug(c), c] as const));

export function countyFromSlug(slug: string): string | null {
  return countyBySlug.get(slug.toLowerCase()) ?? null;
}

export function townFromSlug(county: string, slug: string): string | null {
  const towns = KENYA_SUBLOCATIONS[county] ?? [];
  for (const t of towns) if (toSlug(t) === slug.toLowerCase()) return t;
  return null;
}

export function allCountySlugs(): { slug: string; name: string }[] {
  return KENYA_COUNTIES.map((c) => ({ slug: toSlug(c), name: c }));
}

export function allTownSlugs(county: string): { slug: string; name: string }[] {
  return (KENYA_SUBLOCATIONS[county] ?? []).map((t) => ({ slug: toSlug(t), name: t }));
}
