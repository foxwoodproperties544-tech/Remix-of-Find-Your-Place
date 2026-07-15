import { supabase } from "@/integrations/supabase/client";
import type { Property } from "./mock-data";

export interface DbPropertyRow {
  id: string;
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
  created_at: string;
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80";

export function toProperty(r: DbPropertyRow): Property {
  return {
    id: r.id,
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
    featured: r.featured,
    description: r.description,
    features: r.features,
    amenities: r.amenities,
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
