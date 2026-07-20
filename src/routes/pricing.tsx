import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/site/PageHero";
import { listActivePackages } from "@/lib/packages.functions";
import { Check, Crown } from "lucide-react";
import heroTools from "@/assets/hero-tools.jpg";

const packagesQuery = {
  queryKey: ["active-packages"],
  queryFn: () => listActivePackages(),
};

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  loader: ({ context }) => context.queryClient.ensureQueryData(packagesQuery),
  head: () => ({
    meta: [
      { title: "Listing packages & pricing — Foxwood Properties" },
      { name: "description", content: "Choose a listing package that fits your needs. Pay with M-Pesa. Transparent pricing with featured placement, analytics and more." },
      { property: "og:title", content: "Listing packages — Foxwood Properties" },
      { property: "og:description", content: "Transparent packages. Pay by M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Pricing() {
  const { data: pkgs } = useSuspenseQuery(packagesQuery);

  const perksFor = (p: any) => {
    const list: string[] = [];
    list.push(`${p.max_listings} listing${p.max_listings > 1 ? "s" : ""}`);
    list.push(`${p.max_photos} photos${p.max_videos ? ` · ${p.max_videos} video${p.max_videos > 1 ? "s" : ""}` : ""}`);
    list.push(`${p.duration_days} days duration`);
    if (p.is_featured) list.push("Featured listing badge");
    if (p.homepage_placement) list.push("Homepage placement");
    if (p.priority_search) list.push("Priority in search");
    if (p.category_highlight) list.push("Category highlight");
    if (p.analytics_enabled) list.push("Analytics dashboard");
    if (p.whatsapp_button) list.push("WhatsApp contact button");
    if (p.lead_management) list.push("Lead / CRM access");
    if (p.renewal_enabled) list.push("Renewal enabled");
    return list;
  };

  return (
    <>
      <PageHero
        image={heroTools}
        size="sm"
        eyebrow={<><Crown className="h-3.5 w-3.5" /> Listing packages</>}
        title="Choose the right package"
        subtitle="Simple, transparent pricing. Pay with M-Pesa. Upgrade any time."
      />
      <div className="container-page py-12">
        {pkgs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No packages available right now. Please check back soon.</div>
        ) : (
          <div className={`grid gap-5 md:grid-cols-2 ${pkgs.length >= 3 ? "lg:grid-cols-3" : ""} ${pkgs.length >= 4 ? "xl:grid-cols-4" : ""}`}>
            {pkgs.map((p: any) => {
              const highlight = p.is_featured || p.homepage_placement;
              return (
                <div key={p.id} className={`relative rounded-2xl border p-6 flex flex-col ${highlight ? "border-primary shadow-glow" : "border-border shadow-soft"} bg-card`}>
                  {highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">Recommended</span>}
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.badge_color || "#0F766E" }} />
                    <h3 className="text-lg font-bold">{p.name}</h3>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  <div className="mt-3">
                    <span className="text-3xl font-extrabold">
                      {Number(p.price) === 0 ? "Free" : `KES ${Number(p.price).toLocaleString()}`}
                    </span>
                    {Number(p.price) > 0 && <span className="text-sm text-muted-foreground"> / {p.duration_days}d</span>}
                  </div>
                  <ul className="mt-5 space-y-2 text-sm flex-1">
                    {perksFor(p).map((perk) => (
                      <li key={perk} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span>{perk}</span></li>
                    ))}
                  </ul>
                  <Link to="/dashboard/new" className="btn-primary btn-primary-hover mt-6 justify-center">
                    {Number(p.price) === 0 ? "Get started" : "Choose package"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground mt-8">All prices in KES · Pay securely with M-Pesa · Managed from admin dashboard</p>
      </div>
    </>
  );
}
