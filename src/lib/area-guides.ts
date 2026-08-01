/**
 * Editorial area-guide content used by neighbourhood pages.
 * Curated copy for high-demand Kenyan markets, with a sensible
 * generated fallback for every other town so no page is thin.
 */

export type AreaGuide = {
  overview: string;
  bestFor: string[];
  transport: string;
  amenities: string[];
  investment: string;
  faqs: { q: string; a: string }[];
};

type Seed = Partial<Omit<AreaGuide, "faqs">> & { faqs?: { q: string; a: string }[] };

const CURATED: Record<string, Seed> = {
  Karen: {
    overview:
      "Karen is Nairobi's best-known leafy suburb, defined by half-acre and acre plots, gated family homes, and mature indigenous trees. It attracts diplomats, executives, and returning diaspora buyers who want space, privacy, and quick access to Nairobi National Park, Karen Country Club, and the Ngong Road forest belt.",
    bestFor: ["Family homes on large plots", "Luxury standalone houses", "Land banking", "Serviced short-lets"],
    transport:
      "Served by Langata Road, Ngong Road, and the Southern Bypass, with roughly 30–45 minutes to the CBD outside peak hours and a straight run to JKIA via the bypass.",
    amenities: ["The Hub Karen", "Galleria Mall", "Karen Hospital", "International schools", "Golf and country clubs"],
    investment:
      "Prices per acre have stayed resilient because supply of large plots keeps shrinking. Controlled subdivision into gated townhouse clusters is the dominant development play.",
  },
  Kilimani: {
    overview:
      "Kilimani is Nairobi's densest high-rise apartment market, minutes from Yaya Centre, Argwings Kodhek Road, and the CBD. It is the default choice for young professionals, expatriate tenants, and short-let investors who want walkable city living.",
    bestFor: ["1–3 bedroom apartments", "Airbnb and serviced apartments", "Rental yield investors", "Office conversions"],
    transport:
      "Ngong Road, Argwings Kodhek, and Lenana Road feed the area, with 10–20 minutes to the CBD and quick links to Westlands and Upper Hill.",
    amenities: ["Yaya Centre", "Adlife Plaza", "Nairobi Hospital nearby", "Cafés, gyms, coworking"],
    investment:
      "Yields are driven by furnished short-lets and young professional tenants. New supply is heavy, so build quality, parking ratio, and backup water matter more than location alone.",
  },
  Westlands: {
    overview:
      "Westlands is Nairobi's commercial second CBD, mixing grade-A offices, retail towers, and premium apartments. Demand comes from corporates, NGOs, and tenants who want to live where they work.",
    bestFor: ["Office space", "Commercial retail", "Executive apartments", "Mixed-use investment"],
    transport:
      "Waiyaki Way, Chiromo Road, and the Nairobi Expressway put the CBD within 10 minutes and JKIA within about 30 minutes off-peak.",
    amenities: ["Sarit Centre", "Westgate Mall", "The Oval and Delta offices", "Restaurants and nightlife"],
    investment:
      "Office absorption favours smaller, fitted suites. Residential stock competes on amenities — gyms, rooftop decks, and reliable backup power.",
  },
  Kitengela: {
    overview:
      "Kitengela is one of the fastest-growing satellite towns in Kajiado, popular for affordable plots, own-compound bungalows, and first-home buyers priced out of Nairobi.",
    bestFor: ["Residential plots", "Bungalows and maisonettes", "Affordable first homes", "Land banking"],
    transport:
      "Namanga Road connects to Athi River and the Nairobi Expressway; commuting to the CBD typically takes 45–75 minutes depending on traffic.",
    amenities: ["Kitengela Mall", "EPZ employment hub", "Schools and clinics", "Growing retail strip"],
    investment:
      "Plot values have appreciated steadily with road upgrades and water infrastructure. Confirm title type, county approvals, and access road status before buying.",
  },
  Syokimau: {
    overview:
      "Syokimau blends gated apartment estates and maisonettes with the best commuter-rail access in the Nairobi metro, making it a favourite for airport and industrial-area workers.",
    bestFor: ["Gated apartments", "Maisonettes", "Rental investors", "Airport-adjacent short-lets"],
    transport:
      "Mombasa Road, the Nairobi Expressway, and the Syokimau SGR/commuter rail station give fast access to the CBD and JKIA.",
    amenities: ["Gateway Mall", "SGR terminus", "Schools", "Supermarkets and clinics"],
    investment:
      "Expressway and rail access underpin rental demand. Prioritise estates with reliable water, sewer connection, and managed service charges.",
  },
  Ruiru: {
    overview:
      "Ruiru is Kiambu's largest growth corridor, with gated communities, affordable apartments, and continuing conversion of coffee estates into residential schemes.",
    bestFor: ["Gated communities", "Affordable apartments", "Plots", "Student housing"],
    transport:
      "Thika Superhighway offers a 30–50 minute run to the CBD, plus commuter rail and matatu routes.",
    amenities: ["Ruiru shopping centres", "Universities nearby", "Hospitals", "Industrial employment"],
    investment:
      "Volume supply keeps entry prices low; differentiate on estate management, water security, and proximity to the superhighway service lanes.",
  },
  Nyali: {
    overview:
      "Nyali is Mombasa's premier residential and holiday-home address, with beachfront apartments, villas, and a strong short-let market driven by domestic and international tourism.",
    bestFor: ["Beach apartments", "Holiday homes", "Villas", "Airbnb investors"],
    transport:
      "Linked to Mombasa Island by the Nyali Bridge, with roughly 20–30 minutes to Moi International Airport.",
    amenities: ["Nyali Centre", "City Mall", "Beach resorts", "International schools"],
    investment:
      "Occupancy is seasonal — December and August peaks. Furnished, sea-view units with pool access command the strongest nightly rates.",
  },
  Diani: {
    overview:
      "Diani is Kenya's leading beach-holiday market on the South Coast, dominated by resort-grade villas, cottages, and serviced holiday apartments.",
    bestFor: ["Holiday homes", "Beach villas", "Short-let investment", "Retirement homes"],
    transport:
      "Reached via the Likoni crossing or Ukunda airstrip, with direct domestic flights from Nairobi.",
    amenities: ["Diani Beach Road strip", "Resorts and restaurants", "Diani Beach Hospital", "Golf and water sports"],
    investment:
      "Management quality decides returns — professionally run rentals achieve far higher occupancy than self-managed cottages.",
  },
};

