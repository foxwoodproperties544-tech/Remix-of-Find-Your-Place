import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import { PricingGrid } from "@/components/site/PricingGrid";
import { listActivePackages } from "@/lib/packages.functions";
import { listActiveAdPackages } from "@/lib/ads.functions";
import { TIER_PLANS } from "@/lib/pricing";
import { Crown, Home, Megaphone, Star, Check, ArrowRight } from "lucide-react";
import heroTools from "@/assets/hero-tools.jpg";

const packagesQO = queryOptions({ queryKey: ["active-packages"], queryFn: () => listActivePackages() });
const adPackagesQO = queryOptions({ queryKey: ["active-ad-packages"], queryFn: () => listActiveAdPackages() });

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(packagesQO),
    context.queryClient.ensureQueryData(adPackagesQO),
  ]),
  head: () => ({
    meta: [
      { title: "Pricing — Listing, Advertising & Agent plans | Foxwood Properties" },
      { name: "description", content: "Compare listing packages, advertising placements, and agent subscription plans. Transparent Kenyan pricing. Pay with M-Pesa." },
      { property: "og:title", content: "Pricing — Foxwood Properties" },
      { property: "og:description", content: "Listing packages, ad placements, and agent subscriptions. Pay by M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Tab = "listings" | "ads" | "subscriptions";

function Pricing() {
  const { data: pkgs } = useSuspenseQuery(packagesQO);
  const { data: adPkgs } = useSuspenseQuery(adPackagesQO);
  const [tab, setTab] = useState<Tab>("listings");

  return (
    <>
      <PageHero
        image={heroTools}
        size="sm"
        eyebrow={<><Crown className="h-3.5 w-3.5" /> Pricing</>}
        title="Plans for every seller, agent & advertiser"
        subtitle="Three ways to grow on Foxwood: list a property, run an ad, or subscribe as an agent. Pay with M-Pesa."
      />
      <div className="container-page py-10">
        {/* Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1">
            <TabBtn active={tab === "listings"} onClick={() => setTab("listings")} icon={Home} label="Listing packages" />
            <TabBtn active={tab === "ads"} onClick={() => setTab("ads")} icon={Megaphone} label="Advertising" />
            <TabBtn active={tab === "subscriptions"} onClick={() => setTab("subscriptions")} icon={Star} label="Agent subscriptions" />
          </div>
        </div>

        <div className="mt-10">
          {tab === "listings" && (
            <section>
              <SectionHeader
                title="Listing packages"
                subtitle="Post a property. Choose photos, videos, featured placement and priority search."
              />
              <div className="mt-8"><PricingGrid packages={pkgs as any} /></div>
            </section>
          )}

          {tab === "ads" && (
            <section>
              <SectionHeader
                title="Advertising packages"
                subtitle="Promote your brand across the homepage, sidebar and blog with rotating banners."
              />
              <AdPackagesGrid packages={adPkgs as any[]} />
            </section>
          )}

          {tab === "subscriptions" && (
            <section>
              <SectionHeader
                title="Agent & developer subscriptions"
                subtitle="Higher listing quotas, verified badge, featured allowances and account support."
              />
              <SubscriptionGrid />
            </section>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          All prices in KES · Pay securely with M-Pesa ·{" "}
          <Link to="/contact" className="underline hover:text-primary">Talk to sales</Link>
        </p>
      </div>
    </>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:text-foreground"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground text-sm">{subtitle}</p>
    </div>
  );
}

function AdPackagesGrid({ packages }: { packages: any[] }) {
  if (!packages || packages.length === 0) {
    return <p className="mt-8 text-center text-sm text-muted-foreground">No advertising packages available right now. Please check back soon.</p>;
  }
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-glow transition flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-secondary capitalize">{p.placement?.replace("_", " ")}</div>
              <h3 className="text-lg font-bold mt-1">{p.name}</h3>
            </div>
            {p.badge_color && <span className="rounded-full bg-primary-soft text-primary text-[11px] font-semibold px-2 py-0.5">Featured</span>}
          </div>
          {p.description && <p className="text-sm text-muted-foreground mt-2">{p.description}</p>}
          <div className="mt-4">
            <span className="text-3xl font-extrabold">KES {Number(p.price).toLocaleString()}</span>
            <span className="text-sm text-muted-foreground"> / {p.duration_days} days</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm flex-1">
            <Li>{p.duration_days} days of active placement</Li>
            <Li className="capitalize">Placement: {p.placement?.replace("_", " ")}</Li>
            {p.max_impressions ? <Li>Up to {Number(p.max_impressions).toLocaleString()} impressions</Li> : <Li>Unlimited impressions</Li>}
            <Li>Impression &amp; click analytics</Li>
            <Li>CSV export &amp; date filters</Li>
          </ul>
          <Link to="/dashboard/advertise" className="btn-primary btn-primary-hover mt-6 justify-center">
            Start advertising <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ))}
    </div>
  );
}

function SubscriptionGrid() {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {TIER_PLANS.map((t) => (
        <div key={t.id} className={`relative rounded-2xl border p-6 shadow-soft flex flex-col ${t.highlight ? "border-primary bg-primary-soft/40" : "border-border bg-card"}`}>
          {t.highlight && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider px-3 py-1">
              Most popular
            </span>
          )}
          <h3 className="text-lg font-bold">{t.name}</h3>
          <div className="mt-3">
            {t.price === 0 ? (
              <span className="text-3xl font-extrabold">Free</span>
            ) : (
              <>
                <span className="text-3xl font-extrabold">KES {t.price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Up to {t.quota === 999 ? "unlimited" : t.quota} active listings</div>
          <ul className="mt-4 space-y-2 text-sm flex-1">
            {t.perks.map((perk) => <Li key={perk}>{perk}</Li>)}
          </ul>
          <Link
            to="/dashboard/upgrade"
            search={{ tier: t.id } as any}
            className={`mt-6 justify-center ${t.price === 0 ? "btn-ghost" : "btn-primary btn-primary-hover"}`}
          >
            {t.price === 0 ? "Start free" : `Choose ${t.name}`}
          </Link>
        </div>
      ))}
    </div>
  );
}

function Li({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <li className={`flex items-start gap-2 ${className}`}>
      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
