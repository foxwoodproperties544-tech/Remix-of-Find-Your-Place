/**
 * Editable About-page content stored in `platform_settings`.
 * Each block has a settings key, a typed shape and a default used when the
 * admin has not saved anything yet.
 */
import {
  Landmark, Home, KeyRound, FileSearch, Building2, Store, Warehouse, Megaphone,
  LineChart, UsersRound, BookOpen, Search, CalendarCheck, Handshake, MessageSquare,
  MapPinned, LifeBuoy, ShieldCheck, BadgeCheck, Award, Sparkles, Scale, Eye,
  HeartHandshake, Users, Compass, Star, Quote, Briefcase, Globe, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Landmark, Home, KeyRound, FileSearch, Building2, Store, Warehouse, Megaphone,
  LineChart, UsersRound, BookOpen, Search, CalendarCheck, Handshake, MessageSquare,
  MapPinned, LifeBuoy, ShieldCheck, BadgeCheck, Award, Sparkles, Scale, Eye,
  HeartHandshake, Users, Compass, Star, Quote, Briefcase, Globe,
};

export const ICON_NAMES = Object.keys(ICONS);

export function iconFor(name?: string | null): LucideIcon {
  return (name && ICONS[name]) || Sparkles;
}

/* ---------------- keys ---------------- */

export const SETTINGS_KEYS = {
  services: "about_services",
  process: "about_process",
  partners: "about_partners",
  testimonials: "about_testimonials",
  stats: "about_stats",
} as const;

/* ---------------- shapes ---------------- */

export type ServiceCard = { icon: string; title: string; description: string };
export type ProcessStep = { icon: string; title: string; description: string };

export const PARTNER_CATEGORIES = ["certification", "membership", "partner", "award"] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const PARTNER_CATEGORY_LABEL: Record<PartnerCategory, string> = {
  certification: "Certifications",
  membership: "Memberships",
  partner: "Trusted partners",
  award: "Awards",
};

export type PartnerItem = {
  name: string;
  category: PartnerCategory;
  logo_url?: string;
  url?: string;
};

export type Testimonial = {
  name: string;
  location: string;
  rating: number;
  text: string;
  photo_url?: string;
};

/* ---------------- defaults ---------------- */

export const DEFAULT_SERVICES: ServiceCard[] = [
  { icon: "Landmark", title: "Land & plot sales", description: "Verified plots and land parcels across Kenya." },
  { icon: "Home", title: "Residential sales", description: "Houses, apartments and family homes for sale." },
  { icon: "KeyRound", title: "Rental listings", description: "Long-term rentals with genuine landlords." },
  { icon: "FileSearch", title: "Lease listings", description: "Commercial and residential lease opportunities." },
  { icon: "Building2", title: "Airbnb listings", description: "Short-stay and holiday homes for travellers." },
  { icon: "Store", title: "Commercial properties", description: "Shops, offices and retail spaces." },
  { icon: "Warehouse", title: "Property marketplace", description: "One place to browse, compare and connect." },
  { icon: "Megaphone", title: "Property request marketplace", description: "Post what you need and let owners come to you." },
  { icon: "LineChart", title: "Property marketing", description: "Featured placement and campaign packages." },
  { icon: "UsersRound", title: "Agent & developer directory", description: "Discover verified professionals near you." },
  { icon: "BookOpen", title: "Property blogs & guides", description: "Market insight and buyer education." },
];

export const DEFAULT_PROCESS: ProcessStep[] = [
  { icon: "Search", title: "Search or request a property", description: "Browse verified listings or post a property request." },
  { icon: "UsersRound", title: "Connect with trusted agents or owners", description: "Message verified professionals directly." },
  { icon: "CalendarCheck", title: "Book a viewing or make an offer", description: "Schedule visits and negotiate in-platform." },
  { icon: "Handshake", title: "Complete your property journey", description: "Close with guidance from search to signing." },
];

export const DEFAULT_PARTNERS: PartnerItem[] = [
  { name: "Kenya Property Developers Association", category: "membership" },
  { name: "Estate Agents Registration Board", category: "certification" },
  { name: "Ministry of Lands e-Citizen", category: "partner" },
  { name: "Kenya Bankers Mortgage Partners", category: "partner" },
  { name: "Safaricom M-Pesa", category: "partner" },
  { name: "Institution of Surveyors of Kenya", category: "membership" },
];

export const DEFAULT_TESTIMONIALS: Testimonial[] = [];

export const DEFAULT_STATS = [
  { label: "Properties listed", value: 1200, suffix: "+" },
  { label: "Counties covered", value: 47, suffix: "" },
  { label: "Trusted agents", value: 180, suffix: "+" },
  { label: "Happy customers", value: 3500, suffix: "+" },
  { label: "Successful connections", value: 5200, suffix: "+" },
  { label: "Monthly visitors", value: 42000, suffix: "+" },
];

/* ---------------- helpers ---------------- */

/** Read an `items` array out of a platform_settings JSON value, with fallback. */
export function itemsOr<T>(value: unknown, fallback: T[]): T[] {
  const items = (value as { items?: unknown } | null)?.items;
  return Array.isArray(items) && items.length ? (items as T[]) : fallback;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
