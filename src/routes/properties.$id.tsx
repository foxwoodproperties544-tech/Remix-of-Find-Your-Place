import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { properties as mockProps, formatKsh } from "@/lib/mock-data";
import { fetchPropertyById } from "@/lib/properties";
import { coordsFor, osmEmbedUrl, osmLinkUrl } from "@/lib/kenya-locations";
import { Bed, Bath, Maximize, MapPin, Phone, MessageCircle, Share2, Check, ArrowLeft, ExternalLink } from "lucide-react";
import { PropertyCard } from "@/components/site/PropertyCard";
import { useState } from "react";

export const Route = createFileRoute("/properties/$id")({
  loader: async ({ params }) => {
    const mock = mockProps.find(x => x.id === params.id);
    if (mock) return { p: mock };
    const db = await fetchPropertyById(params.id);
    if (!db) throw notFound();
    return { p: db };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.p.title} — Foxwood Properties` }, { name: "description", content: loaderData.p.description.slice(0, 155) }]
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

function Detail() {
  const { p } = Route.useLoaderData();
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
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
          <img src={gallery[active]} alt={p.title} className="h-full w-full object-cover" />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1">{p.category}</span>
            <span className="rounded-full bg-background/95 text-primary text-xs font-semibold px-3 py-1">{p.type}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => {
            const src = gallery[i % gallery.length];
            return (
              <button key={i} onClick={() => setActive(i % gallery.length)}
                className={`aspect-square rounded-2xl overflow-hidden bg-muted ring-offset-2 transition ${active === i % gallery.length ? "ring-2 ring-primary" : ""}`}>
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

          <div className="mt-8 aspect-[16/9] rounded-2xl overflow-hidden border border-border bg-muted grid place-items-center text-muted-foreground text-sm">
            <div className="text-center">
              <MapPin className="h-6 w-6 mx-auto text-primary mb-2" />
              Map preview — {p.area}, {p.town}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">FA</div>
              <div>
                <div className="font-semibold text-sm">Foxwood Agent</div>
                <div className="text-xs text-muted-foreground">Verified · Nairobi</div>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <a href="tel:+254700000000" className="btn-primary btn-primary-hover w-full"><Phone className="h-4 w-4" /> Call agent</a>
              <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" className="btn-secondary w-full"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              <button className="btn-ghost w-full"><Share2 className="h-4 w-4" /> Share</button>
            </div>
            <form className="mt-5 space-y-2" onSubmit={e=>e.preventDefault()}>
              <input placeholder="Your name" className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
              <input placeholder="Email" type="email" className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
              <textarea placeholder={`I'm interested in ${p.title}...`} rows={3} className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
              <button className="btn-primary btn-primary-hover w-full">Send inquiry</button>
            </form>
          </div>
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

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border p-4 bg-card">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4 text-primary" /> {label}</div>
      <div className="mt-1 font-bold text-lg">{value}</div>
    </div>
  );
}
