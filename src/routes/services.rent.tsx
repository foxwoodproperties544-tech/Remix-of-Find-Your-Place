import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Rent Property in Kenya — Foxwood Properties";
const DESC = "Find rentals across Kenya that match your lifestyle and budget, with verified landlords and agents.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/rent")({
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
      service="Rent Property"
      eyebrow="Renting service"
      title="Rent a home that fits your life"
      subtitle="Curated rentals with transparent pricing, honest photos and quick move-in support."
      heroImage={hero}
      benefits={[
        { title: "Verified landlords", text: "No fake listings — we vet every rental." },
        { title: "Match by lifestyle", text: "Filter by commute, schools, amenities and more." },
        { title: "Fast viewings", text: "Same-week viewings across major towns." },
        { title: "Move-in support", text: "Help with contracts, deposits and utilities." },
      ]}
      process={[
        "Tell us your budget, area and move-in date.",
        "We send a curated shortlist within 48 hours.",
        "Book viewings on your schedule.",
        "Sign, pay and move in — with our support.",
      ]}
    />
  );
}
