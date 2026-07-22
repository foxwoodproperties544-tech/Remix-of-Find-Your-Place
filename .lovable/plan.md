# Paid Blog Submission System

Mirrors the existing property-package flow (M-Pesa → admin approval → publish) but for blog articles. Reuses `blog_posts`, adds packages, purchases, and dashboard/admin surfaces.

## 1. Database

**New: `blog_packages`** — name, slug, price_kes, duration_days, is_featured, is_sponsored, features (jsonb), sort_order, is_active. Seeded with Basic (500), Featured (1,500), Sponsored (3,000).

**New: `blog_post_purchases`** — post_id, user_id, package_id, amount_kes, mpesa_transaction_id, status (pending/paid/failed), expires_at.

**Alter `blog_posts`**:
- Extend status enum: `draft | pending_payment | paid | pending_review | changes_requested | approved | published | rejected | expired`
- Add: `package_id`, `submitted_at`, `reviewed_at`, `reviewed_by`, `admin_notes`, `expires_at`, `is_sponsored`, `seo_title`, `meta_description` (if missing).

**Trigger**: extend `expire_listing_packages()` to also expire blog posts whose `expires_at < now()`.

**RLS**:
- Public reads only `status = 'published' AND expires_at > now()`.
- Authors read/edit their own drafts + non-published statuses.
- Admins full access.

## 2. Server functions (`src/lib/blog-submission.functions.ts`)

- `listBlogPackages()` / admin CRUD `upsertBlogPackage`, `toggleBlogPackage`
- `createBlogDraft`, `updateBlogDraft`, `submitForPayment(postId, packageId)` → creates purchase, initiates STK Push (reuses existing M-Pesa helper), sets status `pending_payment`
- M-Pesa callback (extend `/api/public/mpesa-callback` to handle `blog_post` purchases) → sets `paid` + `pending_review` + `expires_at`
- Admin: `listSubmissions(status)`, `approveBlogPost`, `rejectBlogPost`, `requestRevisions`, `archiveBlogPost`, `adminMarkBlogPurchasePaid`

## 3. Frontend

**User dashboard** (under `_authenticated/dashboard.blog/`):
- `dashboard.blog.index.tsx` — list my posts with status pill, actions (edit/pay/renew)
- `dashboard.blog.new.tsx` — rich editor (reuse existing Markdown editor + preview), featured image upload, category/tags/SEO fields
- `dashboard.blog.$id.edit.tsx`
- `dashboard.blog.$id.preview.tsx`
- `dashboard.blog.$id.pay.tsx` — package selection + STK Push (mirrors `dashboard.pay.$id.tsx`)

**Admin** (`_authenticated/admin.blog/`):
- `admin.blog.index.tsx` — submissions queue with tabs (pending review / changes requested / approved / published / rejected)
- `admin.blog.packages.tsx` — CRUD packages
- `admin.blog.$id.review.tsx` — full preview + approve/reject/request-revisions/edit
- Revenue stat card on admin analytics

**Public blog** — update `blog.index.tsx` to sort sponsored/featured first, add "Sponsored"/"Featured" badges. Add JSON-LD Article schema and OG tags on `blog.$slug.tsx` (verify).

## 4. Rich editor

Use existing markdown pipeline (already supports headings/lists/tables/YouTube/callouts). Add image upload button that stores to a new public `blog-images` bucket and inserts markdown image syntax.

## 5. Navigation

- `DashboardShell`: add "Write a blog" for all authenticated users
- Admin nav: add "Blog submissions" and "Blog packages"

## 6. SEO / Sitemap

Extend the existing sitemap generator to include published blog posts. Ensure `blog.$slug.tsx` head() sets title, description, og:*, twitter:*, and Article JSON-LD from post data (fill any gaps).

## Out of scope (not requested)
- Plagiarism detection (surface a placeholder note only if the user later asks)
- Auto-renewal billing (manual renewal via re-pay)
