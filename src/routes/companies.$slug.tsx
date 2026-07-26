import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck, Building2, Globe, Mail, MapPin, Phone, MessageCircle, Sparkles, Star,
  Clock, Eye, Inbox, ShieldQuestion, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  businessWhatsAppUrl, fetchBusinessBySlug, fetchBusinessProperties, fetchBusinessReviews,
  fetchCategories, type Business,
} from "@/lib/directory";
import { submitBusinessClaim, trackBusinessView } from "@/lib/directory.functions";
import { BusinessEnquiryForm } from "@/components/site/BusinessEnquiryForm";
import { PropertyCard } from "@/components/site/PropertyCard";
import { toProperty, type DbPropertyRow } from "@/lib/properties";
import { coordsFor, osmEmbedUrl } from "@/lib/kenya-locations";
import { useAuth } from "@/hooks/use-auth";
import { SITE_URL } from "@/lib/site-url";

export const Route = createFileRoute("/companies/$slug")({
  loader: async ({ params }) => {
    const b = await fetchBusinessBySlug(params.slug);
    if (!b || b.status !== "published") throw notFound();
    return { business: b };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Company not found — Foxwood Properties" }, { name: "robots", content: "noindex" }] };
    }
    const b = loaderData.business;
    const title = `${b.name} — Property Company in ${b.county ?? "Kenya"} | Foxwood Properties`;
    const desc =
      (b.short_description || b.description || `${b.name} on Foxwood Properties. View listings, contacts and reviews.`)
        .slice(0, 155);
    const url = `${SITE_URL}/companies/${params.slug}`;
    const meta: any[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    const img = b.cover_url || b.logo_url;
    if (img && /^https:\/\//.test(img)) {
      meta.push({ property: "og:image", content: img }, { name: "twitter:image", content: img });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
  component: CompanyProfile,
});

function Missing() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-semibold">Company not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This profile may have been removed or is not published.</p>
      <Link to="/companies" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Back to companies
      </Link>
    </div>
  );
}

