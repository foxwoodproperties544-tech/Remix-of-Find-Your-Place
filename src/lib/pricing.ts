// Phase 1 pricing (KES). Adjust freely — used by featured-listing & tier-upgrade flows.

export type FeaturedPlan = {
  id: "featured_week" | "featured_month";
  label: string;
  price: number; // KES
  days: number;
  highlight?: boolean;
};

export const FEATURED_PLANS: FeaturedPlan[] = [
  { id: "featured_week", label: "1 week featured", price: 500, days: 7 },
  { id: "featured_month", label: "1 month featured", price: 1500, days: 30, highlight: true },
];

export type TierId = "free" | "basic" | "pro" | "elite";

export type TierPlan = {
  id: TierId;
  name: string;
  price: number; // KES / month, 0 = free
  quota: number; // active listing quota
  perks: string[];
  highlight?: boolean;
};

export const TIER_PLANS: TierPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    quota: 3,
    perks: ["Up to 3 active listings", "Standard visibility", "WhatsApp & call leads"],
  },
  {
    id: "basic",
    name: "Basic",
    price: 1500,
    quota: 15,
    perks: ["Up to 15 active listings", "Priority support", "1 featured listing / month"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 4500,
    quota: 60,
    perks: ["Up to 60 listings", "Verified agent badge", "3 featured listings / month", "Agent profile boost"],
    highlight: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: 12000,
    quota: 999,
    perks: ["Unlimited listings", "Top of search results", "10 featured / month", "Dedicated account manager"],
  },
];

export const VERIFICATION_FEE = 1000; // KES one-off per property

export function tierByPrice(price: number): TierPlan | undefined {
  return TIER_PLANS.find((t) => t.price === price);
}
