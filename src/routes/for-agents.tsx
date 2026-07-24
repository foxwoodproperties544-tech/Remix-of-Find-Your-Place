import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";
import {
  Building2,
  Upload,
  Users,
  CalendarClock,
  BarChart3,
  Camera,
  ShieldCheck,
  Megaphone,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";

const TITLE = "For Agents & Developers — Foxwood Properties";
const DESC =
  "Grow your Kenyan real estate business with Foxwood Properties. Bulk import listings, manage leads with a built-in CRM, host 360° virtual tours, book viewings, and reach thousands of qualified buyers.";
const OG = absoluteUrl(heroTools);
const CANON = "https://find-joy-list.lovable.app/for-agents";

export const Route = createFileRoute("/for-agents")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
      { property: "og:image", content: OG },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG },
    ],
    links: [{ rel: "canonical", href: CANON }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Foxwood Properties — Agent & Developer Platform",
          provider: { "@type": "Organization", name: "Foxwood Properties" },
          areaServed: "Kenya",
          description: DESC,
          url: CANON,
        }),
      },
    ],
  }),
  component: ForAgentsPage,
});

const FEATURES = [
  {
    icon: Upload,
    title: "Bulk CSV import",
    desc: "Upload up to 200 listings at once with client-side validation and instant previews.",
  },
  {
    icon: Users,
    title: "Built-in CRM",
    desc: "Every enquiry becomes a lead. Assign, tag, add notes, and track from first touch to closed deal.",
  },
  {
    icon: CalendarClock,
    title: "Appointment booking",
    desc: "Let buyers book viewings from your listing page. Approve, reschedule, and send WhatsApp confirmations.",
  },
  {
    icon: Camera,
    title: "360° virtual tours",
    desc: "Embed Matterport, Kuula, or any tour link directly on your property detail pages.",
  },
  {
    icon: BarChart3,
    title: "Analytics dashboard",
    desc: "See views, favourites, and enquiry conversion by listing — with date range filters and CSV export.",
  },
  {
    icon: ShieldCheck,
    title: "Verified agent badge",
    desc: "Complete KYC once and display a trust badge on every listing, agent profile, and search result.",
  },
  {
    icon: Megaphone,
    title: "Featured placements",
    desc: "Promote listings to the homepage, sidebar, and search results with transparent M-Pesa pricing.",
  },
  {
    icon: Sparkles,
    title: "Duplicate photo detection",
    desc: "Automatic SHA-256 hashing warns you if a photo is already used elsewhere on the platform.",
  },
];

const STEPS = [
  { n: 1, title: "Create your account", desc: "Sign up in under a minute — email or Google." },
  { n: 2, title: "Complete KYC", desc: "Upload ID and licence to unlock the verified badge." },
  { n: 3, title: "List or import", desc: "Add one listing, or bulk-import your whole portfolio." },
  { n: 4, title: "Convert leads", desc: "Manage enquiries, viewings, and offers in one place." },
];

function ForAgentsPage() {
  return (
    <>
      <PageHero
        image={heroTools}
        size="md"
        eyebrow={
          <>
            <Building2 className="h-3.5 w-3.5" /> For Agents & Developers
          </>
        }
        title="The complete platform for Kenyan property professionals"
        subtitle="List, market, and close faster. Foxwood Properties gives agents and developers the tools to reach thousands of qualified buyers, renters, and investors — all in one dashboard."
      />

      {/* Primary CTA */}
      <section className="container-page pt-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Start listing free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:border-primary/50 transition-colors"
          >
            View pricing
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container-page py-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold">Everything you need to run a modern agency</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Purpose-built for the Kenyan market — M-Pesa payments, WhatsApp integration, and local knowledge baked in.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y border-border">
        <div className="container-page py-14">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold">Live in four steps</h2>
            <p className="text-sm text-muted-foreground mt-2">From sign-up to your first published listing in under 30 minutes.</p>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl bg-card border border-border p-5">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center mb-3">
                  {s.n}
                </div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why Foxwood */}
      <section className="container-page py-14">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">Why agents choose Foxwood</h2>
            <p className="text-sm text-muted-foreground mt-3">
              We're built for how Kenyan real estate actually works — mobile-first buyers, WhatsApp-driven enquiries, and M-Pesa payments.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "M-Pesa STK Push for listing and advertising packages",
                "WhatsApp click-to-chat on every listing and viewing confirmation",
                "SEO-optimised listing pages that rank on Google Kenya",
                "Neighbourhood guides and price trends for 47 counties",
                "Admin moderation to protect your brand from spam",
                "Free tier — post your first listing at no cost",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-8">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">47</div>
                <div className="text-xs text-muted-foreground mt-1">Counties covered</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">200</div>
                <div className="text-xs text-muted-foreground mt-1">Listings per bulk import</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-xs text-muted-foreground mt-1">Buyer discovery</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">0 KES</div>
                <div className="text-xs text-muted-foreground mt-1">To get started</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-page pb-16">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Ready to grow your agency?</h2>
          <p className="text-sm md:text-base mt-3 opacity-90 max-w-xl mx-auto">
            Join hundreds of Kenyan agents and developers already using Foxwood Properties to close deals faster.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-background text-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Create your free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 text-sm font-medium hover:bg-primary-foreground/10 transition-colors"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
