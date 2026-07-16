import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { properties as mockProps, formatKsh } from "@/lib/mock-data";
import { fetchPropertyRowById, toProperty } from "@/lib/properties";
import { coordsFor, osmEmbedUrl, osmLinkUrl } from "@/lib/kenya-locations";
import { supabase } from "@/integrations/supabase/client";
import { Bed, Bath, Maximize, MapPin, Phone, MessageCircle, Share2, Check, ArrowLeft, ExternalLink, Calendar, User as UserIcon } from "lucide-react";
import { PropertyCard } from "@/components/site/PropertyCard";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/properties/$id")({
  loader: async ({ params }) => {
    const mock = mockProps.find(x => x.id === params.id);
    if (mock) return { p: mock, ownerId: null as string | null, propertyKey: params.id, ownerProfile: null as null | { full_name: string | null; avatar_url: string | null; phone: string | null } };
    const row = await fetchPropertyRowById(params.id);
    if (!row) throw notFound();
    const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url, phone").eq("id", row.owner_id).maybeSingle();
    return { p: toProperty(row), ownerId: row.owner_id, propertyKey: row.id, ownerProfile: profile ?? null };
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

function Detail() {
  const { p, ownerId, propertyKey, ownerProfile } = Route.useLoaderData();
  const gallery = (p.images && p.images.length ? p.images : [p.image]);
  const [active, setActive] = useState(0);
  const related = mockProps.filter(x => x.id !== p.id && (x.type === p.type || x.county === p.county)).slice(0,3);
  const { lat, lng } = coordsFor(p.town, p.county);

  return (
    <>
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
          <AgentCard ownerId={ownerId} profile={ownerProfile} title={p.title} />
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
    </>
  );
}

function AgentCard({ ownerId, profile, title }: { ownerId: string | null; profile: { full_name: string | null; avatar_url: string | null; phone: string | null } | null; title: string }) {
  const name = profile?.full_name ?? "Foxwood Agent";
  const initials = name.split(" ").map((s: string) => s[0]).slice(0,2).join("").toUpperCase();
  const phone = profile?.phone ?? "+254700000000";
  const waNumber = phone.replace(/[^\d]/g, "");
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };
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
      <div className="mt-5 space-y-2">
        <a href={`tel:${phone}`} className="btn-primary btn-primary-hover w-full"><Phone className="h-4 w-4" /> Call agent</a>
        <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I'm interested in "${title}" on Foxwood Properties.`)}`} target="_blank" rel="noreferrer" className="btn-secondary w-full"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
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
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = inquirySchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
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
      toast.error(e.message ?? "Failed to send");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-3">
      <div>
        <h3 className="font-bold text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Request a viewing</h3>
        <p className="text-xs text-muted-foreground mt-1">Send the agent an inquiry or schedule a visit.</p>
      </div>
      <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name" className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
      <input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
      <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone (optional)" className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
      <div>
        <label className="text-xs text-muted-foreground">Preferred viewing date</label>
        <input type="date" value={form.preferred_date} onChange={e=>setForm({...form,preferred_date:e.target.value})} className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
      </div>
      <textarea required value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={3} className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
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
