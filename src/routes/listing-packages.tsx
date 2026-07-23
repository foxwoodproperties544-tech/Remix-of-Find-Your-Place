import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PackagePageShell } from "@/components/site/PackagePageShell";
import { PricingGrid } from "@/components/site/PricingGrid";
import { listActivePackages } from "@/lib/packages.functions";
import heroTools from "@/assets/hero-tools.jpg";
import { Home } from "lucide-react";

const qo = queryOptions({ queryKey: ["active-packages"], queryFn: () => listActivePackages() });

export const Route = createFileRoute("/listing-packages")({
  component: Page,
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  head: () => ({
    meta: [
      { title: "Listing Packages — Foxwood Properties" },
      { name: "description", content: "Compare Foxwood Properties listing packages. Pick photos, videos, featured placement and priority search — pay with M-Pesa." },
      { property: "og:title", content: "Listing Packages — Foxwood Properties" },
      { property: "og:description", content: "Post a property with the right visibility. Compare listing packages." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://find-joy-list.lovable.app/listing-packages" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://find-joy-list.lovable.app/listing-packages" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://find-joy-list.lovable.app/" },
          { "@type": "ListItem", position: 2, name: "Listing Packages", item: "https://find-joy-list.lovable.app/listing-packages" },
        ],
      }),
    }],
  }),
});

function Page() {
  const { data: pkgs } = useSuspenseQuery(qo);
  return (
    <PackagePageShell
      eyebrow={<><Home className="h-3.5 w-3.5" /> Listing Packages</>}
      title="Post your property with the right visibility"
      subtitle="Choose photos, videos, featured placement and priority in search. Pay once with M-Pesa."
      hero={heroTools}
      crumbs={[{ label: "Home", to: "/" }, { label: "Listing Packages" }]}
      intro={<>Every listing on Foxwood Properties is powered by a package that controls how many photos and videos you can upload, whether you get featured placement, priority in search, and access to lead / CRM tools. Compare the plans below and choose what fits your listing best.</>}
      ctaTitle="Ready to list your property?"
      ctaSubtitle="Create your listing, pick a package, pay by M-Pesa, and go live after admin review."
      ctaHref="/dashboard/new"
      ctaLabel="List a property"
      faqs={[
        { q: "How does payment work?", a: "You pick a package while creating your listing, then complete an M-Pesa STK push on your phone. Your listing moves into admin review as soon as payment is confirmed." },
        { q: "Does my listing publish immediately?", a: "Once payment is confirmed, our team reviews the listing to confirm quality and accuracy. Approved listings go live within a few hours." },
        { q: "What happens when my package expires?", a: "Your listing is auto-expired at the end of the duration. You can renew from your dashboard to keep it live." },
        { q: "Can I upgrade or downgrade later?", a: "Yes. From your dashboard you can start a new package on the same property at any time." },
      ]}
    >
      <PricingGrid packages={pkgs as any} />
    </PackagePageShell>
  );
}
