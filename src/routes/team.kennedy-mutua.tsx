import { createFileRoute, Link } from "@tanstack/react-router";
import { Quote, Target, Sparkles, Users, MessageCircle, ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { supportMessageFor, trackSupportClick, whatsappUrl } from "@/lib/support";

const NAME = "Kennedy Mutua";
const TITLE = "Kennedy Mutua — Founder & CEO, Foxwood Properties Ltd";
const DESC =
  "Meet Kennedy Mutua, Founder and CEO of Foxwood Properties Ltd — the entrepreneur building Kenya's most trusted digital property marketplace.";
const OG_IMAGE = absoluteUrl(heroAbout);
const CANONICAL = `${SITE_URL}/team/kennedy-mutua`;
const WA = supportMessageFor("generic", "I would like to reach the Foxwood Properties leadership team.");

export const Route = createFileRoute("/team/kennedy-mutua")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: NAME,
          jobTitle: "Founder & Chief Executive Officer",
          url: CANONICAL,
          image: OG_IMAGE,
          worksFor: { "@type": "Organization", name: "Foxwood Properties Ltd", url: SITE_URL },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "About Us", item: `${SITE_URL}/about-us` },
            { "@type": "ListItem", position: 3, name: NAME, item: CANONICAL },
          ],
        }),
      },
    ],
  }),
  component: CeoPage,
});

function CeoPage() {
  return (
    <>
      <PageHero
        image={heroAbout}
        imageAlt="Kenyan property skyline"
        size="md"
        eyebrow="Leadership"
        title="Kennedy Mutua"
        subtitle="Founder & CEO, Foxwood Properties Ltd — building a property marketplace Kenyans can actually trust."
        actions={
          <>
            <Link to="/about-us" className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back to About</Link>
            <Link to="/contact" className="btn-primary btn-primary-hover">Get in touch</Link>
          </>
        }
      />

      <section className="container-page py-16 grid gap-10 md:grid-cols-[1fr_1.6fr]">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft h-fit">
          <div className="mx-auto h-32 w-32 rounded-full bg-gradient-to-br from-primary to-secondary grid place-items-center text-primary-foreground text-4xl font-bold">KM</div>
          <div className="mt-4 text-xl font-bold">{NAME}</div>
          <div className="text-xs text-muted-foreground">Founder &amp; CEO</div>
          <a
            href={whatsappUrl(WA)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSupportClick("whatsapp", "generic")}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp the team
          </a>
        </div>

        <div className="space-y-5">
          <h2 className="text-2xl font-extrabold tracking-tight">The story behind Foxwood</h2>
          <p className="text-muted-foreground">
            Kennedy Mutua founded Foxwood Properties Ltd after watching too many Kenyans lose money, time and confidence
            to opaque property deals. His answer was a marketplace where every listing is verified, every price change
            is on the record, and every agent has a name, a face and a track record.
          </p>
          <p className="text-muted-foreground">
            He leads a team of over twenty researchers, agents, engineers and customer champions who combine deep local
            knowledge of Kenya's counties with modern technology — smart search, interactive maps, price history,
            in-platform offers and secure messaging.
          </p>
          <blockquote className="rounded-2xl border-l-4 border-secondary bg-muted/40 p-5">
            <Quote className="h-5 w-5 text-secondary" />
            <p className="mt-2 italic">
              "Property should be the easiest big decision you ever make — not the scariest. Everything we build at
              Foxwood exists to remove doubt from that decision."
            </p>
            <footer className="mt-2 text-xs text-muted-foreground">— {NAME}, Founder &amp; CEO</footer>
          </blockquote>

          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            {[
              { i: Target, t: "Focus", d: "Verified listings and transparent pricing across all 47 counties." },
              { i: Sparkles, t: "Approach", d: "People-centric service, powered by pragmatic technology." },
              { i: Users, t: "Team", d: "20+ specialists across research, sales, engineering and support." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-bold text-sm">{t}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
