import { buildWhatsAppMessage, whatsappHref as waHref, FOXWOOD_WHATSAPP } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "./mock-data";

export const REQUEST_KINDS = ["buy", "rent", "lease"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const KIND_LABEL: Record<RequestKind, string> = {
  buy: "Buy",
  rent: "Rent",
  lease: "Lease",
};

export const REQUEST_STATUSES = ["draft", "active", "paused", "closed", "fulfilled", "expired"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_AMENITIES = [
  "Borehole",
  "Water",
  "Electricity",
  "Internet",
  "CCTV",
  "Swimming Pool",
  "Gym",
  "Garden",
  "Balcony",
  "Perimeter Wall",
  "Tarmac Road",
  "Backup Generator",
  "Lift",
  "Security",
] as const;

export interface PropertyRequest {
  id: string;
  user_id: string;
  slug: string | null;
  title: string;
  kind: RequestKind;
  property_type: string;
  county: string;
  town: string | null;
  estate: string | null;
  preferred_location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  land_size: string | null;
  building_size: string | null;
  furnished: boolean;
  amenities: string[];
  description: string;
  move_date: string | null;
  viewing_times: string | null;
  images: string[];
  hide_phone: boolean;
  hide_email: boolean;
  allow_whatsapp: boolean;
  allow_messages: boolean;
  email_notifications: boolean;
  contact_phone: string | null;
  contact_email: string | null;
  status: RequestStatus;
  is_featured: boolean;
  is_urgent: boolean;
  package_slug: string | null;
  published_at: string | null;
  expires_at: string | null;
  closed_at: string | null;
  fulfilled_property_id: string | null;
  view_count: number;
  response_count: number;
  created_at: string;
  updated_at: string;
}

export interface RequestResponse {
  id: string;
  request_id: string;
  responder_id: string;
  property_id: string | null;
  message: string;
  price: number | null;
  property_link: string | null;
  availability: string | null;
  viewing_dates: string | null;
  attachments: string[];
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  match_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface RequestMessage {
  id: string;
  response_id: string;
  sender_id: string;
  body: string;
  attachments: string[];
  read_at: string | null;
  created_at: string;
}

export interface RequestPackage {
  id: string;
  audience: "buyer" | "agent" | string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  response_limit: number | null;
  is_featured: boolean;
  is_urgent: boolean;
  priority_matching: boolean;
  instant_notifications: boolean;
  premium_leads: boolean;
  renewal_enabled: boolean;
  badge_color: string | null;
  active: boolean;
  sort_order: number;
}

export const REQUEST_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "budget_high", label: "Budget (Highest)" },
  { value: "budget_low", label: "Budget (Lowest)" },
  { value: "responses", label: "Most Responses" },
  { value: "views", label: "Most Viewed" },
  { value: "closing", label: "Closing Soon" },
] as const;
export type RequestSort = (typeof REQUEST_SORTS)[number]["value"];

const db = () => supabase.from("property_requests" as any);

export interface RequestFilters {
  kind?: string;
  type?: string;
  county?: string;
  town?: string;
  estate?: string;
  minBudget?: number;
  maxBudget?: number;
  bedrooms?: number;
  bathrooms?: number;
  landSize?: string;
  furnished?: boolean;
  featured?: boolean;
  urgent?: boolean;
  verified?: boolean;
  sort?: RequestSort;
  page?: number;
  perPage?: number;
}

export async function fetchRequests(f: RequestFilters = {}) {
  const perPage = f.perPage ?? 12;
  const page = f.page ?? 1;
  let q = db().select("*", { count: "exact" }).eq("status", "active");

  if (f.kind) q = q.eq("kind", f.kind);
  if (f.type) q = q.eq("property_type", f.type);
  if (f.county) q = q.eq("county", f.county);
  if (f.town) q = q.ilike("town", f.town);
  if (f.estate) q = q.ilike("estate", `%${f.estate}%`);
  if (f.minBudget != null) q = q.gte("budget_max", f.minBudget);
  if (f.maxBudget != null) q = q.lte("budget_min", f.maxBudget);
  if (f.bedrooms != null) q = q.gte("bedrooms", f.bedrooms);
  if (f.bathrooms != null) q = q.gte("bathrooms", f.bathrooms);
  if (f.landSize) q = q.ilike("land_size", `%${f.landSize}%`);
  if (f.furnished) q = q.eq("furnished", true);
  if (f.featured) q = q.eq("is_featured", true);
  if (f.urgent) q = q.eq("is_urgent", true);

  switch (f.sort ?? "newest") {
    case "oldest":
      q = q.order("published_at", { ascending: true });
      break;
    case "budget_high":
      q = q.order("budget_max", { ascending: false, nullsFirst: false });
      break;
    case "budget_low":
      q = q.order("budget_min", { ascending: true, nullsFirst: false });
      break;
    case "responses":
      q = q.order("response_count", { ascending: false });
      break;
    case "views":
      q = q.order("view_count", { ascending: false });
      break;
    case "closing":
      q = q.order("expires_at", { ascending: true, nullsFirst: false });
      break;
    default:
      q = q.order("is_featured", { ascending: false }).order("published_at", { ascending: false });
  }

  const from = (page - 1) * perPage;
  const { data, error, count } = await q.range(from, from + perPage - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as PropertyRequest[], total: count ?? 0 };
}

export async function fetchRequestBySlug(slugOrId: string): Promise<PropertyRequest | null> {
  const { data } = await db().select("*").eq("slug", slugOrId).maybeSingle();
  if (data) return data as unknown as PropertyRequest;
  const { data: byId } = await db().select("*").eq("id", slugOrId).maybeSingle();
  return (byId as unknown as PropertyRequest) ?? null;
}

export async function fetchMyRequests(userId: string) {
  const { data, error } = await db().select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PropertyRequest[];
}

export async function fetchRequestsByIds(ids: string[]) {
  if (!ids.length) return [] as PropertyRequest[];
  const { data, error } = await db().select("*").in("id", ids);
  if (error) throw error;
  const rows = (data ?? []) as unknown as PropertyRequest[];
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as PropertyRequest[];
}


export async function fetchRequestPackages(audience?: "buyer" | "agent") {
  let q = supabase.from("request_packages" as any).select("*").eq("active", true).order("sort_order");
  if (audience) q = q.eq("audience", audience);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as RequestPackage[];
}

export async function logRequestView(requestId: string, userId?: string | null) {
  try {
    await supabase.from("property_request_views" as any).insert({ request_id: requestId, viewer_user_id: userId ?? null });
  } catch {
    /* non-blocking */
  }
}

/* ---------------- AI matching engine ---------------- */

export interface MatchWeights {
  budget: number;
  property_type: number;
  location: number;
  bedrooms: number;
  bathrooms: number;
  amenities: number;
  land_size: number;
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  budget: 30,
  property_type: 20,
  location: 20,
  bedrooms: 10,
  bathrooms: 5,
  amenities: 10,
  land_size: 5,
};

export async function fetchMatchWeights(): Promise<MatchWeights> {
  try {
    const { data } = await supabase.from("platform_settings").select("value").eq("key", "request_match_weights").maybeSingle();
    const v = (data as any)?.value;
    return v ? { ...DEFAULT_MATCH_WEIGHTS, ...v } : DEFAULT_MATCH_WEIGHTS;
  } catch {
    return DEFAULT_MATCH_WEIGHTS;
  }
}

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

/** Score 0-100 for how well a listing satisfies a request. */
export function matchScore(req: PropertyRequest, p: Property, w: MatchWeights = DEFAULT_MATCH_WEIGHTS): number {
  let earned = 0;
  let total = 0;

  // Budget
  total += w.budget;
  const min = req.budget_min ?? 0;
  const max = req.budget_max ?? Infinity;
  if (p.price >= min && p.price <= max) earned += w.budget;
  else if (Number.isFinite(max) && p.price > max) earned += w.budget * Math.max(0, 1 - (p.price - max) / (max || 1));
  else if (p.price < min) earned += w.budget * 0.7;

  // Property type
  total += w.property_type;
  if (norm(p.type) === norm(req.property_type)) earned += w.property_type;

  // Location
  total += w.location;
  if (norm(p.county) === norm(req.county)) {
    earned += w.location * (req.town && norm(p.town) === norm(req.town) ? 1 : 0.6);
  }

  // Bedrooms
  if (req.bedrooms != null) {
    total += w.bedrooms;
    if (p.bedrooms >= req.bedrooms) earned += w.bedrooms;
    else if (p.bedrooms === req.bedrooms - 1) earned += w.bedrooms * 0.5;
  }

  // Bathrooms
  if (req.bathrooms != null) {
    total += w.bathrooms;
    if (p.bathrooms >= req.bathrooms) earned += w.bathrooms;
  }

  // Amenities
  if (req.amenities?.length) {
    total += w.amenities;
    const have = new Set([...(p.amenities ?? []), ...(p.features ?? [])].map(norm));
    const hits = req.amenities.filter((a) => have.has(norm(a))).length;
    earned += (w.amenities * hits) / req.amenities.length;
  }

  // Land size (loose text compare)
  if (req.land_size) {
    total += w.land_size;
    if (norm(p.size).includes(norm(req.land_size))) earned += w.land_size;
  }

  if (total === 0) return 0;
  return Math.round((earned / total) * 100);
}

/* ---------------- WhatsApp ---------------- */

export function requestWhatsappMessage(propertyTitle: string, reference: string, requestTitle?: string) {
  return buildWhatsAppMessage("request_response", {
    propertyTitle,
    reference,
    requestTitle: requestTitle ?? null,
  });
}

export function whatsappHref(phone: string, message: string) {
  return waHref(phone, message) ?? `https://wa.me/${FOXWOOD_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export function budgetLabel(r: Pick<PropertyRequest, "budget_min" | "budget_max" | "currency">) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(n);
  const cur = r.currency || "KES";
  if (r.budget_min && r.budget_max) return `${cur} ${fmt(r.budget_min)} – ${fmt(r.budget_max)}`;
  if (r.budget_max) return `Up to ${cur} ${fmt(r.budget_max)}`;
  if (r.budget_min) return `From ${cur} ${fmt(r.budget_min)}`;
  return "Budget flexible";
}

export function daysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}
