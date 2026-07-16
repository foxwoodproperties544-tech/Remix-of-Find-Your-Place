import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Lease Property in Kenya — Foxwood Properties";
const DESC = "Commercial and long-term leases across Kenya — offices, retail, warehouses and mixed-use.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/lease")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
    { property: "og:type", content: "website" }, { property: "og:image", content: OG },
    { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:image", content: OG },
  ]}),
  component: Page,
});

function Page() {
  return (
    <ServicePage
      service="Lease Property"
      eyebrow="Leasing service"
      title="Lease commercial space with clarity"
      subtitle="Office, retail, warehouse and industrial leases — matched to your business needs."
      heroImage={hero}
      benefits={[
        { title: "Business-first fit", text: "Options aligned to your operations and headcount." },
        { title: "Lease structuring", text: "Guidance on terms, escalations and fit-outs." },
        { title: "Location intelligence", text: "Data on footfall, access and neighbouring tenants." },
        { title: "Multi-site portfolios", text: "Support for chains and expansion across Kenya." },
      ]}
      process={[
        "Share space, budget and location requirements.",
        "Shortlist and site visits within a week.",
        "Term-sheet negotiation on your behalf.",
        "Handover, fit-out coordination and lease sign.",
      ]}
    />
  );
}
