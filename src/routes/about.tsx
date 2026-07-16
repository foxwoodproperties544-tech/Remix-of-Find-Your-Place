import { createFileRoute } from "@tanstack/react-router";
import { Target, Eye, Heart, ShieldCheck, Users, BadgeCheck } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";

const OG_IMAGE = absoluteUrl(heroAbout);
const TITLE = "About — Foxwood Properties";
const DESC = "Foxwood Properties helps Kenyans buy, rent and lease properties with confidence.";

export const Route = createFileRoute("/about")({
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
  }),
  component: About,
});

function About() {
  return (
    <>
      <PageHero
        image={heroAbout}
        eyebrow="About us"
        title="Helping Kenyans find prime property with confidence"
        subtitle="Foxwood Properties is a modern real-estate marketplace built for buyers, tenants and landlords across Kenya. We combine local expertise with verified listings and trusted agents."
      />

      <section className="container-page py-16 grid gap-8 md:grid-cols-3">
        {[
          {i: Target, t: "Mission", d: "To make property discovery and transactions in Kenya simple, transparent and trustworthy."},
          {i: Eye, t: "Vision", d: "To be the most trusted real-estate marketplace in East Africa."},
          {i: Heart, t: "Core values", d: "Integrity, transparency, service excellence and local expertise."},
        ].map(({i:Icon,t,d}) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
            <h3 className="mt-4 font-bold text-lg">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container-page">
          <h2 className="text-3xl font-bold text-center">Why choose Foxwood</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {i: BadgeCheck, t: "Verified listings", d: "Every property vetted for accuracy."},
              {i: Users, t: "Trusted agents", d: "Professional and background-checked."},
              {i: ShieldCheck, t: "Secure transactions", d: "Guidance from search to signing."},
            ].map(({i:Icon,t,d}) => (
              <div key={t} className="rounded-2xl bg-background border border-border p-6">
                <Icon className="h-6 w-6 text-primary" />
                <h4 className="mt-3 font-semibold">{t}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-3xl font-bold text-center">Meet the team</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {[
            {n: "David Kimani", r: "Founder & CEO"},
            {n: "Wangari Mwangi", r: "Head of Sales"},
            {n: "Brian Otieno", r: "Lead Agent, Nairobi"},
            {n: "Amina Hussein", r: "Coast Region Lead"},
          ].map(m => (
            <div key={m.n} className="text-center">
              <div className="mx-auto h-28 w-28 rounded-full bg-gradient-to-br from-primary to-secondary grid place-items-center text-primary-foreground text-2xl font-bold">
                {m.n.split(" ").map(x=>x[0]).join("")}
              </div>
              <div className="mt-3 font-semibold">{m.n}</div>
              <div className="text-xs text-muted-foreground">{m.r}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
