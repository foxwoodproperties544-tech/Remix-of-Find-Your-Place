import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { BookOpen, ShieldCheck, CreditCard, Home, MessageSquare, Search, Building2, Users } from "lucide-react";

const TITLE = "Help Centre — Foxwood Properties";
const DESC = "Guides and how-to articles for buyers, tenants, agents and property owners on Foxwood.";
const OG_IMAGE = absoluteUrl(heroTools);

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/help` }],
  }),
  component: Help,
});

const categories = [
  { icon: Home, title: "Getting started", desc: "Create an account, complete your profile, and browse listings.", links: [
    { label: "How to sign up", to: "/auth" as const },
    { label: "Searching properties", to: "/properties" as const },
    { label: "Save your favorites", to: "/favorites" as const },
  ]},
  { icon: Building2, title: "Listing your property", desc: "Upload photos, set pricing and reach thousands of buyers.", links: [
    { label: "Create a listing", to: "/dashboard/new" as const },
    { label: "Manage listings", to: "/dashboard" as const },
    { label: "List Your Property service", to: "/services/list" as const },
  ]},
  { icon: ShieldCheck, title: "Trust & verification", desc: "How we verify agents and listings and keep the marketplace safe.", links: [
    { label: "How verification works", to: "/faq" as const },
    { label: "Report a problem", to: "/contact" as const },
  ]},
  { icon: CreditCard, title: "Payments & pricing", desc: "M-Pesa, subscriptions and featured listings.", links: [
    { label: "Pricing plans", to: "/pricing" as const },
    { label: "Upgrade to featured", to: "/dashboard/upgrade" as const },
  ]},
  { icon: Search, title: "Tools", desc: "Compare, calculate mortgage, and save searches.", links: [
    { label: "Mortgage calculator", to: "/mortgage" as const },
    { label: "Compare properties", to: "/compare" as const },
    { label: "Saved searches", to: "/saved-searches" as const },
  ]},
  { icon: MessageSquare, title: "Contact & viewings", desc: "Reach agents and book property viewings.", links: [
    { label: "Book a viewing", to: "/properties" as const },
    { label: "My viewings", to: "/dashboard/my-appointments" as const },
    { label: "Contact us", to: "/contact" as const },
  ]},
  { icon: Users, title: "Agents & developers", desc: "Profile pages, reviews and client leads.", links: [
    { label: "My inquiries", to: "/dashboard/inquiries" as const },
    { label: "CRM & leads", to: "/dashboard/leads" as const },
  ]},
  { icon: BookOpen, title: "Learn", desc: "Guides, market reports and investment tips.", links: [
    { label: "Read the blog", to: "/blog" as const },
    { label: "FAQ", to: "/faq" as const },
  ]},
];

function Help() {
  return (
    <>
      <PageHero image={heroTools} eyebrow="Support" title="Help Centre" subtitle="Guides and articles to help you get the most out of Foxwood." />
      <section className="container-page py-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(({ icon: Icon, title, desc, links }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
            <h3 className="mt-4 font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-primary hover:underline">{l.label} →</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="container-page pb-16">
        <div className="rounded-2xl border border-border bg-primary-soft p-6 text-center">
          <h3 className="font-bold text-lg">Can't find what you need?</h3>
          <p className="text-sm text-muted-foreground mt-1">Our team responds within one business day.</p>
          <Link to="/contact" className="btn-primary btn-primary-hover mt-4 inline-flex">Contact support</Link>
        </div>
      </section>
    </>
  );
}
