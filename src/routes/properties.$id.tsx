import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { properties as mockProps, formatKsh } from "@/lib/mock-data";
import { fetchPropertyRowById, toProperty } from "@/lib/properties";
import { coordsFor, osmEmbedUrl, osmLinkUrl } from "@/lib/kenya-locations";
import { supabase } from "@/integrations/supabase/client";
import {
  Bed, Bath, Maximize, MapPin, Phone, MessageCircle, Share2, Check, ArrowLeft, ExternalLink,
  Calendar, User as UserIcon, AlertCircle, PlayCircle, FileText, Download, Heart, GitCompareArrows,
  Printer, Eye, Bookmark, ChevronLeft, ChevronRight, X, Calculator, Home as HomeIcon, Car,
  Ruler, ShieldCheck, Star, Copy,
} from "lucide-react";
import { PropertyCard } from "@/components/site/PropertyCard";
import { useEffect, useMemo, useState, useCallback } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { trackRecentlyViewed } from "@/hooks/use-recently-viewed";
import { RecentlyViewedRail } from "@/components/site/RecentlyViewedRail";
import { setSupportOverride } from "@/lib/support";
import { SimilarProperties } from "@/components/site/SimilarProperties";
import { VerificationScoreCard } from "@/components/property/VerificationScoreCard";
import { InvestmentScoreCard } from "@/components/property/InvestmentScoreCard";
import { PropertyTimeline } from "@/components/property/PropertyTimeline";
import { AgentPerformanceCard } from "@/components/agent/AgentPerformanceCard";
import { AppointmentBookingForm } from "@/components/site/AppointmentBookingForm";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/properties/$id")({
  loader: async ({ params }) => {
    const mock = mockProps.find(x => x.id === params.id);
    if (mock) return {
      p: mock, ownerId: null as string | null, propertyKey: params.id,
      ownerProfile: null as null | { full_name: string | null; avatar_url: string | null; phone: string | null; company: string | null },
      videoUrl: null as string | null, tourUrl: null as string | null, documents: [] as Array<{ name: string; url: string }>,
      verificationScore: null as number | null, investmentScore: null as number | null,
      latOverride: null as number | null, lngOverride: null as number | null,
      contactPhone: null as string | null, contactWhatsapp: null as string | null,
      createdAt: null as string | null, verified: !!mock.verified, featured: !!mock.featured,
    };
    const row = await fetchPropertyRowById(params.id);
    if (!row) throw notFound();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, phone, company")
      .eq("id", row.owner_id).maybeSingle();
    const [{ data: vScore }, { data: iScore }] = await Promise.all([
      supabase.rpc("property_verification_score", { _property_id: row.id }),
      supabase.rpc("property_investment_score", { _property_id: row.id }),
    ]);
    const verificationScore = Array.isArray(vScore) ? ((vScore[0] as any)?.score ?? null) : null;
    const investmentScore = iScore != null ? Number(iScore) : null;
    const docsRaw = Array.isArray(row.documents) ? row.documents : [];
    const documents = docsRaw
      .filter((d: any) => d && typeof d === "object" && typeof d.url === "string")
      .map((d: any) => ({ name: String(d.name ?? "Document"), url: String(d.url) }));
    return {
      p: toProperty(row), ownerId: row.owner_id, propertyKey: row.id,
      ownerProfile: (profile ?? null) as any,
      contactPhone: row.contact_phone, contactWhatsapp: row.contact_whatsapp,
      videoUrl: row.video_url ?? null, tourUrl: (row as any).tour_url ?? null, documents,
      latOverride: row.lat != null ? Number(row.lat) : null,
      lngOverride: row.lng != null ? Number(row.lng) : null,
      createdAt: row.created_at ?? null,
      verified: !!row.verified, featured: !!(row.is_featured ?? row.featured),
      verificationScore: verificationScore as number | null,
      investmentScore: investmentScore as number | null,
    };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Property not found" }, { name: "robots", content: "noindex" }] };
    const slugOrId = loaderData.p.slug ?? params.id;
    const url = `https://find-joy-list.lovable.app/properties/${slugOrId}`;
    const p = loaderData.p;
    const desc = p.description.slice(0, 155);
    return {
      meta: [
        { title: `${p.title} — Foxwood Properties` },
        { name: "description", content: desc },
        { property: "og:title", content: p.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: p.image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: p.image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify({
          "@context": "https://schema.org", "@type": "Product",
          name: p.title, description: desc, image: p.images ?? [p.image],
          category: `${p.category} — ${p.type}`,
          offers: { "@type": "Offer", price: p.price, priceCurrency: "KES", availability: "https://schema.org/InStock", url },
          brand: { "@type": "Organization", name: "Foxwood Properties" },
          additionalProperty: [
            loaderData.verificationScore != null
              ? { "@type": "PropertyValue", name: "Foxwood Verification Score", value: loaderData.verificationScore, maxValue: 100, unitText: "percent" }
              : null,
            loaderData.investmentScore != null
              ? { "@type": "PropertyValue", name: "Foxwood Investment Score", value: loaderData.investmentScore, maxValue: 10 }
              : null,
          ].filter(Boolean),
          ...(loaderData.verificationScore != null
            ? {
                review: {
                  "@type": "Review",
                  name: "Foxwood verification assessment",
                  author: { "@type": "Organization", name: "Foxwood Properties" },
                  reviewRating: {
                    "@type": "Rating",
                    ratingValue: Math.round((loaderData.verificationScore / 10) * 10) / 10,
                    bestRating: 10,
                    worstRating: 0,
                  },
                },
              }
            : {}),
        }) },
        { type: "application/ld+json", children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": p.category === "For Rent" || p.category === "For Lease" ? "RentAction" : "RealEstateListing",
          name: p.title,
          description: desc,
          url,
          image: p.images ?? [p.image],
          datePosted: loaderData.createdAt ?? undefined,
          address: {
            "@type": "PostalAddress",
            streetAddress: p.area || undefined,
            addressLocality: p.town,
            addressRegion: p.county,
            addressCountry: "KE",
          },
          numberOfRooms: p.bedrooms || undefined,
          numberOfBathroomsTotal: p.bathrooms || undefined,
          floorSize: p.size ? { "@type": "QuantitativeValue", name: p.size } : undefined,
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "KES",
            availability: "https://schema.org/InStock",
            url,
          },
          amenityFeature: (p.amenities ?? []).map((a) => ({ "@type": "LocationFeatureSpecification", name: a })),
        }) },
        { type: "application/ld+json", children: JSON.stringify({
          "@context": "https://schema.org", "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://find-joy-list.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Properties", item: "https://find-joy-list.lovable.app/properties" },
            { "@type": "ListItem", position: 3, name: p.category, item: `https://find-joy-list.lovable.app/properties?category=${encodeURIComponent(p.category)}` },
            { "@type": "ListItem", position: 4, name: p.title, item: url },
          ],
        }) },
      ],
    };
  },
  errorComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <Link to="/properties" className="btn-primary btn-primary-hover mt-6">Back to listings</Link>
    </div>
  ),
  notFoundComponent: PropertyNotFound,

  component: Detail,
});

const inquirySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  preferred_date: z.string().optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message is too short").max(1000),
});

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  const only = digits.replace(/\D/g, "");
  if (only.length < 9 || only.length > 15) return null;
  if (digits.startsWith("+")) return digits;
  if (only.startsWith("0")) return "+254" + only.slice(1);
  if (only.startsWith("254")) return "+" + only;
  return "+" + only;
}

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") { const id = u.searchParams.get("v"); if (id) return `https://www.youtube.com/embed/${id}`; }
    if (host === "youtu.be") { const id = u.pathname.slice(1); if (id) return `https://www.youtube.com/embed/${id}`; }
    if (host === "vimeo.com") { const id = u.pathname.split("/").filter(Boolean)[0]; if (id) return `https://player.vimeo.com/video/${id}`; }
    return null;
  } catch { return null; }
}

// Group free-text features into logical buckets by keyword.
const FEATURE_BUCKETS: Array<{ key: string; label: string; match: RegExp }> = [
  { key: "sec", label: "Security", match: /cctv|guard|gated|alarm|electric fence|fence|24\/7|security/i },
  { key: "util", label: "Utilities", match: /water|electricity|fibre|fiber|internet|wi-?fi|borehole|backup|generator|solar|power/i },
  { key: "ext", label: "Exterior", match: /pool|garden|parking|balcony|patio|perimeter|road|title|fenced|yard|garage/i },
  { key: "int", label: "Interior", match: /kitchen|wardrobe|laundry|furnished|dining|ensuite|master|study|floor|tiles/i },
];
function groupFeatures(features: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = { int: [], ext: [], util: [], sec: [], other: [] };
  for (const f of features) {
    const b = FEATURE_BUCKETS.find(b => b.match.test(f));
    (out[b?.key ?? "other"] ??= []).push(f);
  }
  return out;
}

