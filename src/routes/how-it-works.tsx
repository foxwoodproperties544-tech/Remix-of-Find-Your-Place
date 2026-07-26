import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import {
  Search, Heart, CalendarCheck, ShieldCheck, FileText, KeyRound,
  PlusCircle, CreditCard, BadgeCheck, Users2, TrendingUp, Home,
} from "lucide-react";

const TITLE = "How Foxwood Properties Works — Buy, Rent or List in Kenya";
const DESC =
  "Step-by-step guide to buying, renting, selling and listing property on Foxwood Properties — from search and viewings to due diligence, payment and handover.";
const OG_IMAGE = absoluteUrl(heroTools);

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/how-it-works` }],
  }),
  component: HowItWorks,
});

type Step = { icon: any; title: string; body: string };

const TRACKS: { key: "buyer" | "renter" | "agent"; label: string; blurb: string; steps: Step[]; cta: { to: string; label: string } }[] = [
  {
    key: "buyer",
    label: "I want to buy",
    blurb: "From first search to title transfer, with verification built into every step.",
    steps: [
      { icon: Search, title: "Search & filter", body: "Browse by county, town, price, bedrooms or map radius. Save searches and get alerts when new matches are published." },
      { icon: Heart, title: "Shortlist & compare", body: "Save favourites and put up to four listings side by side in the comparison tool, including price per unit." },
      { icon: CalendarCheck, title: "Book a viewing", body: "Request a viewing straight from the listing. The agent confirms, reschedules or proposes a new time and you're notified." },
      { icon: ShieldCheck, title: "Check the verification score", body: "Each listing shows a verification score based on documents and checks our team has confirmed with the agent." },
      { icon: FileText, title: "Run due diligence", body: "Use the Land Due Diligence hub to request searches, survey checks and a title review before you commit any money." },
      { icon: KeyRound, title: "Close and take handover", body: "Agree terms directly with the agent or owner, complete payment through your own advocate, and take possession." },
    ],
    cta: { to: "/properties", label: "Browse properties" },
  },
  {
    key: "renter",
    label: "I want to rent or lease",
    blurb: "Find a home, shop or office and move in without the broker runaround.",
    steps: [
      { icon: Search, title: "Set your budget and area", body: "Filter For Rent and For Lease listings by town, property type and monthly budget." },
      { icon: Heart, title: "Save and get alerts", body: "Save your search and we'll notify you in-app or on WhatsApp when a matching unit goes live." },
      { icon: CalendarCheck, title: "Arrange a viewing", body: "Book a slot online or message the agent on WhatsApp directly from the listing page." },
      { icon: ShieldCheck, title: "Confirm the agent is real", body: "Look for the Verified agent badge, read reviews from other tenants and check their listing history." },
      { icon: FileText, title: "Review the lease", body: "Read the tenancy or lease agreement carefully — deposit, notice period, service charge and who handles repairs." },
      { icon: KeyRound, title: "Sign and move in", body: "Pay deposit and rent to the landlord or managing agent, do a joint inventory check, and collect the keys." },
    ],
    cta: { to: "/properties", label: "Find a rental" },
  },
  {
    key: "agent",
    label: "I want to list / sell",
    blurb: "Get your property in front of serious, high-intent buyers across Kenya.",
    steps: [
      { icon: Users2, title: "Create your account", body: "Sign up and complete your agent profile — bio, base town, services, service areas and verified contact details." },
      { icon: BadgeCheck, title: "Get verified", body: "Subscribe to verification to earn the Verified badge, directory placement and stronger buyer trust." },
      { icon: PlusCircle, title: "Add your listing", body: "Upload photos, a video tour, location pin, documents, features and amenities. Drafts can be saved as you go." },
      { icon: CreditCard, title: "Choose a package", body: "Pick a listing package or subscription and pay by M-Pesa. Founding agents get their first listings free." },
      { icon: ShieldCheck, title: "Admin approval", body: "Our team reviews every listing for accuracy and duplicates before it goes live — usually within one business day." },
      { icon: TrendingUp, title: "Manage leads & close", body: "Every enquiry becomes a lead in your CRM. Assign, follow up, track conversions and monitor traffic insights." },
    ],
    cta: { to: "/dashboard/new", label: "List a property" },
  },
];

const FAQS = [
  { q: "Is it free to search and enquire?", a: "Yes. Searching, saving, comparing, booking viewings and contacting agents is completely free for buyers and tenants." },
  { q: "How long does listing approval take?", a: "Most listings are reviewed within one business day. You'll get a notification the moment your listing is approved or if we need changes." },
  { q: "What does the Verified badge mean?", a: "It means our team confirmed the agent's identity and contact details, and the agent holds an active verification subscription." },
  { q: "How do I pay for a package?", a: "All packages are paid by M-Pesa STK push. Your receipt and payment history are available in your dashboard." },
];

function HowItWorks() {
  const [active, setActive] = useState<"buyer" | "renter" | "agent">("buyer");
  const track = TRACKS.find((t) => t.key === active)!;

  return (
    <>
      <PageHero
        image={heroTools}
        size="sm"
        eyebrow="Getting started"
        title="How Foxwood works"
        subtitle="Whether you're buying, renting or listing, here's exactly what happens at each step."
      />

      <section className="container-page py-12">
        <div className="flex flex-wrap gap-2 justify-center">
          {TRACKS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                active === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-muted-foreground max-w-2xl mx-auto">{track.blurb}</p>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {track.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-6 relative">
              <span className="absolute top-5 right-5 text-4xl font-bold text-muted-foreground/15 leading-none">
                {i + 1}
              </span>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-semibold text-lg">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          <Link to={track.cta.to} className="btn-primary btn-primary-hover">
            {track.cta.label}
          </Link>
          <Link to="/contact" className="btn-ghost">Talk to our team</Link>
        </div>
      </section>

      <section className="bg-muted/40 border-y border-border">
        <div className="container-page py-12 max-w-3xl">
          <h2 className="text-2xl font-bold text-center">Common questions</h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-semibold text-sm">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            More answers in our <Link to="/faq" className="text-primary font-semibold hover:underline">FAQ</Link> or{" "}
            <Link to="/help-center" className="text-primary font-semibold hover:underline">Help Centre</Link>.
          </p>
        </div>
      </section>

      <section className="container-page py-14 text-center">
        <Home className="h-8 w-8 mx-auto text-primary" />
        <h2 className="mt-3 text-2xl font-bold">Ready to find your next property?</h2>
        <p className="mt-2 text-muted-foreground">Thousands of verified listings across Kenya, updated daily.</p>
        <div className="mt-5 flex flex-wrap gap-3 justify-center">
          <Link to="/properties" className="btn-primary btn-primary-hover">Start searching</Link>
          <Link to="/testimonials" className="btn-ghost">Read customer stories</Link>
        </div>
      </section>
    </>
  );
}
