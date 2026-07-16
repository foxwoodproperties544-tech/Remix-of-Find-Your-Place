import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { properties as mockProps, formatKsh } from "@/lib/mock-data";
import { fetchPropertyRowById, toProperty } from "@/lib/properties";
import { coordsFor, osmEmbedUrl, osmLinkUrl } from "@/lib/kenya-locations";
import { supabase } from "@/integrations/supabase/client";
import { Bed, Bath, Maximize, MapPin, Phone, MessageCircle, Share2, Check, ArrowLeft, ExternalLink, Calendar, User as UserIcon, AlertCircle, PlayCircle, FileText, Download } from "lucide-react";
import { PropertyCard } from "@/components/site/PropertyCard";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { trackRecentlyViewed } from "@/hooks/use-recently-viewed";
import { RecentlyViewedRail } from "@/components/site/RecentlyViewedRail";

export const Route = createFileRoute("/properties/$id")({
  loader: async ({ params }) => {
    const mock = mockProps.find(x => x.id === params.id);
    if (mock) return { p: mock, ownerId: null as string | null, propertyKey: params.id, ownerProfile: null as null | { full_name: string | null; avatar_url: string | null; phone: string | null }, videoUrl: null as string | null, documents: [] as Array<{ name: string; url: string }>, latOverride: null as number | null, lngOverride: null as number | null };
    const row = await fetchPropertyRowById(params.id);
    if (!row) throw notFound();
    const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url, phone").eq("id", row.owner_id).maybeSingle();
    const docsRaw = Array.isArray(row.documents) ? row.documents : [];
    const documents = docsRaw
      .filter((d: any) => d && typeof d === "object" && typeof d.url === "string")
      .map((d: any) => ({ name: String(d.name ?? "Document"), url: String(d.url) }));
    return {
      p: toProperty(row),
      ownerId: row.owner_id,
      propertyKey: row.id,
      ownerProfile: profile ?? null,
      contactPhone: row.contact_phone,
      contactWhatsapp: row.contact_whatsapp,
      videoUrl: row.video_url ?? null,
      documents,
      latOverride: row.lat != null ? Number(row.lat) : null,
      lngOverride: row.lng != null ? Number(row.lng) : null,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.p.title} — Foxwood Properties` },
          { name: "description", content: loaderData.p.description.slice(0, 155) },
          { property: "og:title", content: loaderData.p.title },
          { property: "og:description", content: loaderData.p.description.slice(0, 155) },
          { property: "og:type", content: "article" },
          { property: "og:image", content: loaderData.p.image },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Property not found" }, { name: "robots", content: "noindex" }],
  }),
  errorComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <Link to="/properties" className="btn-primary btn-primary-hover mt-6">Back to listings</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Property not found</h1>
      <Link to="/properties" className="btn-primary btn-primary-hover mt-6">Back to listings</Link>
    </div>
  ),
  component: Detail,
});

const inquirySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  preferred_date: z.string().optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message is too short").max(1000),
});

// Kenyan phone: accepts +2547XXXXXXXX, 07XXXXXXXX, 01XXXXXXXX, or generic 9-15 digits.
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

function Detail() {
  const loaderData = Route.useLoaderData();
  const { p, ownerId, propertyKey, ownerProfile } = loaderData;
  const contactPhone = (loaderData as any).contactPhone as string | null | undefined;
  const contactWhatsapp = (loaderData as any).contactWhatsapp as string | null | undefined;
  const videoUrl = loaderData.videoUrl;
  const documents = loaderData.documents ?? [];
  const gallery = (p.images && p.images.length ? p.images : [p.image]);
  const [active, setActive] = useState(0);
  const related = mockProps.filter(x => x.id !== p.id && (x.type === p.type || x.county === p.county)).slice(0,3);
  const fallback = coordsFor(p.town, p.county);
  const lat = loaderData.latOverride ?? fallback.lat;
  const lng = loaderData.lngOverride ?? fallback.lng;

  useEffect(() => {
    trackRecentlyViewed(p.id);
    if (!ownerId) return; // skip DB view tracking for mock listings
    const key = `viewed:${propertyKey}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.auth.getUser().then(({ data }) => {
      supabase.from("property_views").insert({ property_key: propertyKey, viewer_user_id: data.user?.id ?? null }).then(() => {});
    });
  }, [p.id, propertyKey, ownerId]);

  return (
    <>
      <div
        className="relative border-b border-border overflow-hidden"
        aria-hidden="true"
        style={{
          background: `linear-gradient(120deg, color-mix(in oklab, var(--primary) 92%, black) 0%, color-mix(in oklab, var(--primary) 70%, black) 55%, color-mix(in oklab, var(--secondary) 55%, black) 100%)`,
        }}
      >
        <div className="absolute inset-0 hero-grid-bg opacity-30" />
        <div className="relative container-page py-6 md:py-8 text-white">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white/85">{p.category} · {p.type}</div>
          <h1 className="mt-1 text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight max-w-4xl">{p.title}</h1>
          <div className="mt-1 flex items-center gap-1 text-xs sm:text-sm text-white/85"><MapPin className="h-3.5 w-3.5" /> {p.area}, {p.town}, {p.county}</div>
        </div>
      </div>
      <section className="container-page pt-6">
        <Link to="/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> All properties</Link>
      </section>

      <section className="container-page mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted shadow-soft group">
          <img src={gallery[active]} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-foreground/40 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 shadow-soft">{p.category}</span>
            <span className="rounded-full bg-background/95 text-primary text-xs font-semibold px-3 py-1 shadow-soft">{p.type}</span>
          </div>
          <div className="absolute bottom-4 right-4 rounded-full bg-foreground/70 backdrop-blur text-white text-xs font-semibold px-3 py-1">
            {active + 1} / {gallery.length}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => {
            const src = gallery[i % gallery.length];
            return (
              <button key={i} onClick={() => setActive(i % gallery.length)}
                className={`aspect-square rounded-2xl overflow-hidden bg-muted ring-offset-2 transition ${active === i % gallery.length ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-border"}`}>
                <img src={src} alt="" className="h-full w-full object-cover hover:opacity-90 transition" />
              </button>
            );
          })}
        </div>
      </section>


      <section className="container-page py-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{p.title}</h1>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {p.area}, {p.town}, {p.county}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-primary">{formatKsh(p.price)}<span className="text-sm text-muted-foreground">{p.priceSuffix ?? ""}</span></div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {p.bedrooms > 0 && <Stat icon={Bed} label="Bedrooms" value={p.bedrooms} />}
            {p.bathrooms > 0 && <Stat icon={Bath} label="Bathrooms" value={p.bathrooms} />}
            <Stat icon={Maximize} label="Size" value={p.size} />
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold">Description</h2>
            <p className="mt-3 text-foreground/80 leading-relaxed">{p.description}</p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold">Features</h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {p.features.map((f: string) => (
                <div key={f} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {f}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold">Amenities</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.amenities.map((a: string) => (
                <span key={a} className="rounded-full bg-primary-soft text-primary px-3 py-1.5 text-xs font-semibold">{a}</span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Location</h2>
              <a href={osmLinkUrl(lat, lng)} target="_blank" rel="noreferrer" className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline">
                Open in OpenStreetMap <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-border">
              <iframe
                title={`Map of ${p.town}`}
                src={osmEmbedUrl(lat, lng)}
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Approximate location — {p.area ? `${p.area}, ` : ""}{p.town}, {p.county}. Contact the agent for the exact address.</p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <AgentCard ownerId={ownerId} profile={ownerProfile} title={p.title} contactPhone={contactPhone ?? null} contactWhatsapp={contactWhatsapp ?? null} />
          <InquiryForm propertyKey={propertyKey} ownerId={ownerId} propertyTitle={p.title} />
        </aside>
      </section>

      {related.length > 0 && (
        <section className="container-page pb-20">
          <h2 className="text-2xl font-bold mb-6">Similar properties</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(r => <PropertyCard key={r.id} p={r} />)}
          </div>
        </section>
      )}

      <RecentlyViewedRail excludeId={p.id} />

      {/* Mobile sticky CTA */}
      <MobileCta price={p.price} priceSuffix={p.priceSuffix} town={p.town} area={p.area} title={p.title} contactPhone={contactPhone ?? null} contactWhatsapp={contactWhatsapp ?? null} profilePhone={ownerProfile?.phone ?? null} />
    </>
  );
}