function PropertyNotFound() {
  return (
    <>
      <div
        className="relative border-b border-border overflow-hidden"
        style={{ background: `linear-gradient(120deg, color-mix(in oklab, var(--primary) 92%, black) 0%, color-mix(in oklab, var(--primary) 70%, black) 55%, color-mix(in oklab, var(--secondary) 55%, black) 100%)` }}
      >
        <div className="absolute inset-0 hero-grid-bg opacity-30" />
        <div className="relative container-page py-10 md:py-14 text-white">
          <nav aria-label="Breadcrumb" className="text-xs text-white/80 mb-2 flex items-center gap-1.5">
            <Link to="/" className="hover:underline">Home</Link>
            <span>/</span>
            <Link to="/properties" className="hover:underline">Properties</Link>
            <span>/</span>
            <span>Not found</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold">Property not found</h1>
          <p className="mt-2 text-white/85 max-w-2xl">
            The listing you're looking for may have been removed, renamed, or is no longer available.
          </p>
        </div>
      </div>

      <section className="container-page py-14">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
            <AlertCircle className="h-8 w-8" />
          </div>
          <p className="mt-6 text-muted-foreground">
            Try browsing all listings, or head back home to start a fresh search.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/properties" className="btn-primary btn-primary-hover">Browse all properties</Link>
            <Link to="/" className="btn-ghost">Back to home</Link>
            <Link to="/contact" className="btn-ghost">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Detail() {
  const loaderData = Route.useLoaderData();

  const { p, ownerId, propertyKey, ownerProfile, contactPhone, contactWhatsapp, videoUrl, tourUrl, documents, createdAt, verified, featured } = loaderData;
  const gallery = (p.images && p.images.length ? p.images : [p.image]);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const compare = useCompare();
  const related = mockProps.filter(x => x.id !== p.id && (x.type === p.type || x.county === p.county)).slice(0, 3);
  const fallback = coordsFor(p.town, p.county);
  const lat = loaderData.latOverride ?? fallback.lat;
  const lng = loaderData.lngOverride ?? fallback.lng;
  const grouped = useMemo(() => groupFeatures(p.features || []), [p.features]);
  const isNew = createdAt ? (Date.now() - new Date(createdAt).getTime()) < 1000 * 60 * 60 * 24 * 14 : false;

  // Live stats
  const viewsQ = useQuery({
    queryKey: ["prop-views", propertyKey], enabled: !!ownerId,
    queryFn: async () => {
      const { count } = await supabase.from("property_views").select("*", { count: "exact", head: true }).eq("property_key", propertyKey);
      return count ?? 0;
    },
  });
  const savesQ = useQuery({
    queryKey: ["prop-saves", propertyKey], enabled: !!ownerId,
    queryFn: async () => {
      const { count } = await supabase.from("favorites").select("*", { count: "exact", head: true }).eq("property_key", propertyKey);
      return count ?? 0;
    },
  });

  useEffect(() => {
    trackRecentlyViewed(p.id);
    if (!ownerId) return;
    const key = `viewed:${propertyKey}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.auth.getUser().then(({ data }) => {
      supabase.from("property_views").insert({ property_key: propertyKey, viewer_user_id: data.user?.id ?? null }).then(() => {});
    });
  }, [p.id, propertyKey, ownerId]);

  // Set support context so the floating WhatsApp mentions this property.
  useEffect(() => {
    const ref = p.id ? ` — ref: ${p.id}` : "";
    setSupportOverride({ context: "property", extra: `re: ${p.title}${ref}` });
    return () => setSupportOverride(null);
  }, [p.id, p.title]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (!lightbox) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setActive(a => (a + 1) % gallery.length);
      if (e.key === "ArrowLeft") setActive(a => (a - 1 + gallery.length) % gallery.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lightbox, gallery.length]);

  const share = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch (e: any) { if (e?.name !== "AbortError") toast.error("Couldn't share — copy the URL manually."); }
  }, [p.title]);

  const copyId = async () => { await navigator.clipboard.writeText(p.id); toast.success("Property ID copied"); };

  return (
    <>
      {/* Hero band */}
      <div
        className="relative border-b border-border overflow-hidden"
        aria-hidden="true"
        style={{ background: `linear-gradient(120deg, color-mix(in oklab, var(--primary) 92%, black) 0%, color-mix(in oklab, var(--primary) 70%, black) 55%, color-mix(in oklab, var(--secondary) 55%, black) 100%)` }}
      >
        <div className="absolute inset-0 hero-grid-bg opacity-30" />
        <div className="relative container-page py-5 md:py-7 text-white">
          <nav aria-label="Breadcrumb" className="text-xs text-white/80 mb-2 flex items-center gap-1.5">
            <Link to="/" className="hover:underline">Home</Link>
            <span>/</span>
            <Link to="/properties" className="hover:underline">Properties</Link>
            <span>/</span>
            <span className="truncate max-w-[50vw]">{p.title}</span>
          </nav>
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white/85">{p.category} · {p.type}</div>
          <h1 className="mt-1 text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight max-w-4xl">{p.title}</h1>
          <div className="mt-1 flex items-center gap-1 text-xs sm:text-sm text-white/85"><MapPin className="h-3.5 w-3.5" /> {p.area}, {p.town}, {p.county}</div>
        </div>
      </div>

      <section className="container-page pt-5">
        <Link to="/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> All properties</Link>
      </section>

      {/* Gallery */}
      <section className="container-page mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <button
          type="button" onClick={() => setLightbox(true)}
          className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted shadow-soft group text-left"
          aria-label="Open image gallery"
        >
          <img src={gallery[active]} alt={p.title} loading="eager" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-foreground/40 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[85%]">
            <Badge tone="secondary">{p.category}</Badge>
            <Badge tone="light">{p.type}</Badge>
            {featured && <Badge tone="gold">★ Featured</Badge>}
            {verified && <Badge tone="primary"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
            {isNew && <Badge tone="secondary">New</Badge>}
          </div>
          <div className="absolute bottom-4 right-4 rounded-full bg-foreground/70 backdrop-blur text-white text-xs font-semibold px-3 py-1">
            {active + 1} / {gallery.length}
          </div>
        </button>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => {
            const idx = i % gallery.length;
            const src = gallery[idx];
            const isLastWithMore = i === 3 && gallery.length > 4;
            return (
              <button key={i} onClick={() => { setActive(idx); if (isLastWithMore) setLightbox(true); }}
                className={`relative aspect-square rounded-2xl overflow-hidden bg-muted ring-offset-2 transition ${active === idx ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-border"}`}>
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover hover:opacity-90 transition" />
                {isLastWithMore && (
                  <div className="absolute inset-0 bg-foreground/55 grid place-items-center text-white font-bold">
                    +{gallery.length - 4} more
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Header meta + quick actions */}
      <section className="container-page mt-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">ID: <button onClick={copyId} className="hover:text-primary inline-flex items-center gap-1">{p.id} <Copy className="h-3 w-3" /></button></span>
              {createdAt && <span>· Listed {new Date(createdAt).toLocaleDateString()}</span>}
              {viewsQ.data != null && <span>· <Eye className="inline h-3 w-3" /> {viewsQ.data} views</span>}
              {savesQ.data != null && <span>· <Bookmark className="inline h-3 w-3" /> {savesQ.data} saves</span>}
            </div>
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              <div className="text-3xl md:text-4xl font-extrabold text-primary">
                {formatKsh(p.price)}<span className="text-base text-muted-foreground font-semibold">{p.priceSuffix ?? ""}</span>
              </div>
              <div className="text-xs text-muted-foreground">{p.category}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button onClick={() => toggleFav(propertyKey)} className={`btn-ghost ${isFavorite(propertyKey) ? "text-secondary" : ""}`} aria-pressed={isFavorite(propertyKey)}>
              <Heart className={`h-4 w-4 ${isFavorite(propertyKey) ? "fill-current" : ""}`} /> {isFavorite(propertyKey) ? "Saved" : "Save"}
            </button>
            <button onClick={() => compare.toggle(propertyKey)} className={`btn-ghost ${compare.has(propertyKey) ? "text-primary" : ""}`}>
              <GitCompareArrows className="h-4 w-4" /> {compare.has(propertyKey) ? "In compare" : "Compare"}
            </button>
            <button onClick={share} className="btn-ghost"><Share2 className="h-4 w-4" /> Share</button>
            <button onClick={() => window.print()} className="btn-ghost"><Printer className="h-4 w-4" /> Print</button>
          </div>
        </div>
      </section>

      {/* Main + Sidebar */}
      <section className="container-page py-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8 min-w-0">
          {/* Quick overview */}
          <div>
            <h2 className="text-xl font-bold mb-3">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {p.bedrooms > 0 && <Stat icon={Bed} label="Bedrooms" value={p.bedrooms} />}
              {p.bathrooms > 0 && <Stat icon={Bath} label="Bathrooms" value={p.bathrooms} />}
              <Stat icon={Maximize} label="Size" value={p.size || "—"} />
              <Stat icon={HomeIcon} label="Type" value={p.type} />
              <Stat icon={MapPin} label="Location" value={p.town} />
              <Stat icon={Ruler} label="Category" value={p.category} />
              <Stat icon={Car} label="Parking" value={/parking/i.test((p.features || []).join(" ")) ? "Yes" : "—"} />
              <Stat icon={Check} label="Furnished" value={/furnished/i.test((p.features || []).join(" ")) ? "Yes" : "—"} />
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold">Description</h2>
            <p className="mt-3 text-foreground/80 leading-relaxed whitespace-pre-line">{p.description}</p>
          </div>

          {/* Features grouped */}
          {p.features?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold">Property features</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {FEATURE_BUCKETS.map(b => (
                  grouped[b.key]?.length ? (
                    <div key={b.key} className="rounded-2xl border border-border bg-card p-4">
                      <div className="font-semibold text-sm mb-2 text-primary">{b.label}</div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {grouped[b.key].map(f => (
                          <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary shrink-0" /> {f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null
                ))}
                {grouped.other?.length ? (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="font-semibold text-sm mb-2 text-primary">Other</div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {grouped.other.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary shrink-0" /> {f}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Amenities Nearby */}
          {p.amenities?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold">Amenities & nearby</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.amenities.map((a: string) => (
                  <span key={a} className="rounded-full bg-primary-soft text-primary px-3 py-1.5 text-xs font-semibold">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {videoUrl && (
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><PlayCircle className="h-5 w-5 text-primary" /> Video tour</h2>
              <div className="mt-3 aspect-video rounded-2xl overflow-hidden border border-border bg-black">
                {toEmbed(videoUrl) ? (
                  <iframe src={toEmbed(videoUrl)!} title="Property video" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                ) : (
                  <video src={videoUrl} controls className="h-full w-full" preload="metadata" />
                )}
              </div>
            </div>
          )}

          {/* 360° virtual tour */}
          {tourUrl && (
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><PlayCircle className="h-5 w-5 text-primary" /> 360° virtual tour</h2>
              <div className="mt-3 aspect-video rounded-2xl overflow-hidden border border-border bg-black">
                <iframe src={tourUrl} title="360° virtual tour" className="h-full w-full" allow="xr-spatial-tracking; accelerometer; gyroscope; fullscreen" allowFullScreen loading="lazy" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Drag to look around · Pinch or scroll to zoom.</p>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Documents & floor plans</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {documents.map((d: { name: string; url: string }, i: number) => (
                  <a key={i} href={d.url} target="_blank" rel="noreferrer" download
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary shrink-0"><FileText className="h-5 w-5" /></span>
                    <span className="flex-1 min-w-0 text-sm font-medium truncate">{d.name}</span>
                    <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Location</h2>
              <div className="flex gap-3 text-xs">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="text-primary font-semibold inline-flex items-center gap-1 hover:underline">Get directions <ExternalLink className="h-3 w-3" /></a>
                <a href={osmLinkUrl(lat, lng)} target="_blank" rel="noreferrer" className="text-primary font-semibold inline-flex items-center gap-1 hover:underline">Open map <ExternalLink className="h-3 w-3" /></a>
              </div>
            </div>
            <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-border">
              <iframe title={`Map of ${p.town}`} src={osmEmbedUrl(lat, lng)} className="h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Approximate location — {p.area ? `${p.area}, ` : ""}{p.town}, {p.county}. Contact the agent for the exact address.</p>
          </div>

          {/* Foxwood Verification Score */}
          <VerificationScoreCard propertyId={propertyKey} propertyType={p.type} />

          {/* Investment Score */}
          <InvestmentScoreCard propertyId={propertyKey} />

          {/* Property history timeline */}
          <PropertyTimeline propertyId={propertyKey} propertyKey={propertyKey} />

          {/* Agent performance */}
          {ownerId && <AgentPerformanceCard agentId={ownerId} />}

          {/* Reviews (lightweight placeholder) */}
          <ReviewsSection propertyKey={propertyKey} />


          {/* Final CTA */}
          <div className="rounded-2xl overflow-hidden relative p-6 md:p-8 text-white"
            style={{ background: `linear-gradient(120deg, color-mix(in oklab, var(--primary) 92%, black), color-mix(in oklab, var(--secondary) 60%, black))` }}>
            <h3 className="text-2xl md:text-3xl font-extrabold">Ready to own or rent this property?</h3>
            <p className="mt-1 text-white/90 text-sm md:text-base">Talk to a Foxwood agent today — quick answers, honest advice, no obligation.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="#inquiry-form" className="btn-primary btn-primary-hover bg-white !text-primary hover:!opacity-90"><MessageCircle className="h-4 w-4" /> Contact agent</a>
              <a href="#inquiry-form" className="btn-secondary"><Calendar className="h-4 w-4" /> Book a viewing</a>
              <WhatsAppLink phone={normalizePhone(contactWhatsapp) ?? normalizePhone(contactPhone) ?? normalizePhone(ownerProfile?.phone ?? null)} title={p.title} className="btn-ghost bg-white/10 text-white border border-white/30 hover:bg-white/20" />
              <Link to="/properties" className="btn-ghost bg-white/10 text-white border border-white/30 hover:bg-white/20"><HomeIcon className="h-4 w-4" /> Browse similar</Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <AgentCard ownerId={ownerId} profile={ownerProfile} title={p.title} contactPhone={contactPhone ?? null} contactWhatsapp={contactWhatsapp ?? null} />
          <MortgageMini price={p.price} />
          <AppointmentBookingForm propertyId={propertyKey} propertyTitle={p.title} />
          <InquiryForm propertyKey={propertyKey} ownerId={ownerId} propertyTitle={p.title} />
        </aside>
      </section>

      {/* Similar properties (live from DB) */}
      <SimilarProperties
        currentId={p.id}
        category={p.category}
        type={p.type}
        county={p.county}
        price={p.price}
      />


      <RecentlyViewedRail excludeId={p.id} />

      {/* Mobile sticky CTA */}
      <MobileCta price={p.price} priceSuffix={p.priceSuffix} town={p.town} area={p.area} title={p.title} contactPhone={contactPhone ?? null} contactWhatsapp={contactWhatsapp ?? null} profilePhone={ownerProfile?.phone ?? null} />

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col print:hidden" role="dialog" aria-modal="true" aria-label="Image gallery">
          <div className="flex items-center justify-between p-3 text-white">
            <div className="text-sm font-semibold">{active + 1} / {gallery.length}</div>
            <button onClick={() => setLightbox(false)} aria-label="Close" className="p-2 rounded-full hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="relative flex-1 grid place-items-center">
            <img src={gallery[active]} alt={p.title} className="max-h-full max-w-full object-contain" />
            {gallery.length > 1 && (
              <>
                <button onClick={() => setActive(a => (a - 1 + gallery.length) % gallery.length)} aria-label="Previous image" className="absolute left-3 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft className="h-6 w-6" /></button>
                <button onClick={() => setActive(a => (a + 1) % gallery.length)} aria-label="Next image" className="absolute right-3 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight className="h-6 w-6" /></button>
              </>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="p-3 overflow-x-auto flex gap-2 justify-center">
              {gallery.map((src: string, i: number) => (
                <button key={i} onClick={() => setActive(i)} className={`h-16 w-24 rounded-lg overflow-hidden shrink-0 ring-offset-2 ring-offset-black ${i === active ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "primary" | "secondary" | "light" | "gold" }) {
  const cls =
    tone === "secondary" ? "bg-secondary text-secondary-foreground" :
    tone === "primary" ? "bg-primary text-primary-foreground" :
    tone === "gold" ? "bg-amber-400 text-amber-950" :
    "bg-background/95 text-primary";
  return <span className={`inline-flex items-center gap-1 rounded-full text-xs font-semibold px-3 py-1 shadow-soft ${cls}`}>{children}</span>;
}

function WhatsAppLink({ phone, title, className }: { phone: string | null; title: string; className?: string }) {
  if (!phone) return null;
  const href = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in "${title}" on Foxwood Properties.`)}`;
  return <a href={href} target="_blank" rel="noreferrer" className={className ?? "btn-secondary"}><MessageCircle className="h-4 w-4" /> WhatsApp agent</a>;
}

function MortgageMini({ price }: { price: number }) {
  const [deposit, setDeposit] = useState(Math.round(price * 0.2));
  const [rate, setRate] = useState(13);
  const [years, setYears] = useState(20);
  const principal = Math.max(0, price - deposit);
  const monthly = useMemo(() => {
    const r = rate / 100 / 12; const n = years * 12;
    if (r === 0) return principal / n;
    return (principal * r) / (1 - Math.pow(1 + r, -n));
  }, [principal, rate, years]);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 font-bold text-sm"><Calculator className="h-4 w-4 text-primary" /> Mortgage calculator</div>
      <div className="mt-3 space-y-2 text-sm">
        <label className="block">
          <span className="text-xs text-muted-foreground">Deposit (KES)</span>
          <input type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-muted-foreground">Rate %</span>
            <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Years</span>
            <input type="number" value={years} onChange={e => setYears(Number(e.target.value) || 1)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </label>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-primary-soft p-3">
        <div className="text-xs text-muted-foreground">Estimated monthly</div>
        <div className="text-lg font-extrabold text-primary">{formatKsh(Math.round(monthly))}<span className="text-xs text-muted-foreground">/mo</span></div>
      </div>
      <Link to="/mortgage" className="block text-center mt-2 text-xs text-primary font-semibold hover:underline">Full calculator →</Link>
    </div>
  );
}

function ReviewsSection({ propertyKey }: { propertyKey: string }) {
  const { data } = useQuery({
    queryKey: ["reviews", propertyKey],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("id, rating, comment, created_at").eq("target_type", "property").eq("target_id", propertyKey).eq("status", "approved").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });
  const reviews = data ?? [];
  const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length : 0;
  return (
    <div>
      <h2 className="text-xl font-bold flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> Reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No reviews yet. Verified visitors can leave reviews after a viewing.</p>
      ) : (
        <>
          <div className="mt-2 text-sm text-muted-foreground">Average <span className="font-bold text-foreground">{avg.toFixed(1)}</span> from {reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
          <ul className="mt-3 space-y-3">
            {reviews.map((r: any) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-1 text-amber-500 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < (r.rating || 0) ? "fill-current" : "opacity-30"}`} />)}
                </div>
                <p className="mt-2 text-sm text-foreground/80">{r.body}</p>
                <div className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function MobileCta({ price, priceSuffix, town, area, title, contactPhone, contactWhatsapp, profilePhone }:
  { price: number; priceSuffix?: string; town: string; area: string; title: string; contactPhone: string | null; contactWhatsapp: string | null; profilePhone: string | null }) {
  const phone = normalizePhone(contactPhone) ?? normalizePhone(profilePhone);
  const wa = normalizePhone(contactWhatsapp) ?? phone;
  const scrollToInquiry = () => document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  return (
    <div className="lg:hidden sticky bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift print:hidden">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground truncate">{area}, {town}</div>
          <div className="text-base font-extrabold text-primary truncate">{formatKsh(price)}<span className="text-xs text-muted-foreground">{priceSuffix ?? ""}</span></div>
        </div>
        {phone ? (
          <a href={`tel:${phone}`} aria-label="Call agent" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft"><Phone className="h-4 w-4" /></a>
        ) : (
          <button onClick={() => { toast("No phone on this listing", { description: "Use the inquiry form to reach the agent." }); scrollToInquiry(); }} aria-label="No phone available" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Phone className="h-4 w-4" /></button>
        )}
        {wa ? (
          <a href={`https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in "${title}" on Foxwood Properties.`)}`} target="_blank" rel="noreferrer" className="btn-secondary shrink-0 !py-2.5 !px-4 text-sm"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
        ) : (
          <button onClick={scrollToInquiry} className="btn-secondary shrink-0 !py-2.5 !px-4 text-sm opacity-70"><MessageCircle className="h-4 w-4" /> Inquire</button>
        )}
      </div>
    </div>
  );
}

function AgentCard({ ownerId, profile, title, contactPhone, contactWhatsapp }:
  { ownerId: string | null; profile: { full_name: string | null; avatar_url: string | null; phone: string | null; company: string | null } | null; title: string; contactPhone: string | null; contactWhatsapp: string | null }) {
  const name = profile?.full_name ?? "Foxwood Agent";
  const initials = name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const phone = normalizePhone(contactPhone) ?? normalizePhone(profile?.phone ?? null);
  const wa = normalizePhone(contactWhatsapp) ?? phone;
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch (e: any) { if (e?.name !== "AbortError") toast.error("Couldn't share — copy the URL manually."); }
  };
  const scrollToInquiry = () => document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-3">
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt={name} className="h-12 w-12 rounded-full object-cover" />
          : <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">{initials || "FA"}</div>}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{name}</div>
          <div className="text-xs text-muted-foreground truncate">{profile?.company ?? "Verified · Kenya"}</div>
        </div>
      </div>
      {!phone && !wa && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/10 border border-secondary/20 p-3 text-xs text-foreground/80">
          <AlertCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
          <span>This agent hasn't added a phone number. Use the inquiry form below to get in touch.</span>
        </div>
      )}
      <div className="mt-5 space-y-2">
        {phone ? (
          <a href={`tel:${phone}`} className="btn-primary btn-primary-hover w-full"><Phone className="h-4 w-4" /> Call {phone}</a>
        ) : (
          <button type="button" onClick={scrollToInquiry} className="btn-primary btn-primary-hover w-full opacity-80"><Phone className="h-4 w-4" /> Request callback</button>
        )}
        {wa ? (
          <a href={`https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in "${title}" on Foxwood Properties.`)}`} target="_blank" rel="noreferrer" className="btn-secondary w-full"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
        ) : (
          <button type="button" onClick={scrollToInquiry} className="btn-secondary w-full opacity-80"><MessageCircle className="h-4 w-4" /> Message via form</button>
        )}
        <button type="button" onClick={share} className="btn-ghost w-full"><Share2 className="h-4 w-4" /> Share</button>
        {ownerId && (
          <Link to="/agents/$id" params={{ id: ownerId }} className="btn-ghost w-full"><UserIcon className="h-4 w-4" /> View profile</Link>
        )}
      </div>
      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3">
        <div className="text-xs font-semibold text-foreground/80">Need Help? Contact Foxwood Properties</div>
        <div className="text-[11px] text-muted-foreground">Support: +254 759 556 026</div>
        <div className="mt-2 flex gap-2">
          <a
            href="tel:+254759556026"
            onClick={() => { void import("@/lib/support").then(m => m.trackSupportClick("call", "property")); }}
            className="btn-ghost !py-1.5 !px-3 text-xs flex-1 justify-center"
          >
            <Phone className="h-3.5 w-3.5" /> Call Admin
          </a>
          <a
            href={`https://wa.me/254759556026?text=${encodeURIComponent(`Hello Foxwood Properties, I need assistance about "${title}".`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { void import("@/lib/support").then(m => m.trackSupportClick("whatsapp", "property")); }}
            className="btn-ghost !py-1.5 !px-3 text-xs flex-1 justify-center"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Admin
          </a>
        </div>
      </div>
    </div>
  );
}

function InquiryForm({ propertyKey, ownerId, propertyTitle }: { propertyKey: string; ownerId: string | null; propertyTitle: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "", email: user?.email ?? "", phone: "", preferred_date: "",
    message: `I'd like to request a viewing for "${propertyTitle}".`,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = inquirySchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const iss of parsed.error.issues) errs[iss.path[0] as string] = iss.message;
      setErrors(errs); toast.error(parsed.error.issues[0].message); return;
    }
    setErrors({}); setBusy(true);
    try {
      const { error } = await supabase.from("inquiries").insert({
        property_key: propertyKey, owner_id: ownerId, sender_user_id: user?.id ?? null,
        name: parsed.data.name, email: parsed.data.email,
        phone: parsed.data.phone || null, preferred_date: parsed.data.preferred_date || null,
        message: parsed.data.message,
      });
      if (error) throw error;
      toast.success("Inquiry sent — the agent will be in touch.");
      setForm({ ...form, message: "", phone: "", preferred_date: "" });
    } catch (e: any) { toast.error(e.message ?? "Failed to send — please try again."); }
    finally { setBusy(false); }
  }

  const inputCls = (field: string) => `w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary ${errors[field] ? "border-destructive" : "border-border"}`;

  return (
    <form id="inquiry-form" onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-3">
      <div>
        <h3 className="font-bold text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Quick enquiry</h3>
        <p className="text-xs text-muted-foreground mt-1">Send the agent an inquiry or request a callback.</p>
      </div>
      <div>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" className={inputCls("name")} />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>
      <div>
        <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inputCls("email")} />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>
      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className={inputCls("phone")} />
      <div>
        <label className="text-xs text-muted-foreground">Preferred viewing date</label>
        <input type="date" value={form.preferred_date} onChange={e => setForm({ ...form, preferred_date: e.target.value })} className={"mt-1 " + inputCls("preferred_date")} />
      </div>
      <div>
        <textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} className={inputCls("message")} />
        {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
      </div>
      <button disabled={busy} className="btn-primary btn-primary-hover w-full">{busy ? "Sending…" : "Send inquiry"}</button>
    </form>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border p-4 bg-card">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4 text-primary" /> {label}</div>
      <div className="mt-1 font-bold text-lg truncate">{value}</div>
    </div>
  );
}
