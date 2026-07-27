import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bookmark, Share2, Eye, MessageSquare, CalendarDays, Clock, MapPin, Flag, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { absoluteUrl } from "@/lib/site-url";
import { PropertyCard } from "@/components/site/PropertyCard";
import { RequestCard } from "@/components/requests/RequestCard";
import { ResponseThread } from "@/components/requests/ResponseThread";
import { toProperty, type DbPropertyRow } from "@/lib/properties";
import {
  budgetLabel,
  daysLeft,
  fetchRequestBySlug,
  fetchMatchWeights,
  matchScore,
  KIND_LABEL,
  logRequestView,
  type PropertyRequest,
} from "@/lib/property-requests";

export const Route = createFileRoute("/property-requests/$slug")({
  loader: async ({ params }) => {
    const request = await fetchRequestBySlug(params.slug);
    if (!request) throw notFound();
    return { request };
  },
  head: ({ loaderData }) => {
    const r = loaderData?.request as PropertyRequest | undefined;
    const title = r ? `${r.title} — Property Request | Foxwood Properties` : "Property Request | Foxwood Properties";
    const desc = r
      ? `${KIND_LABEL[r.kind] ?? r.kind} request for ${r.property_type} in ${[r.town, r.county].filter(Boolean).join(", ")}. Budget ${budgetLabel(r)}. Respond with a matching property on Foxwood.`
      : "Property request on Foxwood Properties.";
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 158) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 158) },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: r ? [{ rel: "canonical", href: absoluteUrl(`/property-requests/${r.slug ?? r.id}`) }] : [],
    };
  },
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Request not found</h1>
      <Link to="/property-requests" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Browse requests</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <Link to="/property-requests" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Browse requests</Link>
    </div>
  ),
  component: RequestDetail,
});

