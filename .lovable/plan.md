# Location Search Upgrade

Five related improvements to how users find listings by location.

## 1. Shareable URL filters on `/properties`

- Serialize all filters (category, type, county, town, price, beds, baths, size, features, nearby, status, listingType, purpose, sort, page, favorites-only) into search params via TanStack Router `validateSearch` (zod + `fallback`).
- On mount, hydrate `FiltersState` from `Route.useSearch()`; on any change, `navigate({ search: (prev) => ({...prev, ...patch}) })` so URLs are shareable and Back/Forward works.
- Sets (`features`, `nearby`) encoded as comma-separated strings.

## 2. County ↔ town validation

- In `FiltersSidebar` and `dashboard/new` listing form: if `town` is set but not in `KENYA_SUBLOCATIONS[county]`, show an inline error ("`<town>` is not in `<county>`").
- Listing form: block submit until resolved (either pick a valid town, change county, or clear town).
- Filters sidebar: soft warning + one-click "Clear town".

## 3. Fuzzy autocomplete for sublocations

- Add lightweight fuzzy matcher (small custom scorer — no new dependency: normalized substring + Levenshtein-lite for ≤2 typos) in `src/lib/fuzzy.ts`.
- Replace the town `<select>` in filters and listing form with a combobox: text input + dropdown of top 8 matches across the selected county (or all counties if none selected). Keyboard navigable.

## 4. Map-based filter

- New `MapFilter` component on `/properties` (toggle button "Map view"): OpenStreetMap embed with markers for each county/major town using existing `LOCATION_COORDS`.
- Clicking a marker sets `county` (and clears `town`) in URL filters. Uses Leaflet via CDN loaded client-side only (dynamic import behind `<ClientOnly>`-style effect) to avoid SSR issues.

## 5. Location landing pages

- New dynamic routes:
  - `src/routes/locations.index.tsx` → grid of all counties.
  - `src/routes/locations.$county.tsx` → county page: hero, description, list of sublocations, filtered property grid.
  - `src/routes/locations.$county.$town.tsx` → sublocation page: filtered listings for that town.
- Each has unique `head()` metadata (title, description, og tags, canonical) and JSON-LD `Place` schema for SEO.
- Add these URLs to `sitemap.xml` generator.
- Slugified params (`nairobi`, `nairobi/karen`); helper to map slug ↔ display name.

## Technical notes

- Zod search schema uses `fallback()` (never `.catch()`), no bounds — clamp in component.
- Fuzzy matching pure-JS, deterministic, no new dep.
- Leaflet loaded via `<link>`/`<script>` tags in `__root.tsx` head OR dynamic import inside `useEffect` — pick dynamic import to avoid loading on every page.
- Sitemap: enumerate counties + sublocations from `KENYA_SUBLOCATIONS`.
- No DB migrations required.
