This is a very large scope — roughly 20 major feature areas, most of which need database changes, new routes, and integrations. Shipping it all in one turn would produce shallow, half-working features. I'll break it into approved phases and start with the foundations everything else depends on.

## Phased plan

### Phase 1 — Foundations (this turn if approved)
Everything else depends on these, so they go first.

**1. Roles & role-based dashboards**
- Extend `app_role` enum: add `agent`, `owner`, `buyer`, `tenant`, `developer` (keep existing `admin`, `user`).
- Add `profiles` fields: `role_primary`, `company_name`, `bio`, `phone`, `whatsapp`, `verified` (bool), `avatar_url` already exists.
- Role picker on first sign-in + in profile settings. Admin can change any user's roles.
- Dashboard shell (`/dashboard`) becomes role-aware: renders different tiles/menu per primary role (Admin, Agent, Owner, Buyer/Tenant, Developer). Existing listing management stays for Agent/Owner/Developer.

**2. Property model expansion (single migration)**
Add to `properties`: `slug` (unique, SEO URL), `video_url`, `documents` (jsonb: [{name,url}]), `lat`, `lng`, `availability_status` (Available/Sold/Rented/Leased/Reserved/Under Offer), `listing_type` (Owner/Agent/Developer/Company), `purpose`, `expires_at`, `is_draft` (bool), `price_previous` (for price-reduction badge), `published_at`.
- Update submission form: drafts, preview mode, renew, video URL, document upload to `property-docs` bucket, lat/lng picker on OpenStreetMap.
- Property detail: video embed, map with pin, downloadable docs, richer amenities, "Available Now" / "Price Reduced" / "New" / "Verified" badges.
- SEO-friendly URLs: `/properties/$slug` (keep `$id` redirect for existing links).

**3. Reviews & ratings**
- New table `reviews` (target_type: 'agent'|'property', target_id, rating 1–5, comment, user_id, status).
- Star display on agent/property pages; submission form gated to signed-in users; admin moderation.

**4. Site visits / viewing requests**
- New table `viewings` (property_id, requester_id, requested_at, status: pending/confirmed/declined/completed, notes).
- Booking widget on property detail with date/time slots.
- Agent/owner dashboard "Viewings" inbox with confirm/decline.

### Phase 2 — Discovery & engagement
- **Recently viewed** (localStorage) + **Similar properties** on detail page.
- **Interactive map search** on `/properties` using Google Maps (via Google Maps connector — need to enable it; user approval to connect).
- **Notifications**: `notifications` table + in-app bell + email via Lovable Emails (needs email domain — I'll surface the setup dialog when we reach this).

### Phase 3 — Content, legal, marketing pages
- FAQ, Privacy Policy, Terms, Cookie Policy, Help Centre, Testimonials, Agents index, Developers index, List Your Property (already exists as service page — enrich it).
- Blog: promote from static list to `blog_posts` table with admin CRUD, rich content, categories, SEO metadata per post.
- Contact page: add WhatsApp float button (site-wide), embedded Google Map for office, structured contact info.

### Phase 4 — Admin power tools & analytics
- Admin dashboard: users list with role management, properties moderation (already partial), categories/locations CMS, blog CMS, reviews moderation, featured toggles, reports (flagged listings/reviews).
- Analytics dashboard: traffic (from `property_views`), top properties, top searched locations (log searches to new `search_logs`), enquiries count, per-agent performance.
- Activity logs table for admin auditing.

### Phase 5 — Security & SEO polish
- Enable email verification (auth setting) + leaked-password protection.
- Add reCAPTCHA v3 on contact / lead / signup forms (needs site key from user).
- XML sitemap (`/sitemap.xml` server route) generated from published properties + static pages.
- JSON-LD structured data: `RealEstateListing` on detail pages, `Organization` on root, `BreadcrumbList`.
- Meta titles/descriptions audit across every route.

### Phase 6 — Payments (scaffold only)
- Add `subscriptions` and `featured_purchases` tables + UI for "Boost listing" and "Agent Pro plan".
- Wire to Lovable Payments (Stripe) when user is ready — will run eligibility check then.
- M-Pesa: not natively supported; will document integration path (Daraja API + custom secret) when user chooses.

## Notes / decisions I need from you

- **Google Maps**: I'll connect the Google Maps connector for interactive map search. Confirm to proceed.
- **Email notifications**: requires an email sending domain you own. I'll open the setup dialog when we reach Phase 2.
- **reCAPTCHA**: you'll need to create a v3 site at google.com/recaptcha and paste the site + secret keys when we reach Phase 5.
- **Payments**: Paddle/Stripe scaffold only for now — real activation later.

## Recommendation

Approve **Phase 1** now. It's already a large chunk (schema migration + role system + reviews + viewings + submission upgrades + slugs). Once it lands and you're happy, I'll queue Phase 2.

Reply "go phase 1" (or specify a different starting point) and I'll implement.