function MobileCta({ price, priceSuffix, town, area, title, contactPhone, contactWhatsapp, profilePhone }:
  { price: number; priceSuffix?: string; town: string; area: string; title: string; contactPhone: string | null; contactWhatsapp: string | null; profilePhone: string | null }) {
  const phone = normalizePhone(contactPhone) ?? normalizePhone(profilePhone);
  const wa = normalizePhone(contactWhatsapp) ?? phone;
  const scrollToInquiry = () => document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  return (
    <div className="lg:hidden sticky bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground truncate">{area}, {town}</div>
          <div className="text-base font-extrabold text-primary truncate">{formatKsh(price)}<span className="text-xs text-muted-foreground">{priceSuffix ?? ""}</span></div>
        </div>
        {phone ? (
          <a href={`tel:${phone}`} aria-label="Call agent" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft"><Phone className="h-4 w-4" /></a>
        ) : (
          <button onClick={() => { toast("No phone on this listing", { description: "Use the inquiry form to reach the agent." }); scrollToInquiry(); }}
            aria-label="No phone available" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Phone className="h-4 w-4" /></button>
        )}
        {wa ? (
          <a href={`https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in "${title}" on Foxwood Properties.`)}`}
            target="_blank" rel="noreferrer" className="btn-secondary shrink-0 !py-2.5 !px-4 text-sm"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
        ) : (
          <button onClick={scrollToInquiry} className="btn-secondary shrink-0 !py-2.5 !px-4 text-sm opacity-70"><MessageCircle className="h-4 w-4" /> Inquire</button>
        )}
      </div>
    </div>
  );
}


function AgentCard({ ownerId, profile, title, contactPhone, contactWhatsapp }:
  { ownerId: string | null; profile: { full_name: string | null; avatar_url: string | null; phone: string | null } | null; title: string; contactPhone: string | null; contactWhatsapp: string | null }) {
  const name = profile?.full_name ?? "Foxwood Agent";
  const initials = name.split(" ").map((s: string) => s[0]).slice(0,2).join("").toUpperCase();
  const phone = normalizePhone(contactPhone) ?? normalizePhone(profile?.phone ?? null);
  const wa = normalizePhone(contactWhatsapp) ?? phone;
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Couldn't share — copy the URL manually.");
    }
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
          <div className="text-xs text-muted-foreground">Verified · Kenya</div>
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
    </div>
  );
}

function InquiryForm({ propertyKey, ownerId, propertyTitle }: { propertyKey: string; ownerId: string | null; propertyTitle: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: user?.email ?? "",
    phone: "",
    preferred_date: "",
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
      setErrors(errs);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase.from("inquiries").insert({
        property_key: propertyKey,
        owner_id: ownerId,
        sender_user_id: user?.id ?? null,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        preferred_date: parsed.data.preferred_date || null,
        message: parsed.data.message,
      });
      if (error) throw error;
      toast.success("Inquiry sent — the agent will be in touch.");
      setForm({ ...form, message: "", phone: "", preferred_date: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send — please try again.");
    } finally { setBusy(false); }
  }

  const inputCls = (field: string) => `w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary ${errors[field] ? "border-destructive" : "border-border"}`;

  return (
    <form id="inquiry-form" onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-3">
      <div>
        <h3 className="font-bold text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Request a viewing</h3>
        <p className="text-xs text-muted-foreground mt-1">Send the agent an inquiry or schedule a visit.</p>
      </div>
      <div>
        <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name" className={inputCls("name")} />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>
      <div>
        <input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" className={inputCls("email")} />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>
      <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone (optional)" className={inputCls("phone")} />
      <div>
        <label className="text-xs text-muted-foreground">Preferred viewing date</label>
        <input type="date" value={form.preferred_date} onChange={e=>setForm({...form,preferred_date:e.target.value})} className={"mt-1 " + inputCls("preferred_date")} />
      </div>
      <div>
        <textarea required value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={3} className={inputCls("message")} />
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
      <div className="mt-1 font-bold text-lg">{value}</div>
    </div>
  );
}
