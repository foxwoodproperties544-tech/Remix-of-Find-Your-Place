import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-blog.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Property Marketing — Foxwood Properties";
const DESC = "Professional photography, listing optimization and targeted campaigns to sell faster.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/marketing")({
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
      service="Property Marketing"
      eyebrow="Marketing service"
      title="Marketing that gets your property noticed"
      subtitle="Photography, floor plans, listing copy and targeted ads that convert viewers to buyers."
      heroImage={hero}
      benefits={[
        { title: "Professional media", text: "Photos, drone and video by trained specialists." },
        { title: "Multi-channel reach", text: "Foxwood, Meta, Google and partner portals." },
        { title: "Targeted campaigns", text: "Reach ideal buyer profiles by budget and area." },
        { title: "Weekly reporting", text: "See views, leads and campaign performance." },
      ]}
      process={[
        "Kickoff call to set audience and goals.",
        "Media shoot and listing production.",
        "Launch across owned and paid channels.",
        "Weekly reports and optimization.",
      ]}
    />
  );
}
