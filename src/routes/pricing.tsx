import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/site/PageHero";
import { PricingGrid } from "@/components/site/PricingGrid";
import { listActivePackages } from "@/lib/packages.functions";
import { Crown } from "lucide-react";
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
      { name: "description", content: "Choose a listing package that fits your needs. Compare photos, videos, featured placement, analytics and more. Pay with M-Pesa." },
      { property: "og:title", content: "Listing packages — Foxwood Properties" },
      { property: "og:description", content: "Transparent packages. Pay by M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Pricing() {
  const { data: pkgs } = useSuspenseQuery(packagesQuery);

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
        <PricingGrid packages={pkgs as any} />
        <p className="text-center text-xs text-muted-foreground mt-8">
          All prices in KES · Pay securely with M-Pesa ·{" "}
          <Link to="/contact" className="underline hover:text-primary">Talk to sales</Link>
        </p>
      </div>
    </>
  );
}
