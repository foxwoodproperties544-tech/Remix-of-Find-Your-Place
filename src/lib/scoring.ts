import { supabase } from "@/integrations/supabase/client";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VerificationCriterion = {
  id: string;
  key: string;
  label: string;
  explanation: string | null;
  weight: number;
  land_only: boolean;
  active: boolean;
  sort_order: number;
};

export type PropertyCheck = {
  id: string;
  criterion_key: string;
  passed: boolean;
  notes: string | null;
  checked_at: string | null;
};

export type InvestmentFactor = {
  id: string;
  key: string;
  label: string;
  explanation: string | null;
  weight: number;
  active: boolean;
  sort_order: number;
};

export type InvestmentRating = { factor_key: string; value: number };

const LAND_TYPES = ["land", "plot", "plots", "land / plots", "farm", "farms"];

export function isLandType(type?: string | null) {
  return LAND_TYPES.includes((type ?? "").toLowerCase().trim());
}

export async function fetchVerificationCriteria(): Promise<VerificationCriterion[]> {
  const { data, error } = await supabase
    .from("verification_criteria")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VerificationCriterion[];
}

export async function fetchPropertyChecks(propertyId: string): Promise<PropertyCheck[]> {
  const { data, error } = await supabase
    .from("property_verification_checks")
    .select("id, criterion_key, passed, notes, checked_at")
    .eq("property_id", propertyId);
  if (error) throw error;
  return (data ?? []) as PropertyCheck[];
}

export async function fetchInvestmentFactors(): Promise<InvestmentFactor[]> {
  const { data, error } = await supabase
    .from("investment_factors")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InvestmentFactor[];
}

export async function fetchInvestmentRatings(propertyId: string): Promise<InvestmentRating[]> {
  const { data, error } = await supabase
    .from("property_investment_ratings")
    .select("factor_key, value")
    .eq("property_id", propertyId);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({ factor_key: r.factor_key, value: Number(r.value) }));
}

/** Weighted verification score out of 100 (land-only criteria excluded for buildings). */
export function computeVerificationScore(
  criteria: VerificationCriterion[],
  checks: PropertyCheck[],
  propertyType?: string | null,
) {
  const land = isLandType(propertyType);
  const applicable = criteria.filter((c) => c.active && (!c.land_only || land));
  const passedKeys = new Set(checks.filter((c) => c.passed).map((c) => c.criterion_key));
  const total = applicable.reduce((s, c) => s + c.weight, 0);
  const earned = applicable.reduce((s, c) => s + (passedKeys.has(c.key) ? c.weight : 0), 0);
  return {
    score: total > 0 ? Math.round((100 * earned) / total) : 0,
    earned,
    total,
    applicable,
    passedKeys,
  };
}

/** Weighted investment score out of 10 using only factors that have been rated. */
export function computeInvestmentScore(factors: InvestmentFactor[], ratings: InvestmentRating[]) {
  const byKey = new Map(ratings.map((r) => [r.factor_key, r.value]));
  const rated = factors.filter((f) => f.active && byKey.has(f.key));
  const weight = rated.reduce((s, f) => s + f.weight, 0);
  const sum = rated.reduce((s, f) => s + f.weight * (byKey.get(f.key) ?? 0), 0);
  return {
    score: weight > 0 ? Math.round((10 * sum) / weight) / 10 : null,
    rated,
    byKey,
  };
}

export function scoreTone(pct: number) {
  if (pct >= 80) return "text-primary";
  if (pct >= 50) return "text-secondary";
  return "text-muted-foreground";
}

export function investmentVerdict(score: number) {
  if (score >= 8.5) return "Exceptional investment potential — strong demand and infrastructure.";
  if (score >= 7) return "Strong investment potential with good fundamentals for this area.";
  if (score >= 5) return "Moderate potential — some fundamentals are still developing.";
  return "Early-stage area — consider a longer holding period.";
}
