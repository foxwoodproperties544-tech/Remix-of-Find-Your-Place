import { supabase } from "@/integrations/supabase/client";

export type BusinessCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
};

export type Business = {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  description: string | null;
  short_description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  county: string | null;
  town: string | null;
  counties: string[];
  towns: string[];
  services: string[];
  property_types: string[];
  socials: Record<string, string>;
  business_hours: Record<string, string>;
  years_in_business: number | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  featured: boolean;
  status: string;
  owner_id: string | null;
  claimed_at: string | null;
  plan_slug: string | null;
  plan_expires_at: string | null;
  view_count: number;
  enquiry_count: number;
  created_at: string;
};

export type BusinessPlan = {
  id: string;
  slug: string;
  name: string;
  price: number;
  duration_days: number;
  listing_limit: number;
  featured_placement: boolean;
  analytics_access: boolean;
  perks: string[];
  active: boolean;
  sort_order: number;
};

export function businessSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "company"
  );
}

export type DirectoryFilters = {
  q?: string;
  categoryId?: string;
  county?: string;
  town?: string;
  propertyType?: string;
  verifiedOnly?: boolean;
  featuredOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export async function fetchCategories(): Promise<BusinessCategory[]> {
  const { data, error } = await supabase
    .from("business_categories")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as BusinessCategory[];
}

export async function fetchBusinessPlans(): Promise<BusinessPlan[]> {
  const { data, error } = await supabase
    .from("business_plans")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as BusinessPlan[];
}

/** Paginated, server-filtered directory query. Scales to large tables. */
export async function fetchBusinesses(
  f: DirectoryFilters = {},
): Promise<{ rows: Business[]; total: number }> {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(48, Math.max(6, f.pageSize ?? 12));
  const from = (page - 1) * pageSize;

  let q = supabase
    .from("businesses")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("verified", { ascending: false })
    .order("name", { ascending: true })
    .range(from, from + pageSize - 1);

  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.county) q = q.or(`county.eq.${f.county},counties.cs.{"${f.county}"}`);
  if (f.town) q = q.or(`town.eq.${f.town},towns.cs.{"${f.town}"}`);
  if (f.propertyType) q = q.contains("property_types", [f.propertyType]);
  if (f.verifiedOnly) q = q.eq("verified", true);
  if (f.featuredOnly) q = q.eq("featured", true);
  if (f.q?.trim()) q = q.ilike("name", `%${f.q.trim()}%`);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as Business[], total: count ?? 0 };
}

export async function fetchBusinessBySlug(slug: string): Promise<Business | null> {
  const { data, error } = await supabase.from("businesses").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return data as unknown as Business;
}

export async function fetchBusinessProperties(businessId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function fetchBusinessReviews(businessId: string) {
  const { data, error } = await supabase
    .from("business_reviews")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/** Pre-filled WhatsApp deep link for a company / property enquiry. */
export function businessWhatsAppUrl(opts: {
  whatsapp?: string | null;
  companyName: string;
  propertyTitle?: string | null;
  propertyRef?: string | null;
}) {
  const digits = (opts.whatsapp ?? "").replace(/\D/g, "");
  const number = digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
  let msg = `Hello ${opts.companyName}, I found this on Foxwood Properties Ltd. Is it still available? I would like more information.`;
  if (opts.propertyTitle) {
    msg += `\n\nProperty: ${opts.propertyTitle}`;
    if (opts.propertyRef) msg += `\nRef: ${opts.propertyRef}`;
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}
