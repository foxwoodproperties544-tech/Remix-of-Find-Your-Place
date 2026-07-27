import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Eye, Sparkles, Users, Award, HeartHandshake, Scale, BadgeCheck,
  Landmark, Home, Building2, Warehouse, Store, KeyRound, FileSearch, Megaphone,
  UsersRound, BookOpen, MapPinned, Search, CalendarCheck, Handshake, MessageSquare,
  LineChart, LifeBuoy, ChevronDown, Phone, Mail, Clock, MessageCircle, Star, Quote,
  ArrowRight, Compass,
} from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import storyImg from "@/assets/about-story.jpg";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { supabase } from "@/integrations/supabase/client";
import {
  SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, trackSupportClick, whatsappUrl, supportMessageFor,
} from "@/lib/support";

const TITLE = "About Us — Foxwood Properties Ltd | Trusted Property Marketplace in Kenya";
const DESC =
  "Foxwood Properties Ltd connects buyers, sellers, landlords, tenants, developers and agents through one trusted property marketplace for buying, renting and leasing property in Kenya.";
const OG_IMAGE = absoluteUrl(heroAbout);
const CANONICAL = `${SITE_URL}/about-us`;
const SUPPORT_EMAIL = "foxwoodproperties544@gmail.com";
const ABOUT_WA_MESSAGE = supportMessageFor("generic", "I would like to learn more about your services.");

const DEFAULT_STATS = [
  { label: "Properties listed", value: 1200, suffix: "+" },
  { label: "Counties covered", value: 47, suffix: "" },
  { label: "Trusted agents", value: 180, suffix: "+" },
  { label: "Happy customers", value: 3500, suffix: "+" },
  { label: "Successful connections", value: 5200, suffix: "+" },
  { label: "Monthly visitors", value: 42000, suffix: "+" },
];

export const Route = createFileRoute("/about-us")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(buildAboutPage()) },
      { type: "application/ld+json", children: JSON.stringify(buildOrganization()) },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildBreadcrumbs([
            { name: "Home", url: SITE_URL },
            { name: "About Us", url: CANONICAL },
          ]),
        ),
      },
    ],

  }),
  component: AboutUs,
});

/* ---------------- helpers ---------------- */

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
    >
      {children}
    </div>
  );
}

