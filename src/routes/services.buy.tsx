import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Buy Property in Kenya — Foxwood Properties";
const DESC = "Find and purchase homes, plots and investments across Kenya with expert Foxwood advisors.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/buy")({
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
      service="Buy Property"
      eyebrow="Buying service"
      title="Buy your next property with confidence"
      subtitle="From first-time homes to investment portfolios — we help you find, verify and close the right deal."
      heroImage={hero}
      benefits={[
        { title: "Verified listings", text: "Every property we recommend is title-checked and inspected." },
        { title: "Local expertise", text: "Advisors who know Nairobi, coast and upcountry markets." },
        { title: "Financing help", text: "Introductions to mortgage partners and payment plans." },
        { title: "End-to-end support", text: "From viewing to transfer, we walk the process with you." },
      ]}
      process={[
        "Share your budget, location and must-haves.",
        "We shortlist matching verified properties.",
        "Guided viewings and honest comparisons.",
        "Negotiation, due diligence and closing support.",
      ]}
    />
  );
}
