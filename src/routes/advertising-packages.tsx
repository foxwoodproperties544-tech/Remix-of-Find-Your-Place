import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PackagePageShell, Li, SectionHeader } from "@/components/site/PackagePageShell";
import { listActiveAdPackages } from "@/lib/ads.functions";
import heroTools from "@/assets/hero-tools.jpg";
import { ArrowRight, Megaphone } from "lucide-react";
import { SupportBanner } from "@/components/site/SupportBanner";

const qo = queryOptions({ queryKey: ["active-ad-packages"], queryFn: () => listActiveAdPackages() });

export const Route = createFileRoute("/advertising-packages")({
  component: Page,
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  head: () => ({
    meta: [
      { title: "Advertising Packages — Foxwood Properties" },
      { name: "description", content: "Promote your brand on Foxwood Properties. Homepage, sidebar, search, blog and category banner placements with click tracking and analytics." },
      { property: "og:title", content: "Advertising Packages — Foxwood Properties" },
      { property: "og:description", content: "Rotating banner ads across Foxwood with click tracking and analytics." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://foxwoodproperties-co-ke.lovable.app/advertising-packages" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://foxwoodproperties-co-ke.lovable.app/advertising-packages" }],
  }),
});

const PLACEMENT_LABELS: Record<string, string> = {
  homepage: "Homepage Banner",
  homepage_banner: "Homepage Banner",
  sidebar: "Sidebar Banner",
  sidebar_banner: "Sidebar Banner",
  search: "Search Results Banner",
  search_results: "Search Results Banner",
  blog: "Blog Banner",
  blog_banner: "Blog Banner",
  category: "Category Banner",
  category_banner: "Category Banner",
};

function labelFor(p: string) {
  return PLACEMENT_LABELS[p] ?? p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Page() {
  const { data: pkgs } = useSuspenseQuery(qo);
  const list = (pkgs ?? []) as any[];

  // Group by placement family
  const groups: Record<string, any[]> = {};
  for (const p of list) {
    const key = (p.placement || "other").toLowerCase();
    (groups[key] ||= []).push(p);
  }
  const groupOrder = ["homepage", "homepage_banner", "sidebar", "sidebar_banner", "search", "search_results", "blog", "blog_banner", "category", "category_banner"];
  const groupKeys = Object.keys(groups).sort((a, b) => {
    const ai = groupOrder.indexOf(a); const bi = groupOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <PackagePageShell
      eyebrow={<><Megaphone className="h-3.5 w-3.5" /> Advertising</>}
      title="Reach Kenya's most active property audience"
      subtitle="Rotating banner placements across the homepage, sidebar, search, blog and category pages — with impression and click analytics."
      hero={heroTools}
      crumbs={[{ label: "Home", to: "/" }, { label: "Advertising Packages" }]}
      intro={<>Advertise your development, service or brand to buyers, renters and investors browsing Foxwood every day. Every campaign includes impression and click tracking, CSV export and date-range analytics in your advertiser dashboard.</>}
      ctaTitle="Ready to launch a campaign?"
      ctaSubtitle="Upload your creative, pick a placement, pay with M-Pesa and go live after admin approval."
      ctaHref="/dashboard/advertise"
      ctaLabel="Start advertising"
      faqs={[
        { q: "How are ads shown?", a: "Ads rotate randomly across their placement with weighted impressions, so every active campaign gets fair visibility." },
        { q: "Do I get analytics?", a: "Yes — impressions, clicks, CTR and daily charts are in your Ad Analytics dashboard with CSV export." },
        { q: "Do campaigns require approval?", a: "Yes. Every creative is reviewed by our moderation team before it starts serving." },
        { q: "Can I pause a campaign?", a: "Yes — pause, resume or schedule start/end dates from your dashboard at any time." },
      ]}
    >
      {list.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No advertising packages available right now. Please check back soon.</div>
      ) : (
        groupKeys.map((key) => (
          <section key={key}>
            <SectionHeader title={labelFor(key)} subtitle={`${groups[key].length} package${groups[key].length > 1 ? "s" : ""} available`} />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {groups[key].map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-glow transition flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-secondary">{labelFor(key)}</div>
                      <h3 className="text-lg font-bold mt-1">{p.name}</h3>
                    </div>
                    {p.badge_color && <span className="rounded-full bg-primary-soft text-primary text-[11px] font-semibold px-2 py-0.5">Most popular</span>}
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-2">{p.description}</p>}
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold">KES {Number(p.price).toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground"> / {p.duration_days} days</span>
                  </div>
                  <ul className="mt-4 space-y-2 flex-1">
                    <Li>{p.duration_days} days active placement</Li>
                    <Li>Placement: {labelFor(key)}</Li>
                    {p.max_impressions ? <Li>Up to {Number(p.max_impressions).toLocaleString()} impressions</Li> : <Li>Unlimited impressions</Li>}
                    <Li>Click tracking &amp; CTR</Li>
                    <Li>Impression analytics dashboard</Li>
                    <Li>CSV export &amp; date filters</Li>
                  </ul>
                  <Link to="/dashboard/advertise" className="btn-primary btn-primary-hover mt-6 justify-center">
                    Buy now <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
      <div className="mt-8">
        <SupportBanner context="advertising_packages" whatsappMessage="Hello Foxwood Properties, I need help with an advertising package." />
      </div>
    </PackagePageShell>
  );
}