function CompanyProfile() {
  const { business } = Route.useLoaderData() as { business: Business };
  const { user } = useAuth();
  const track = useServerFn(trackBusinessView);

  useEffect(() => {
    track({ data: { businessId: business.id } }).catch(() => {});
  }, [business.id]);

  const { data: categories = [] } = useQuery({ queryKey: ["business-categories"], queryFn: fetchCategories });
  const categoryName = categories.find((c) => c.id === business.category_id)?.name;

  const { data: props = [] } = useQuery({
    queryKey: ["business-properties", business.id],
    queryFn: () => fetchBusinessProperties(business.id),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["business-reviews", business.id],
    queryFn: () => fetchBusinessReviews(business.id),
  });

  const grouped = useMemo(() => {
    const rows = props as unknown as DbPropertyRow[];
    return {
      "For Sale": rows.filter((p) => p.category === "For Sale"),
      "For Rent": rows.filter((p) => p.category === "For Rent"),
      "For Lease": rows.filter((p) => p.category === "For Lease"),
    };
  }, [props]);

  const approved = (reviews as any[]).filter((r) => r.status === "approved");
  const rating = approved.length
    ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10) / 10
    : null;

  const coords = business.lat && business.lng ? { lat: business.lat, lng: business.lng } : coordsFor(business.town, business.county);
  const url = `${SITE_URL}/companies/${business.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: business.name,
    url,
    description: business.short_description || business.description || undefined,
    image: business.logo_url || undefined,
    telephone: business.phone || undefined,
    email: business.email || undefined,
    address: { "@type": "PostalAddress", addressLocality: business.town || undefined, addressRegion: business.county || undefined, addressCountry: "KE", streetAddress: business.address || undefined },
    aggregateRating: rating ? { "@type": "AggregateRating", ratingValue: rating, reviewCount: approved.length } : undefined,
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Companies", item: `${SITE_URL}/companies` },
      { "@type": "ListItem", position: 3, name: business.name, item: url },
    ],
  };

  const stats = [
    { label: "For Sale", value: grouped["For Sale"].length },
    { label: "For Rent", value: grouped["For Rent"].length },
    { label: "For Lease", value: grouped["For Lease"].length },
    { label: "Total properties", value: props.length },
    { label: "Total views", value: business.view_count },
    { label: "Total enquiries", value: business.enquiry_count },
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      {/* Cover */}
      <div className="relative h-44 w-full bg-gradient-to-br from-primary/25 to-secondary/20 sm:h-60">
        {business.cover_url && (
          <img src={business.cover_url} alt={`${business.name} cover`} className="h-full w-full object-cover" loading="eager" />
        )}
      </div>

      <div className="container-page">
        <nav aria-label="Breadcrumb" className="pt-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link> /{" "}
          <Link to="/companies" className="hover:text-foreground">Companies</Link> /{" "}
          <span className="text-foreground">{business.name}</span>
        </nav>

        <header className="-mt-10 flex flex-wrap items-end gap-5 pb-6 sm:-mt-14">
          <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow">
            {business.logo_url ? (
              <img src={business.logo_url} alt={`${business.name} logo`} className="h-full w-full object-cover" width={96} height={96} />
            ) : (
              <div className="flex h-full w-full items-center justify-center"><Building2 className="h-8 w-8 text-muted-foreground" /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{business.name}</h1>
              {business.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
              {business.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
                  <Sparkles className="h-3.5 w-3.5" /> Featured
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[categoryName, [business.town, business.county].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
              {business.years_in_business ? ` · ${business.years_in_business} years in business` : ""}
            </p>
            {rating && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {rating} ({approved.length} reviews)
              </p>
            )}
          </div>
        </header>

        <div className="grid gap-8 pb-16 lg:grid-cols-[1fr_340px]">
          <main className="space-y-8">
            {business.description && (
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-2 text-lg font-semibold">About {business.name}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{business.description}</p>
              </section>
            )}

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-xl font-semibold">{s.value}</p>
                </div>
              ))}
            </section>

            {(business.services.length > 0 || business.property_types.length > 0 ||
              business.counties.length > 0 || business.towns.length > 0) && (
              <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <Chips title="Services offered" items={business.services} />
                <Chips title="Property types" items={business.property_types} />
                <Chips title="Counties served" items={business.counties} />
                <Chips title="Towns served" items={business.towns} />
              </section>
            )}

            {(["For Sale", "For Rent", "For Lease"] as const).map((cat) =>
              grouped[cat].length ? (
                <section key={cat}>
                  <h2 className="mb-4 text-lg font-semibold">{cat} ({grouped[cat].length})</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {grouped[cat].map((row) => <PropertyCard key={row.id} p={toProperty(row)} />)}
                  </div>
                </section>
              ) : null,
            )}

            {props.length === 0 && (
              <section className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                This company has no published listings on Foxwood Properties yet.
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-3 text-lg font-semibold">Customer reviews</h2>
              {approved.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <ul className="space-y-4">
                  {approved.map((r: any) => (
                    <li key={r.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {r.rating}/5
                        <span className="text-muted-foreground font-normal">· {r.author_name ?? "Verified customer"}</span>
                      </div>
                      {r.title && <p className="mt-1 text-sm font-medium">{r.title}</p>}
                      {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                      {r.reply && (
                        <p className="mt-3 rounded-lg bg-muted p-3 text-sm">
                          <span className="font-semibold">{business.name} replied:</span> {r.reply}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-6" id="enquire">
              <h2 className="mb-3 text-lg font-semibold">Send an enquiry</h2>
              <BusinessEnquiryForm businessId={business.id} />
            </section>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold">Contact {business.name}</h2>
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                  <Phone className="h-4 w-4" /> Call {business.phone}
                </a>
              )}
              {business.whatsapp && (
                <a href={businessWhatsAppUrl({ whatsapp: business.whatsapp, companyName: business.name })}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {business.email && (
                <a href={`mailto:${business.email}`} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                  <Mail className="h-4 w-4" /> Email
                </a>
              )}
              {business.website && (
                <a href={business.website} target="_blank" rel="noopener noreferrer nofollow"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
              <a href="#enquire" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Inbox className="h-4 w-4" /> Enquiry form
              </a>
            </div>

            {business.address && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="mb-2 text-sm font-semibold">Office location</h2>
                <p className="inline-flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4" /> {business.address}
                </p>
                <iframe
                  title={`${business.name} location map`}
                  src={osmEmbedUrl(coords.lat, coords.lng)}
                  loading="lazy"
                  className="mt-3 h-48 w-full rounded-xl border border-border"
                />
              </div>
            )}

            {Object.keys(business.business_hours ?? {}).length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4" /> Business hours</h2>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {Object.entries(business.business_hours).map(([d, h]) => (
                    <li key={d} className="flex justify-between gap-4"><span className="capitalize">{d}</span><span>{h}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(business.socials ?? {}).length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="mb-2 text-sm font-semibold">Social media</h2>
                <ul className="space-y-1 text-sm">
                  {Object.entries(business.socials).map(([k, v]) => (
                    <li key={k}>
                      <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="capitalize text-primary hover:underline">{k}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              <p className="inline-flex items-center gap-2 text-foreground"><Eye className="h-4 w-4" /> {business.view_count} profile views</p>
            </div>

            {!business.owner_id && <ClaimCard businessId={business.id} signedIn={!!user} />}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((i) => (
          <li key={i} className="rounded-full bg-muted px-3 py-1 text-xs">{i}</li>
        ))}
      </ul>
    </div>
  );
}

function ClaimCard({ businessId, signedIn }: { businessId: string; signedIn: boolean }) {
  const claim = useServerFn(submitBusinessClaim);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", roleAtCompany: "", note: "", proof: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-primary-soft/40 p-5 text-sm">
        Claim submitted. Our team will review your proof of ownership and get back to you.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><ShieldQuestion className="h-4 w-4" /> Is this your business?</h2>
      <p className="mt-1 text-xs text-muted-foreground">Claim this profile to manage listings, enquiries and reviews.</p>

      {!signedIn ? (
        <Link to="/auth" className="mt-3 inline-block rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground">
          Sign in to claim this business
        </Link>
      ) : !open ? (
        <button onClick={() => setOpen(true)} className="mt-3 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground">
          Claim this business
        </button>
      ) : (
        <form
          className="mt-4 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await claim({
                data: {
                  businessId,
                  fullName: form.fullName.trim(),
                  email: form.email.trim(),
                  phone: form.phone.trim(),
                  roleAtCompany: form.roleAtCompany.trim(),
                  note: form.note.trim(),
                  proofUrls: form.proof.split(/[\s,]+/).filter((u) => /^https?:\/\//.test(u)).slice(0, 5),
                },
              });
              setSent(true);
            } catch (err: any) {
              toast.error(err?.message ?? "Could not submit claim");
            } finally {
              setBusy(false);
            }
          }}
        >
          {([
            ["fullName", "Full name"], ["email", "Work email"], ["phone", "Phone"],
            ["roleAtCompany", "Your role"],
          ] as const).map(([k, label]) => (
            <input key={k} required={k !== "roleAtCompany"} placeholder={label}
              value={(form as any)[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          ))}
          <textarea placeholder="Proof of ownership links (certificate, letterhead, utility bill) — one per line"
            value={form.proof} onChange={(e) => setForm({ ...form, proof: e.target.value })} rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <textarea placeholder="Anything else we should know?" value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} Submit claim
          </button>
        </form>
      )}
    </div>
  );
}
