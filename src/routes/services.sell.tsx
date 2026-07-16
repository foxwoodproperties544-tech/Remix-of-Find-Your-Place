import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-contact.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Sell Property in Kenya — Foxwood Properties";
const DESC = "List, market and sell your property at the right price with Foxwood's expert selling team.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/sell")({
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
      service="Sell Property"
      eyebrow="Selling service"
      title="Sell your property at the right price"
      subtitle="Accurate pricing, professional marketing and qualified buyers — all managed for you."
      heroImage={hero}
      benefits={[
        { title: "Accurate valuation", text: "Data-backed pricing that attracts serious buyers." },
        { title: "Wide reach", text: "Featured across Foxwood and partner channels." },
        { title: "Qualified viewings", text: "Only pre-screened buyers walk through your door." },
        { title: "Transaction support", text: "Contracts, transfer and payment guidance." },
      ]}
      process={[
        "Free consultation and valuation.",
        "Professional listing setup with photos and copy.",
        "Marketing across Foxwood, social and partners.",
        "Handle offers, negotiate and close.",
      ]}
    />
  );
}