function Counter({ to, suffix }: { to: number; suffix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{n.toLocaleString()}{suffix ?? ""}</span>;
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      {eyebrow && (
        <span className="inline-block rounded-full bg-primary-soft text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* ---------------- data ---------------- */

const VALUES = [
  { i: Scale, t: "Integrity", d: "We do the right thing even when nobody is watching." },
  { i: Eye, t: "Transparency", d: "Clear pricing, honest photos and full price history." },
  { i: BadgeCheck, t: "Professionalism", d: "Vetted agents who treat every client with respect." },
  { i: Sparkles, t: "Innovation", d: "Technology that makes property search effortless." },
  { i: HeartHandshake, t: "Customer first", d: "Your goals shape every recommendation we make." },
  { i: Award, t: "Excellence", d: "High standards on every listing we publish." },
  { i: ShieldCheck, t: "Trust", d: "Verification checks before a listing goes live." },
  { i: Users, t: "Accountability", d: "We own our promises from first search to handover." },
];

const SERVICES = [
  { i: Landmark, t: "Land & plot sales", d: "Verified plots and land parcels across Kenya." },
  { i: Home, t: "Residential sales", d: "Houses, apartments and family homes for sale." },
  { i: KeyRound, t: "Rental listings", d: "Long-term rentals with genuine landlords." },
  { i: FileSearch, t: "Lease listings", d: "Commercial and residential lease opportunities." },
  { i: Building2, t: "Airbnb listings", d: "Short-stay and holiday homes for travellers." },
  { i: Store, t: "Commercial properties", d: "Shops, offices and retail spaces." },
  { i: Warehouse, t: "Property marketplace", d: "One place to browse, compare and connect." },
  { i: Megaphone, t: "Property request marketplace", d: "Post what you need and let owners come to you." },
  { i: LineChart, t: "Property marketing", d: "Featured placement and campaign packages." },
  { i: UsersRound, t: "Agent & developer directory", d: "Discover verified professionals near you." },
  { i: BookOpen, t: "Property blogs & guides", d: "Market insight and buyer education." },
];

const WHY = [
  { i: BadgeCheck, t: "Verified property listings", d: "Every listing is checked before publishing." },
  { i: UsersRound, t: "Trusted agents & developers", d: "Profiles, KYC and verification badges." },
  { i: Megaphone, t: "Property request marketplace", d: "Tell the market what you want to buy or rent." },
  { i: CalendarCheck, t: "Book a viewing", d: "Pick a slot that fits your schedule." },
  { i: Handshake, t: "Make an offer", d: "Negotiate securely inside the platform." },
  { i: MessageSquare, t: "Secure messaging", d: "Talk to owners and agents safely." },
  { i: LineChart, t: "Property price history", d: "See every price change before you commit." },
  { i: Search, t: "Smart search & filters", d: "Typo-tolerant search across 47 counties." },
  { i: MapPinned, t: "Interactive maps", d: "Explore neighbourhoods and radius search." },
  { i: LifeBuoy, t: "Fast customer support", d: "Call, chat or WhatsApp — we reply quickly." },
];

const STEPS = [
  { i: Search, t: "Search or request a property", d: "Browse verified listings or post a property request." },
  { i: UsersRound, t: "Connect with trusted agents or owners", d: "Message verified professionals directly." },
  { i: CalendarCheck, t: "Book a viewing or make an offer", d: "Schedule visits and negotiate in-platform." },
  { i: Handshake, t: "Complete your property journey", d: "Close with guidance from search to signing." },
];

const PARTNERS = [
  "Kenya Property Developers Association",
  "Estate Agents Registration Board",
  "Ministry of Lands e-Citizen",
  "Kenya Bankers Mortgage Partners",
  "Safaricom M-Pesa",
  "Institution of Surveyors of Kenya",
];

/* ---------------- page ---------------- */

function AboutUs() {
  const { data: stats } = useQuery({
    queryKey: ["about-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "about_stats").maybeSingle();
      const rows = (data?.value as any)?.items;
      return Array.isArray(rows) && rows.length ? (rows as typeof DEFAULT_STATS) : DEFAULT_STATS;
    },
    initialData: DEFAULT_STATS,
    staleTime: 5 * 60_000,
  });

  const { data: testimonials } = useQuery({
    queryKey: ["about-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, user_id")
        .eq("status", "approved")
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(12);
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r: any) => r.user_id)));
      const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("public_profiles").select("id, full_name, avatar_url").in("id", ids);
        (profs ?? []).forEach((p: any) => (map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }));
      }
      return rows.map((r: any) => ({ ...r, reviewer: map[r.user_id] ?? null }));
    },
    staleTime: 5 * 60_000,
  });

  return (
    <>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="sr-only">
        <ol><li><Link to="/">Home</Link></li><li>About Us</li></ol>
      </nav>

      <PageHero
        image={heroAbout}
        imageAlt="Modern homes and land developments in Kenya"
        size="lg"
        eyebrow="About Foxwood Properties Ltd"
        title="Your trusted property marketplace in Kenya"
        subtitle="Foxwood Properties Ltd connects buyers, sellers, landlords, tenants, developers and real estate professionals through one trusted property marketplace. We make it easier to buy, sell, rent, lease and discover verified properties across Kenya."
        actions={
          <>
            <Link to="/properties" className="btn-primary btn-primary-hover">Browse properties</Link>
            <Link to="/contact" className="btn-secondary">Contact us</Link>
          </>
        }
      >
        <a href="#our-story" aria-label="Scroll to our story" className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white">
          <ChevronDown className="h-5 w-5 animate-bounce" /> Scroll to explore
        </a>
      </PageHero>

      {/* Our story */}
      <section id="our-story" className="container-page py-16 md:py-24 scroll-mt-24">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <Reveal>
            <img
              src={storyImg}
              alt="Modern residential development in Kenya at sunset"
              width={1280}
              height={960}
              loading="lazy"
              decoding="async"
              className="rounded-3xl border border-border object-cover w-full h-full max-h-[420px] shadow-soft"
            />
          </Reveal>
          <Reveal delay={120}>
            <span className="inline-block rounded-full bg-secondary/10 text-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">Our story</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">Built to make property in Kenya simple</h2>
            <p className="mt-4 text-muted-foreground">
              Foxwood Properties Ltd was created to make buying, selling, renting and leasing property in Kenya simple,
              transparent and accessible. Our platform brings together property owners, real estate agents, developers
              and buyers in one trusted marketplace.
            </p>
            <p className="mt-3 text-muted-foreground">
              Beyond property listings, we help people discover opportunities, compare options, connect with
              professionals and make informed property decisions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/how-it-works" className="btn-secondary">How Foxwood works</Link>
              <Link to="/property-requests" className="btn-primary btn-primary-hover">Post a property request</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-muted/40 border-y border-border py-16 md:py-20">
        <div className="container-page grid gap-6 md:grid-cols-2">
          {[
            { i: Compass, t: "Our vision", d: "To become Kenya's most trusted and innovative digital property marketplace, connecting people with the right property and helping them make confident real estate decisions." },
            { i: Sparkles, t: "Our mission", d: "To simplify the property journey by providing a secure, transparent and technology-driven platform where buyers, sellers, tenants, landlords, agents and developers can connect and succeed." },
          ].map(({ i: Icon, t, d }, idx) => (
            <Reveal key={t} delay={idx * 120}>
              <div className="h-full rounded-3xl border border-border bg-card p-8 shadow-soft hover:shadow-lg transition-shadow">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Icon className="h-6 w-6" /></div>
                <h3 className="mt-5 text-2xl font-bold">{t}</h3>
                <p className="mt-3 text-muted-foreground">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Core values */}
      <section className="container-page py-16 md:py-24">
        <SectionTitle eyebrow="What we stand for" title="Our core values" subtitle="The principles behind every listing, every viewing and every deal." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ i: Icon, t, d }, idx) => (
            <Reveal key={t} delay={(idx % 4) * 80}>
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:-translate-y-1 hover:shadow-lg transition-all">
                <Icon className="h-6 w-6 text-secondary" />
                <h3 className="mt-3 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What we do */}
      <section className="bg-muted/40 border-y border-border py-16 md:py-24">
        <div className="container-page">
          <SectionTitle eyebrow="Our services" title="What we do" subtitle="A complete marketplace — not just a listing website." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, idx) => {
              const Icon = iconFor(s.icon);
              return (
                <Reveal key={`${s.title}-${idx}`} delay={(idx % 3) * 80}>
                  <div className="h-full rounded-2xl border border-border bg-background p-6 hover:border-primary/40 hover:shadow-lg transition-all">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
                    <h3 className="mt-4 font-bold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </Reveal>
              );
            })}

          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="container-page py-16 md:py-24">
        <SectionTitle eyebrow="Why Foxwood" title="Why choose Foxwood Properties" subtitle="Tools that protect your money, your time and your peace of mind." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {WHY.map(({ i: Icon, t, d }, idx) => (
            <Reveal key={t} delay={(idx % 5) * 70}>
              <div className="h-full rounded-2xl border border-border bg-card p-5 hover:-translate-y-1 transition-transform">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-bold">{t}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Numbers */}
      <section className="relative overflow-hidden border-y border-border bg-primary py-16 text-primary-foreground">
        <div className="container-page">
          <h2 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight">Our numbers</h2>
          <div className="mt-10 grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {(stats ?? DEFAULT_STATS).map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold tabular-nums">
                  <Counter to={Number(s.value) || 0} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide opacity-85">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16 md:py-24">
        <SectionTitle eyebrow="Simple process" title="How Foxwood works" />
        <div className="mt-12 grid gap-6 md:grid-cols-4 relative">
          <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-px bg-border" aria-hidden="true" />
          {steps.map((s, idx) => {
            const Icon = iconFor(s.icon);
            return (
              <Reveal key={`${s.title}-${idx}`} delay={idx * 120} className="relative">
                <div className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-white shadow-soft ring-8 ring-background">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Step {idx + 1}</div>
                  <h3 className="mt-1 font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                </div>
              </Reveal>
            );
          })}

        </div>
      </section>

      {/* Team */}
      <section className="bg-muted/40 border-y border-border py-16 md:py-24">
        <div className="container-page grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <Reveal>
            <span className="inline-block rounded-full bg-primary-soft text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">Meet our team</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">Twenty-plus people, one obsession: a simpler property search</h2>
            <p className="mt-4 text-muted-foreground">
              Behind every verified listing is a team of researchers, agents, engineers and customer champions who care
              deeply about getting Kenyans into the right property. We are people-centric first and technology-driven
              second — the tech only exists to make the human part easier.
            </p>
            <p className="mt-3 text-muted-foreground">
              Leading that team is{" "}
              <Link to="/team/kennedy-mutua" className="font-semibold text-primary underline underline-offset-4 hover:text-secondary">
                Kennedy Mutua
              </Link>
              , Founder &amp; CEO of Foxwood Properties Ltd, whose vision built the marketplace you are using today.
            </p>
            <Link to="/team/kennedy-mutua" className="mt-6 inline-flex btn-primary btn-primary-hover">
              Meet the CEO <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
              <div className="mx-auto h-28 w-28 rounded-full bg-gradient-to-br from-primary to-secondary grid place-items-center text-primary-foreground text-3xl font-bold">KM</div>
              <div className="mt-4 text-lg font-bold">Kennedy Mutua</div>
              <div className="text-xs text-muted-foreground">Founder &amp; CEO, Foxwood Properties Ltd</div>
              <p className="mt-4 text-sm text-muted-foreground">"Property should be the easiest big decision you ever make — not the scariest."</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-page py-16 md:py-24">
        <SectionTitle eyebrow="Customer stories" title="What our customers say" />
        {testimonials.length > 0 ? (
          <div className="mt-10 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4">
            {testimonials.map((t, idx) => (
              <figure key={`${t.name}-${idx}`} className="snap-start shrink-0 w-[85%] sm:w-[45%] lg:w-[31%] rounded-2xl border border-border bg-card p-6">
                <Quote className="h-6 w-6 text-secondary" />
                <blockquote className="mt-3 text-sm text-muted-foreground line-clamp-6">{t.text}</blockquote>
                <div className="mt-4 flex items-center gap-3">
                  {t.photo_url ? (
                    <img src={t.photo_url} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary-soft text-primary grid place-items-center text-sm font-bold">
                      {(t.name || "F").charAt(0)}
                    </div>
                  )}
                  <figcaption className="text-sm">
                    <div className="font-semibold">{t.name || "Foxwood customer"}</div>
                    {t.location && <div className="text-xs text-muted-foreground">{t.location}</div>}
                    <div className="flex items-center gap-0.5 text-secondary" aria-label={`${t.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "fill-current" : "opacity-30"}`} />
                      ))}
                    </div>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Customer stories are published here as reviews are approved.{" "}
            <Link to="/testimonials" className="text-primary underline underline-offset-4">See all testimonials</Link>
          </p>
        )}
      </section>


      {/* Awards & partners */}
      <section className="bg-muted/40 border-y border-border py-16">
        <div className="container-page">
          <SectionTitle eyebrow="Credibility" title="Certifications, memberships, partners & awards" subtitle="Organisations and platforms we work alongside." />
          <div className="mt-10 space-y-10">
            {PARTNER_CATEGORIES.filter((c) => partners.some((p) => p.category === c)).map((cat) => (
              <div key={cat}>
                <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {PARTNER_CATEGORY_LABEL[cat]}
                </h3>
                <div className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  {partners.filter((p) => p.category === cat).map((p, i) => (
                    <div key={`${p.name}-${i}`} className="rounded-2xl border border-border bg-background px-4 py-6 text-center grid place-items-center gap-2 min-h-[96px]">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt={`${p.name} logo`} loading="lazy" className="h-10 w-auto max-w-[120px] object-contain" />
                      ) : null}
                      <span className="text-xs font-semibold text-muted-foreground">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground">
        <div className="container-page text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Ready to find your perfect property?</h2>
          <p className="mt-3 mx-auto max-w-2xl opacity-90">
            Whether you are buying, selling, renting, leasing or investing, Foxwood Properties is here to help you every
            step of the way.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/properties" className="btn-secondary">Browse properties</Link>
            <Link to="/dashboard/new" className="btn-secondary">Submit a property</Link>
            <Link to="/contact" className="btn-secondary">Contact us</Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="container-page py-16 md:py-24 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Talk to Foxwood Properties</h2>
          <div className="mt-6 grid gap-4">
            <a href={`tel:${SUPPORT_PHONE_TEL}`} onClick={() => trackSupportClick("call", "generic")} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors">
              <Phone className="h-5 w-5 text-primary" />
              <span><span className="block font-semibold">Phone</span><span className="text-sm text-muted-foreground">{SUPPORT_PHONE_DISPLAY}</span></span>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors">
              <Mail className="h-5 w-5 text-primary" />
              <span><span className="block font-semibold">Email</span><span className="text-sm text-muted-foreground break-all">{SUPPORT_EMAIL}</span></span>
            </a>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
              <Clock className="h-5 w-5 text-primary" />
              <span><span className="block font-semibold">Business hours</span><span className="text-sm text-muted-foreground">Monday – Saturday, 8:00 AM – 6:00 PM</span></span>
            </div>
            <a
              href={whatsappUrl(ABOUT_WA_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSupportClick("whatsapp", "generic")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="h-5 w-5" /> Chat with us on WhatsApp
            </a>
          </div>
        </div>
        <div className="rounded-3xl overflow-hidden border border-border min-h-[320px]">
          <iframe
            title="Foxwood Properties location — Nairobi, Kenya"
            src="https://www.openstreetmap.org/export/embed.html?bbox=36.7614%2C-1.3325%2C36.9200%2C-1.2200&layer=mapnik"
            className="h-full w-full min-h-[320px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}
