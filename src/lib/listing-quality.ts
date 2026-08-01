/**
 * Listing quality score — pure, client-safe scoring shown to agents before publish.
 * Score is 0-100 with actionable checks so agents can improve a listing pre-submission.
 */

export type QualityInput = {
  title?: string | null;
  description?: string | null;
  price?: number | string | null;
  images?: string[] | null;
  amenities?: string | string[] | null;
  features?: string | string[] | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  size?: number | string | null;
  county?: string | null;
  town?: string | null;
  area?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  video_url?: string | null;
  tour_url?: string | null;
  documents?: unknown[] | null;
};

export type QualityCheck = {
  key: string;
  label: string;
  hint: string;
  weight: number;
  passed: boolean;
  required: boolean;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const list = (v: string | string[] | null | undefined): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return v.split(",").map((s) => s.trim()).filter(Boolean);
};

export function listingQualityChecks(input: QualityInput): QualityCheck[] {
  const images = (input.images ?? []).filter(Boolean);
  const desc = (input.description ?? "").trim();
  const words = desc ? desc.split(/\s+/).length : 0;
  const title = (input.title ?? "").trim();

  return [
    {
      key: "photos",
      label: "At least 5 photos",
      hint: "Listings with 5+ photos get roughly twice as many enquiries.",
      weight: 20,
      passed: images.length >= 5,
      required: true,
    },
    {
      key: "photos_pro",
      label: "8 or more photos",
      hint: "Show every room, the exterior and the access road.",
      weight: 8,
      passed: images.length >= 8,
      required: false,
    },
    {
      key: "title",
      label: "Descriptive title",
      hint: "Include bedrooms, property type and the neighbourhood (e.g. “3BR Apartment in Kilimani”).",
      weight: 10,
      passed: title.length >= 25 && title.length <= 120,
      required: true,
    },
    {
      key: "description",
      label: "Description of 80+ words",
      hint: "Describe layout, finishes, neighbourhood and what makes it stand out.",
      weight: 15,
      passed: words >= 80,
      required: true,
    },
    {
      key: "price",
      label: "Price set",
      hint: "Listings without a price are skipped by most buyers.",
      weight: 10,
      passed: num(input.price) > 0,
      required: true,
    },
    {
      key: "location",
      label: "County, town and area",
      hint: "Precise locations rank far better in search.",
      weight: 10,
      passed: !!input.county && !!input.town && !!(input.area ?? "").trim(),
      required: true,
    },
    {
      key: "geo",
      label: "Map pin (lat/lng)",
      hint: "A map pin unlocks radius search and neighbourhood matching.",
      weight: 10,
      passed: num(input.lat) !== 0 && num(input.lng) !== 0,
      required: false,
    },
    {
      key: "specs",
      label: "Key specs filled",
      hint: "Bedrooms, bathrooms or plot size help buyers filter to your listing.",
      weight: 7,
      passed: num(input.bedrooms) > 0 || num(input.bathrooms) > 0 || num(input.size) > 0,
      required: false,
    },
    {
      key: "amenities",
      label: "3+ amenities or features",
      hint: "Add amenities like Wi-Fi, borehole, parking, security.",
      weight: 5,
      passed: list(input.amenities).length + list(input.features).length >= 3,
      required: false,
    },
    {
      key: "media",
      label: "Video or 360° tour",
      hint: "Rich media keeps buyers on your listing up to 3× longer.",
      weight: 5,
      passed: !!(input.video_url ?? "").trim() || !!(input.tour_url ?? "").trim(),
      required: false,
    },
  ];
}

export type QualityResult = {
  score: number;
  grade: "excellent" | "good" | "fair" | "poor";
  label: string;
  checks: QualityCheck[];
  missingRequired: QualityCheck[];
};

export function listingQualityScore(input: QualityInput): QualityResult {
  const checks = listingQualityChecks(input);
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const score = total ? Math.round((earned / total) * 100) : 0;
  const grade: QualityResult["grade"] =
    score >= 85 ? "excellent" : score >= 65 ? "good" : score >= 40 ? "fair" : "poor";
  const label =
    grade === "excellent"
      ? "Excellent — ready to publish"
      : grade === "good"
        ? "Good — a few tweaks will help"
        : grade === "fair"
          ? "Fair — needs more detail"
          : "Poor — add the essentials";
  return { score, grade, label, checks, missingRequired: checks.filter((c) => c.required && !c.passed) };
}
