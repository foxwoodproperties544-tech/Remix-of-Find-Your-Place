import { createFileRoute, Link } from "@tanstack/react-router";
import { ServicePage } from "@/components/site/ServicePage";
import hero from "@/assets/hero-contact.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { PlusCircle } from "lucide-react";

const TITLE = "List Your Property — Foxwood Properties";
const DESC = "Post your listing on Foxwood and reach thousands of verified buyers and renters across Kenya.";
const OG = absoluteUrl(hero);

export const Route = createFileRoute("/services/list")({
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
      service="List Your Property"
      eyebrow="List with Foxwood"
      title="Post a listing in minutes"
      subtitle="Owners, agents, developers — reach thousands of qualified buyers and renters on Foxwood."
      heroImage={hero}
      cta={<Link to="/dashboard/new" className="btn-secondary !py-2.5 !px-5 text-sm"><PlusCircle className="h-4 w-4" /> Post a listing</Link>}
      benefits={[
        { title: "Free to list", text: "Post basic listings at no cost — pay only for boosts." },
        { title: "Reach buyers fast", text: "Featured on Foxwood, socials and partner channels." },
        { title: "Owner dashboard", text: "Track views, favorites and inquiries in real time." },
        { title: "Verification", text: "Verified badge builds trust with serious buyers." },
      ]}
      process={[
        "Create an account or sign in.",
        "Fill in the listing form with photos and details.",
        "Submit — our team reviews within a business day.",
        "Once approved, your listing is live on Foxwood.",
      ]}
    />
  );
}
