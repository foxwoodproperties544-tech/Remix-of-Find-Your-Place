import { supabase } from "@/integrations/supabase/client";
import type { Property } from "./mock-data";

export interface DbPropertyRow {
  id: string;
  slug?: string | null;
  owner_id: string;
  title: string;
  description: string;
  price: number;
  price_suffix: string | null;
  category: string;
  property_type: string;
  county: string;
  town: string;
  area: string | null;
  bedrooms: number;
  bathrooms: number;
  size: string | null;
  images: string[];
  features: string[];
  amenities: string[];
  contact_phone: string | null;
  contact_whatsapp: string | null;
  status: string;
  featured: boolean;
  is_featured?: boolean;
  featured_until?: string | null;
  verified?: boolean;
  created_at: string;
  video_url?: string | null;
  documents?: unknown;
  lat?: number | null;
  lng?: number | null;
  expires_at?: string | null;
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80";

export function toProperty(r: DbPropertyRow): Property {
  return {
    id: r.id,
    slug: r.slug ?? undefined,
    title: r.title,
    price: Number(r.price),
    priceSuffix: r.price_suffix ?? undefined,
    category: r.category as Property["category"],
    type: r.property_type as Property["type"],
    county: r.county,
    town: r.town,
    area: r.area ?? "",
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    size: r.size ?? "",
    image: r.images[0] ?? PLACEHOLDER,
    images: r.images.length ? r.images : undefined,
    featured: r.is_featured ?? r.featured,
    verified: r.verified ?? false,
    description: r.description,
    features: r.features,
    amenities: r.amenities,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
  };
}

export async function fetchPublishedProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DbPropertyRow[]).map(toProperty);
}

export async function fetchMyProperties(userId: string): Promise<DbPropertyRow[]> {
  const { data, error } = await supabase
    .from("properties").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as DbPropertyRow[];
}

export async function fetchPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toProperty(data as DbPropertyRow);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchPropertyRowById(idOrSlug: string): Promise<DbPropertyRow | null> {
  const column = UUID_RE.test(idOrSlug) ? "id" : "slug";
  const { data, error } = await supabase.from("properties").select("*").eq(column, idOrSlug).maybeSingle();
  if (error || !data) {
    // Fallback: try the other column in case a slug happens to be UUID-shaped or vice versa
    const other = column === "id" ? "slug" : "id";
    const { data: alt } = await supabase.from("properties").select("*").eq(other, idOrSlug).maybeSingle();
    return (alt as DbPropertyRow) ?? null;
  }
  return data as DbPropertyRow;
}

export async function fetchPropertiesByOwner(ownerId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DbPropertyRow[]).map(toProperty);
}
