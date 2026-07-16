## What I'll build

### 1. Taxonomy (frontend catalog)
New `src/lib/taxonomy.ts` as the single source of truth:
- **Categories** (listing status): For Sale, For Rent, For Lease
- **Property types** grouped: Residential (Land/Plots, Houses, Apartments, Villas, Townhouses, Maisonettes, Bungalows, Bedsitters, Studios, Flats, Duplexes, Penthouses, Airbnbs, Holiday Homes), Commercial (Offices, Shops, Retail, Commercial Buildings, Warehouses, Godowns, Industrial, Business Premises, Hotels, Restaurants, Petrol Stations), Land (Residential/Commercial/Agricultural/Industrial/Mixed-Use Plots, Ranches, Farms, Beach Plots, Investment Land)
- **Features** grouped: Basic Info, Interior, Outdoor, Security, Utilities, Lifestyle (full lists from spec)
- **Amenities Nearby**: Schools, Hospitals, Mall, Supermarket, Police, Bus Stage, Railway, Airport, Beach, Golf Course, Park, Church, Mosque, University
- **Property Status** (availability): Available, Sold, Rented, Leased, Reserved, Under Offer, New Listing, Featured
- **Listing Type**: Owner, Agent, Developer, Company
- **Property Purpose**: Residential, Commercial, Industrial, Agricultural, Mixed Use, Investment
- **Price bands** for sale and rent (as listed)

Types stored on properties as existing `property_type` string — the expanded list is available in dropdowns immediately. The extra dimensions (Status/Listing Type/Purpose/Nearby) render as filter-only UI now; if you later want them saved per listing, I'll add DB columns in a follow-up.

### 2. Properties page — grouped sidebar filters
`src/routes/properties.tsx` rebuilt with:
- Left **sidebar** (desktop) / **drawer** (mobile, opened via "Filters" button) with collapsible groups: Category → Type → Price band → Bedrooms/Bathrooms → Features → Amenities Nearby → Status → Listing Type → Purpose
- Keep the hero search bar (query + location) at top
- Existing chips, sort, pagination, save-search, favorites-only stay
- Submission form (`dashboard.new.tsx`) updated so listing owners can pick from the new grouped Type list

### 3. Navigation restructure
`Header.tsx`: Home · Buy · Rent · Lease · Airbnbs · Blog · About · Contact
- Buy/Rent/Lease link to `/properties?category=For%20Sale|Rent|Lease`
- Airbnbs links to `/properties?type=Airbnbs`
- Add a "Services" dropdown grouping the 9 service pages

### 4. Nine service pages
Each with `PageHero` + benefits + process + a lead form that inserts into the existing `inquiries` table (property_id null, subject = service name):
- `/services/buy` Buy Property
- `/services/sell` Sell Property
- `/services/rent` Rent Property
- `/services/lease` Lease Property
- `/services/list` List Your Property (links to `/dashboard/new` for signed-in users)
- `/services/valuation` Property Valuation
- `/services/marketing` Property Marketing
- `/services/management` Property Management
- `/services/investment` Investment Advice

Shared `ServiceLeadForm` component (name, email, phone, message, service).

### 5. Small supporting changes
- `PropertyCard`: optional Status badge (Featured/New) using existing `featured` flag; expanded types render correctly
- Hero images generated for the four "themed" service pages (buy/sell/valuation/investment); reuse existing hero images for the others
- SEO metadata (title, description, OG/Twitter) on every new route

### Not in this pass (call out to user)
- Persisting Status / Listing Type / Purpose / Nearby amenities per listing needs new DB columns — happy to do in a follow-up
- Inquiries `subject` column doesn't exist yet; I'll store service name in `message` prefix for now, or add a small migration if you'd rather (I'll ask before writing SQL)

### Technical notes
- No schema migrations this pass
- Filter state kept in URL search params via existing `validateSearch` (extended)
- Mobile drawer uses shadcn `Sheet`
- All new routes get `head()` with per-page title/description/OG