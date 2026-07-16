import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Property Valuation in Kenya — Foxwood Properties";
const DESC = "Accurate, data-backed property valuations from Foxwood's Kenya experts.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/valuation")({
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
      service="Property Valuation"
      eyebrow="Valuation service"
      title="Know exactly what your property is worth"
      subtitle="Independent, market-aligned valuations for sales, financing, insurance and estate planning."
      heroImage={hero}
      benefits={[
        { title: "Market comparables", text: "Latest transaction data across neighborhoods." },
        { title: "Certified reports", text: "Reports accepted by banks and legal partners." },
        { title: "Fast turnaround", text: "Site visit plus report in as little as 5 days." },
        { title: "Fair pricing", text: "Transparent fees — no surprises." },
      ]}
      process={[
        "Share property details and purpose of valuation.",
        "Schedule an inspection at your convenience.",
        "Report drafted with comparables and adjustments.",
        "Delivered digitally within 5 business days.",
      ]}
    />
  );
}