const CATEGORY_HINT =
  "Foxwood Properties lists verified homes, apartments, plots, and commercial spaces here so you can compare prices, neighbourhoods, and amenities before you visit.";

export function getAreaGuide(town: string, county: string): AreaGuide {
  const seed = CURATED[town] ?? {};
  const overview =
    seed.overview ??
    `${town} is one of the sought-after areas in ${county} County, popular with families, first-time buyers, investors, and short-let hosts. ${CATEGORY_HINT}`;
  const bestFor = seed.bestFor ?? [
    "Family homes",
    "Apartments and rentals",
    "Residential plots",
    "Commercial space",
  ];
  const transport =
    seed.transport ??
    `${town} is connected to the rest of ${county} County by the main highway network, with matatu routes serving the town centre and surrounding estates.`;
  const amenities = seed.amenities ?? ["Shopping centres", "Schools", "Health facilities", "Places of worship"];
  const investment =
    seed.investment ??
    `Track median asking prices on this page before you make an offer in ${town}, and always confirm title, land rates, and county approvals during due diligence.`;

  const faqs =
    seed.faqs ?? [
      {
        q: `Is ${town} a good place to buy property?`,
        a: `${town} suits buyers looking for ${bestFor.slice(0, 2).join(" and ").toLowerCase()}. Compare the live median prices on this page against your budget, then book a viewing with a verified Foxwood agent.`,
      },
      {
        q: `How much does property cost in ${town}, ${county}?`,
        a: `Prices on this page are calculated from live verified Foxwood listings in ${town}, so they update whenever new homes, plots, or rentals are published.`,
      },
      {
        q: `How do I verify land or a house in ${town}?`,
        a: `Use the Foxwood due-diligence hub to check title, search, land rates, and county approvals before paying any deposit. Every Foxwood agent profile shows verification status.`,
      },
      {
        q: `Can I rent instead of buying in ${town}?`,
        a: `Yes. Filter this page by For Rent to see available rentals in ${town}, or save the search to get an alert when a new match is listed.`,
      },
    ];

  return { overview, bestFor, transport, amenities, investment, faqs };
}

export function hasCuratedGuide(town: string): boolean {
  return Boolean(CURATED[town]);
}
