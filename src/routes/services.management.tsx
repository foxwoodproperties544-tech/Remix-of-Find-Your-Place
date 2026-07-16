import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Property Management — Foxwood Properties";
const DESC = "End-to-end management for landlords and investors — tenants, rent, maintenance handled.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/management")({
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
      service="Property Management"
      eyebrow="Management service"
      title="Hands-off property management"
      subtitle="Tenant sourcing, rent collection, maintenance and reporting — we run your property while you focus on life."
      heroImage={hero}
      benefits={[
        { title: "Tenant screening", text: "Reference checks, ID verification and lease drafting." },
        { title: "Rent collection", text: "Automated invoicing and follow-up on your behalf." },
        { title: "Maintenance", text: "Vetted contractors and issue tracking." },
        { title: "Owner reporting", text: "Monthly statements and transparent fees." },
      ]}
      process={[
        "Property audit and management proposal.",
        "Sign management agreement and onboard tenants.",
        "We handle day-to-day operations end to end.",
        "You receive monthly statements and rent payouts.",
      ]}
    />
  );
}
