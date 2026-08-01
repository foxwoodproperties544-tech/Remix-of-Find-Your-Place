import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import { RequestCard } from "@/components/requests/RequestCard";
import { RequestCardSkeletonGrid } from "@/components/requests/RequestCardSkeleton";
import { RequestsErrorState } from "@/components/requests/RequestsErrorState";
import { fetchRequests, REQUEST_SORTS, REQUEST_KINDS, KIND_LABEL, type RequestFilters, type RequestSort } from "@/lib/property-requests";
import { ALL_TYPES } from "@/lib/taxonomy";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import { absoluteUrl } from "@/lib/site-url";
import { PlusCircle, SlidersHorizontal, Loader2 } from "lucide-react";
import { RequestStats } from "@/components/requests/RequestStats";
import heroTools from "@/assets/hero-tools.jpg";


const TITLE = "Property Requests in Kenya — Buyers & Tenants | Foxwood Properties";
const DESC = "Browse live property requests from verified buyers and tenants across Kenya. Agents, developers and owners can respond with matching listings.";

export const Route = createFileRoute("/property-requests/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/property-requests") }],
  }),
  component: BrowseRequests,
});

const PER_PAGE = 12;

function BrowseRequests() {
  const [f, setF] = useState<RequestFilters>({ sort: "newest" });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(() => ({ ...f, page, perPage: PER_PAGE }), [f, page]);
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["property-requests", filters],
    queryFn: () => fetchRequests(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const set = <K extends keyof RequestFilters>(k: K, v: RequestFilters[K]) => {
    setPage(1);
    setF((p) => ({ ...p, [k]: v === "" || v === undefined ? undefined : v }));
  };

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHero
        image={heroTools}
        eyebrow="Property Request Marketplace"
        title="What buyers and tenants are looking for"
        subtitle="Post what you need, or respond with a matching property. Verified agents, developers and owners compete to find the right match."
      />


      <section className="container-page py-10">
        <RequestStats />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            <p className="text-sm text-muted-foreground">{total} active request{total === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground" htmlFor="req-sort">Sort</label>
            <select
              id="req-sort"
              className="rounded-lg border border-border bg-field px-3 py-2 text-sm"
              value={f.sort ?? "newest"}
              onChange={(e) => set("sort", e.target.value as RequestSort)}
            >
              {REQUEST_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Link to="/dashboard/requests/new" className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:opacity-90">
              <PlusCircle className="h-4 w-4" /> Submit a Request
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 lg:sticky lg:top-24">
              <Field label="Request type">
                <select className="input-base" value={f.kind ?? ""} onChange={(e) => set("kind", e.target.value)}>
                  <option value="">Any</option>
                  {REQUEST_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </Field>
              <Field label="Property type">
                <select className="input-base" value={f.type ?? ""} onChange={(e) => set("type", e.target.value)}>
                  <option value="">Any</option>
                  {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="County">
                <select className="input-base" value={f.county ?? ""} onChange={(e) => set("county", e.target.value)}>
                  <option value="">Any</option>
                  {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Town">
                <input className="input-base" value={f.town ?? ""} onChange={(e) => set("town", e.target.value)} placeholder="e.g. Kitengela" />
              </Field>
              <Field label="Estate">
                <input className="input-base" value={f.estate ?? ""} onChange={(e) => set("estate", e.target.value)} placeholder="e.g. Milimani" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min budget">
                  <input type="number" className="input-base" value={f.minBudget ?? ""} onChange={(e) => set("minBudget", e.target.value ? Number(e.target.value) : undefined)} />
                </Field>
                <Field label="Max budget">
                  <input type="number" className="input-base" value={f.maxBudget ?? ""} onChange={(e) => set("maxBudget", e.target.value ? Number(e.target.value) : undefined)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bedrooms">
                  <input type="number" min={0} className="input-base" value={f.bedrooms ?? ""} onChange={(e) => set("bedrooms", e.target.value ? Number(e.target.value) : undefined)} />
                </Field>
                <Field label="Bathrooms">
                  <input type="number" min={0} className="input-base" value={f.bathrooms ?? ""} onChange={(e) => set("bathrooms", e.target.value ? Number(e.target.value) : undefined)} />
                </Field>
              </div>
              <Field label="Land size">
                <input className="input-base" value={f.landSize ?? ""} onChange={(e) => set("landSize", e.target.value)} placeholder="e.g. 1/8 acre" />
              </Field>
              <div className="space-y-2 pt-1">
                <Toggle label="Furnished" checked={!!f.furnished} onChange={(v) => set("furnished", v || undefined)} />
                <Toggle label="Featured only" checked={!!f.featured} onChange={(v) => set("featured", v || undefined)} />
                <Toggle label="Urgent only" checked={!!f.urgent} onChange={(v) => set("urgent", v || undefined)} />
                <Toggle label="Verified buyers" checked={!!f.verified} onChange={(v) => set("verified", v || undefined)} />
              </div>
              <button type="button" onClick={() => { setF({ sort: f.sort }); setPage(1); }} className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                Reset filters
              </button>
            </div>
          </aside>

          <div>
            {isLoading ? (
              <RequestCardSkeletonGrid count={6} />
            ) : isError ? (
              <RequestsErrorState onRetry={() => refetch()} retrying={isFetching} />
            ) : !data?.rows.length ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <p className="font-semibold">No requests match these filters yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Be the first to tell agents exactly what you're looking for.</p>
                <Link to="/dashboard/requests/new" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Submit a Request</Link>
              </div>
            ) : (
              <>
                <div className={`grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? "opacity-60 transition-opacity" : ""}`}>
                  {data.rows.map((r) => <RequestCard key={r.id} r={r} />)}
                </div>
                {pages > 1 && (
                  <nav className="mt-8 flex flex-col items-center gap-3" aria-label="Pagination">
                    {page < pages && (
                      <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={isFetching}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        {isFetching ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</> : "Load more requests"}
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <button disabled={page === 1 || isFetching} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
                      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
                      <button disabled={page >= pages || isFetching} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]" />
      {label}
    </label>
  );
}