function RequestDetail() {
  const { request } = Route.useLoaderData() as { request: PropertyRequest };
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const left = daysLeft(request.expires_at);

  useEffect(() => { logRequestView(request.id, user?.id ?? null); }, [request.id, user?.id]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("property_request_saves" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("request_id", request.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, request.id]);

  async function toggleSave() {
    if (!user) return toast.error("Sign in to save requests");
    if (saved) {
      await supabase.from("property_request_saves" as any).delete().eq("user_id", user.id).eq("request_id", request.id);
      setSaved(false);
    } else {
      await supabase.from("property_request_saves" as any).insert({ user_id: user.id, request_id: request.id });
      setSaved(true);
      toast.success("Request saved");
    }
  }

  async function share() {
    const url = absoluteUrl(`/property-requests/${request.slug ?? request.id}`);
    if (navigator.share) { try { await navigator.share({ title: request.title, url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  async function report() {
    if (!user) return toast.error("Sign in to report a request");
    const reason = window.prompt("Why are you reporting this request?");
    if (!reason) return;
    const { error } = await supabase.from("property_request_reports" as any).insert({ request_id: request.id, reporter_id: user.id, reason });
    if (error) toast.error("Could not submit report");
    else toast.success("Thanks — our team will review this request.");
  }

  const { data: weights } = useQuery({ queryKey: ["match-weights"], queryFn: fetchMatchWeights, staleTime: 300_000 });

  const { data: matches } = useQuery({
    queryKey: ["request-matches", request.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "published")
        .eq("county", request.county)
        .limit(60);
      return (data ?? []) as unknown as DbPropertyRow[];
    },
    staleTime: 60_000,
  });

  const scored = useMemo(() => {
    if (!matches) return [];
    return matches
      .map((row) => {
        const p = toProperty(row);
        return { p, score: matchScore(request, p, weights) };
      })
      .filter((m) => m.score >= 45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [matches, request, weights]);

  const { data: similar } = useQuery({
    queryKey: ["similar-requests", request.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("property_requests" as any)
        .select("*")
        .eq("status", "active")
        .eq("county", request.county)
        .neq("id", request.id)
        .order("published_at", { ascending: false })
        .limit(3);
      return (data ?? []) as unknown as PropertyRequest[];
    },
    staleTime: 60_000,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Demand",
    name: request.title,
    description: request.description?.slice(0, 300),
    availabilityStarts: request.published_at,
    availabilityEnds: request.expires_at,
    areaServed: [request.town, request.county].filter(Boolean).join(", "),
    priceSpecification: {
      "@type": "PriceSpecification",
      priceCurrency: request.currency || "KES",
      minPrice: request.budget_min ?? undefined,
      maxPrice: request.budget_max ?? undefined,
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Property Requests", item: absoluteUrl("/property-requests") },
      { "@type": "ListItem", position: 3, name: request.title, item: absoluteUrl(`/property-requests/${request.slug ?? request.id}`) },
    ],
  };

  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> <span>/</span>{" "}
        <Link to="/property-requests" className="hover:text-primary">Property Requests</Link> <span>/</span>{" "}
        <span className="text-foreground">{request.title}</span>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{KIND_LABEL[request.kind] ?? request.kind}</span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{request.property_type}</span>
              {request.is_featured && <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white">Featured</span>}
              {request.is_urgent && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Urgent</span>}
              <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">{request.status}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight">{request.title}</h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {[request.estate, request.town, request.county].filter(Boolean).join(", ")}
            </p>
            <p className="mt-4 text-2xl font-bold text-primary">{budgetLabel(request)}</p>
          </header>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold">What the buyer is looking for</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{request.description || "No extra description provided."}</p>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
              {request.bedrooms != null && <Detail label="Bedrooms" value={`${request.bedrooms}+`} />}
              {request.bathrooms != null && <Detail label="Bathrooms" value={`${request.bathrooms}+`} />}
              {request.parking != null && <Detail label="Parking" value={String(request.parking)} />}
              {request.land_size && <Detail label="Land size" value={request.land_size} />}
              {request.building_size && <Detail label="Building size" value={request.building_size} />}
              <Detail label="Furnished" value={request.furnished ? "Yes" : "Not required"} />
              {request.preferred_location && <Detail label="Preferred location" value={request.preferred_location} />}
              {request.move_date && <Detail label="Preferred move date" value={new Date(request.move_date).toLocaleDateString()} />}
              {request.viewing_times && <Detail label="Viewing times" value={request.viewing_times} />}
            </dl>
            {request.amenities.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required amenities</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {request.amenities.map((a) => <span key={a} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">{a}</span>)}
                </div>
              </div>
            )}
            {request.images.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-3">
                {request.images.map((src, i) => (
                  <img key={i} src={src} alt={`Reference ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
          </section>

          {scored.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Sparkles className="h-5 w-5 text-secondary" /> Matching properties</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {scored.map(({ p, score }) => (
                  <div key={p.id} className="relative">
                    <span className="absolute -top-2 left-3 z-10 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-soft">{score}% Match</span>
                    <PropertyCard p={p} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <ResponseThread request={request} />
          </section>

          {similar && similar.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Similar property requests</h2>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {similar.map((s) => <RequestCard key={s.id} r={s} />)}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
            <Stat icon={MessageSquare} label="Responses" value={request.response_count} />
            <Stat icon={Eye} label="Views" value={request.view_count} />
            <Stat icon={CalendarDays} label="Posted" value={new Date(request.published_at ?? request.created_at).toLocaleDateString()} />
            <Stat icon={Clock} label="Expires" value={request.expires_at ? `${new Date(request.expires_at).toLocaleDateString()}${left != null && left > 0 ? ` (${left}d)` : ""}` : "—"} />
          </div>
          <button onClick={toggleSave} className={`w-full rounded-full px-5 py-2.5 text-sm font-semibold ${saved ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>
            <Bookmark className="mr-2 inline h-4 w-4" /> {saved ? "Saved" : "Save Request"}
          </button>
          <button onClick={share} className="w-full rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
            <Share2 className="mr-2 inline h-4 w-4" /> Share Request
          </button>
          <button onClick={report} className="w-full rounded-full border border-border px-5 py-2.5 text-xs text-muted-foreground hover:bg-muted">
            <Flag className="mr-2 inline h-3.5 w-3.5" /> Report abuse
          </button>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /> {label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
