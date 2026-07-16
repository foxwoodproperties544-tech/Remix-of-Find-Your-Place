import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Investment Advice — Foxwood Properties";
const DESC = "Data-backed real estate investment advice for Kenya — plots, rentals, commercial and mixed-use.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/investment")({
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
      service="Investment Advice"
      eyebrow="Investment advisory"
      title="Build a smarter Kenyan real estate portfolio"
      subtitle="Independent advice on where, when and how to invest — matched to your goals and horizon."
      heroImage={hero}
      benefits={[
        { title: "Market intelligence", text: "Trends across counties, corridors and asset classes." },
        { title: "ROI modeling", text: "Projected yields, appreciation and exit scenarios." },
        { title: "Portfolio design", text: "Diversify across rentals, land and commercial." },
        { title: "Deal sourcing", text: "First look at off-market opportunities." },
      ]}
      process={[
        "Investment goals and risk profile session.",
        "Personalized strategy and target list.",
        "Deal review, due diligence and negotiation.",
        "Ongoing portfolio reviews.",
      ]}
    />
  );
}
