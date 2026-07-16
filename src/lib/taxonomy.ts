// Foxwood Properties — single source of truth for filters and selects.

export const CATEGORIES = ["For Sale", "For Rent", "For Lease"] as const;
export type Category = (typeof CATEGORIES)[number];

// Grouped property types for grouped <select> and sidebar rendering.
export const TYPE_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Residential",
    items: [
      "Houses",
      "Apartments",
      "Villas",
      "Townhouses",
      "Maisonettes",
      "Bungalows",
      "Bedsitters",
      "Studio Apartments",
      "Flats",
      "Duplexes",
      "Penthouses",
      "Airbnbs",
      "Holiday Homes",
    ],
  },
  {
    label: "Commercial",
    items: [
      "Office Spaces",
      "Shops",
      "Retail Spaces",
      "Commercial Buildings",
      "Warehouses",
      "Godowns",
      "Industrial Properties",
      "Business Premises",
      "Hotels",
      "Restaurants",
      "Petrol Stations",
    ],
  },
  {
    label: "Land",
    items: [
      "Land / Plots",
      "Residential Plots",
      "Commercial Plots",
      "Agricultural Land",
      "Industrial Land",
      "Mixed-Use Land",
      "Ranches",
      "Farms",
      "Beach Plots",
      "Investment Land",
    ],
  },
];

export const ALL_TYPES: string[] = TYPE_GROUPS.flatMap((g) => g.items);

// Grouped features for the sidebar checkboxes.
export const FEATURE_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Interior",
    items: [
      "Furnished",
      "Semi-Furnished",
      "Air Conditioning",
      "Ceiling Fans",
      "Built-in Wardrobes",
      "Walk-in Closet",
      "Modern Kitchen",
      "Pantry",
      "Laundry Area",
      "Store Room",
      "Balcony",
      "Terrace",
      "Fireplace",
    ],
  },
  {
    label: "Outdoor",
    items: [
      "Garden",
      "Backyard",
      "Swimming Pool",
      "Rooftop",
      "Children's Play Area",
      "BBQ Area",
      "Outdoor Kitchen",
    ],
  },
  {
    label: "Security",
    items: [
      "CCTV",
      "Electric Fence",
      "Perimeter Wall",
      "Security Guard",
      "Alarm System",
      "Gated Community",
      "Controlled Access",
    ],
  },
  {
    label: "Utilities",
    items: [
      "Water Supply",
      "Borehole",
      "Electricity",
      "Solar Power",
      "Backup Generator",
      "Fibre Internet",
      "Wi-Fi",
      "Sewer Connection",
      "Rainwater Harvesting",
    ],
  },
  {
    label: "Lifestyle",
    items: [
      "Gym",
      "Clubhouse",
      "Lift",
      "Wheelchair Access",
      "Pet Friendly",
      "Servant Quarter (SQ)",
      "Scenic View",
    ],
  },
];

export const ALL_FEATURES: string[] = FEATURE_GROUPS.flatMap((g) => g.items);

export const NEARBY_AMENITIES = [
  "Schools",
  "Hospitals",
  "Shopping Mall",
  "Supermarket",
  "Police Station",
  "Bus Stage",
  "Railway Station",
  "Airport",
  "Beach",
  "Golf Course",
  "Park",
  "Church",
  "Mosque",
  "University",
] as const;

export const PROPERTY_STATUSES = [
  "Available",
  "Sold",
  "Rented",
  "Leased",
  "Reserved",
  "Under Offer",
  "New Listing",
  "Featured",
] as const;

export const LISTING_TYPES = [
  "Owner Listing",
  "Agent Listing",
  "Developer Listing",
  "Company Listing",
] as const;

export const PROPERTY_PURPOSES = [
  "Residential",
  "Commercial",
  "Industrial",
  "Agricultural",
  "Mixed Use",
  "Investment",
] as const;

export const SALE_PRICE_BANDS = [
  { label: "Under KSh 1M", min: 0, max: 1_000_000 },
  { label: "KSh 1M – 5M", min: 1_000_000, max: 5_000_000 },
  { label: "KSh 5M – 10M", min: 5_000_000, max: 10_000_000 },
  { label: "KSh 10M – 20M", min: 10_000_000, max: 20_000_000 },
  { label: "KSh 20M – 50M", min: 20_000_000, max: 50_000_000 },
  { label: "Above KSh 50M", min: 50_000_000, max: undefined },
];

export const RENT_PRICE_BANDS = [
  { label: "Under KSh 10K", min: 0, max: 10_000 },
  { label: "KSh 10K – 25K", min: 10_000, max: 25_000 },
  { label: "KSh 25K – 50K", min: 25_000, max: 50_000 },
  { label: "KSh 50K – 100K", min: 50_000, max: 100_000 },
  { label: "Above KSh 100K", min: 100_000, max: undefined },
];

// Services offered — used by header/footer and to generate the routes.
export const SERVICES = [
  { slug: "buy", title: "Buy Property", blurb: "Find and purchase your next home or investment.", cta: "Talk to a buying advisor" },
  { slug: "sell", title: "Sell Property", blurb: "List and sell with the right price and reach.", cta: "Request a seller consultation" },
  { slug: "rent", title: "Rent Property", blurb: "Discover rentals that match your lifestyle and budget.", cta: "Get rental shortlist" },
  { slug: "lease", title: "Lease Property", blurb: "Commercial and long-term lease opportunities.", cta: "Discuss a lease" },
  { slug: "list", title: "List Your Property", blurb: "Post your listing and reach thousands of buyers.", cta: "Post a listing now" },
  { slug: "valuation", title: "Property Valuation", blurb: "Accurate market valuations from Kenya experts.", cta: "Book a valuation" },
  { slug: "marketing", title: "Property Marketing", blurb: "Professional photos, targeting and listing boosts.", cta: "Get a marketing plan" },
  { slug: "management", title: "Property Management", blurb: "End-to-end management for landlords and investors.", cta: "Request a management quote" },
  { slug: "investment", title: "Investment Advice", blurb: "Data-backed guidance on Kenyan real estate opportunities.", cta: "Speak with an advisor" },
] as const;

export type ServiceSlug = (typeof SERVICES)[number]["slug"];
