import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, MapPin, Home, ShieldCheck, Users, BadgeCheck, Headphones, Wallet, ArrowRight, Star, Quote } from "lucide-react";
import { useState } from "react";
import hero from "@/assets/hero.jpg";
import { properties, testimonials, categoryCards, locations, counties } from "@/lib/mock-data";
import { PropertyCard } from "@/components/site/PropertyCard";
import { RecentlyViewedRail } from "@/components/site/RecentlyViewedRail";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const navigate = useNavigate();
  const [q, setQ] = useState({ category: "For Sale", type: "", county: "" });
  const featured = properties.filter(p => p.featured).slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={hero} alt="Modern Kenyan homes at golden hour" width={1920} height={1200} className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)", opacity: 0.82 }} />
          <div className="absolute inset-0 hero-grid-bg opacity-40" />
        </div>
        <div className="relative container-page py-20 md:py-32 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" /> Your gateway to prime deals
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.02] tracking-tight">
            Find your perfect <br className="hidden sm:block" />property in <span className="relative inline-block">
              <span className="relative z-10 text-secondary">Kenya</span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-secondary/25 -skew-x-6 z-0" />
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-white/90 text-base md:text-lg leading-relaxed">
            Browse trusted properties for sale, rent, and lease. Search by location, price, and property type — verified by our team.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/properties" className="btn-primary btn-primary-hover">Browse Properties <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/contact" className="btn-ghost !bg-white/10 !border-white/30 !text-white hover:!bg-white/20 backdrop-blur">List Your Property</Link>
          </div>

          {/* SEARCH */}
          <div className="mt-10 rounded-3xl bg-background/98 backdrop-blur p-3 sm:p-4 shadow-lift max-w-4xl ring-1 ring-white/40">
            <div className="inline-flex gap-1 rounded-full bg-muted p-1 mb-3">
              {["For Sale","For Rent","For Lease"].map(c => (
                <button
                  key={c}
                  onClick={() => setQ({...q, category: c})}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${q.category === c ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:text-foreground"}`}
                >{c}</button>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 hover:border-primary/40 transition-colors">
                <Home className="h-4 w-4 text-primary shrink-0" />
                <select value={q.type} onChange={e=>setQ({...q, type: e.target.value})} className="w-full bg-transparent text-sm outline-none text-foreground">
                  <option value="">Property Type</option>
                  {["Houses","Apartments","Land / Plots","Airbnbs","Commercial","Office Spaces","Shops","Warehouses","Farms","Holiday Homes"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 hover:border-primary/40 transition-colors">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <select value={q.county} onChange={e=>setQ({...q, county: e.target.value})} className="w-full bg-transparent text-sm outline-none text-foreground">
                  <option value="">County</option>
                  {counties.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 hover:border-primary/40 transition-colors">
                <Wallet className="h-4 w-4 text-primary shrink-0" />
                <select className="w-full bg-transparent text-sm outline-none text-foreground" defaultValue="">
                  <option value="">Price Range</option>
                  <option>Under 5M</option><option>5M – 20M</option><option>20M – 50M</option><option>50M+</option>
                </select>
              </div>
              <button
                onClick={() => navigate({ to: "/properties", search: q as any })}
                className="btn-primary btn-primary-hover"
              ><Search className="h-4 w-4" /> Search</button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-xl">
            {[["12K+","Listings"],["800+","Trusted Agents"],["47","Counties"]].map(([n,l]) => (
              <div key={l} className="rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 px-4 py-3 hover:bg-white/15 transition-colors">
                <div className="text-2xl md:text-3xl font-bold">{n}</div>
                <div className="text-xs text-white/80 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-border bg-muted/40">
        <div className="container-page py-6 flex items-center justify-between gap-6 flex-wrap">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trusted across Kenya</p>
          <div className="flex items-center gap-6 md:gap-10 flex-wrap text-sm text-foreground/60">
            <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /> Verified listings</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Secure inquiries</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Vetted agents</span>
            <span className="flex items-center gap-2"><Star className="h-4 w-4 text-secondary fill-current" /> 4.9 client rating</span>
          </div>
        </div>
      </section>


      {/* FEATURED */}
      <section className="container-page py-16 md:py-24">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Handpicked</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-1">Featured Properties</h2>
            <p className="mt-2 text-muted-foreground max-w-lg">Explore our top picks — verified listings from trusted agents across Kenya.</p>
          </div>
          <Link to="/properties" className="btn-ghost">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(p => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* WHY */}
      <section className="bg-muted/50 py-16 md:py-24">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Why Foxwood</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-1">Real estate, done right</h2>
            <p className="mt-3 text-muted-foreground">We combine local expertise, verified data, and a network of trusted partners.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {i: BadgeCheck, t: "Verified Listings", d: "Every listing is reviewed for accuracy before it goes live."},
              {i: Users, t: "Trusted Agents", d: "Work with vetted, professional real estate agents."},
              {i: Search, t: "Easy Property Search", d: "Powerful filters get you to the right listing fast."},
              {i: Wallet, t: "Affordable Prices", d: "Fair market pricing with transparent fees."},
              {i: ShieldCheck, t: "Secure Transactions", d: "Guidance and safeguards from search to signing."},
              {i: Headphones, t: "Excellent Support", d: "Real people, ready to help — call, email, or WhatsApp."},
            ].map(({i:Icon, t, d}) => (
              <div key={t} className="rounded-2xl bg-background border border-border p-6 shadow-soft hover:shadow-glow transition">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-page py-16 md:py-24">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Explore</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-1">Browse by Category</h2>
          </div>
        </div>
        <div className="mt-8 grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {categoryCards.map(c => (
            <Link key={c.title} to="/properties" search={{ type: c.type } as any}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] block">
              <img src={c.img} alt={c.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <div className="font-semibold">{c.title}</div>
                <div className="text-xs text-white/75 mt-0.5 flex items-center gap-1">Explore <ArrowRight className="h-3 w-3" /></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* LOCATIONS */}
      <section className="bg-muted/50 py-16 md:py-24">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Popular</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-1">Locations we love</h2>
            <p className="mt-3 text-muted-foreground">From Nairobi's leafy suburbs to coastal Mombasa, discover Kenya's best neighbourhoods.</p>
          </div>
          <div className="mt-10 grid gap-4 grid-cols-2 md:grid-cols-4">
            {locations.map(l => (
              <Link key={l.name} to="/properties" search={{ q: l.name } as any}
                className="group relative rounded-2xl overflow-hidden aspect-[5/4]">
                <img src={l.img} alt={l.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-foreground/10" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-xs text-white/80">{l.count} properties</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <RecentlyViewedRail />



      {/* TESTIMONIALS */}
      <section className="container-page py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-1">Loved by clients across Kenya</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map(t => (
            <div key={t.name} className="rounded-2xl border border-border bg-card p-6 shadow-soft relative">
              <Quote className="absolute -top-3 left-6 h-8 w-8 text-secondary" />
              <div className="flex gap-0.5 text-secondary">
                {[...Array(5)].map((_,i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">"{t.quote}"</p>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-10 md:p-16">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-secondary/30 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-extrabold">Ready to Find Your Next Property?</h2>
            <p className="mt-3 text-primary-foreground/85">Join thousands of Kenyans discovering their next home, plot, or investment with Foxwood.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/properties" className="btn-secondary">Browse Properties</Link>
              <Link to="/contact" className="btn-ghost !bg-white/10 !border-white/25 !text-white hover:!bg-white/20">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
