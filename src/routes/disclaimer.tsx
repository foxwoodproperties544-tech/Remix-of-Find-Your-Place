import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

const TITLE = "Disclaimer — Foxwood Properties";
const DESC =
  "Legal disclaimer for Foxwood Properties: listing accuracy, third-party content, valuations, due diligence and limitation of liability.";
const OG_IMAGE = absoluteUrl(heroAbout);

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/disclaimer` }],
  }),
  component: Disclaimer,
});

const md = `
Last updated: 26 July 2026.

Foxwood Properties operates an online marketplace that connects property seekers with agents, landlords, developers and owners in Kenya. Please read this disclaimer carefully before relying on anything published on this website.

## 1. Marketplace, not a party to the transaction
Foxwood Properties is a listing and marketing platform. We are not a party to any sale, lease or tenancy agreement made between a user and an agent, landlord, developer or owner. Any contract you enter into is strictly between you and that other party.

## 2. Accuracy of listings
Listing content — including prices, sizes, plot numbers, photographs, features, amenities and availability — is supplied by the person or company that created the listing. While we review listings before approval and run verification checks, we cannot guarantee that every detail is accurate, current or complete. Always confirm details in person before committing funds.

## 3. Verification scores and badges
Verification scores, investment scores and the "Verified agent" badge reflect checks and documents submitted to us at a point in time. They are indicators of diligence, **not** a warranty of title, ownership, legality, quality or investment return.

## 4. Do your own due diligence
Before paying any deposit or purchase price you should:
- Instruct an advocate to conduct an official search at the relevant land registry.
- Confirm the seller's identity and their legal capacity to sell or lease.
- Commission a licensed surveyor and, where relevant, a valuer.
- Never send money to an individual account without written confirmation and legal advice.

Our Land Due Diligence hub is a facilitation service; it does not replace independent legal, survey or financial advice.

## 5. Tools and calculators
The mortgage calculator, price trends, price-per-unit figures, area guides and any market data are provided for general guidance only. They use assumptions that may not reflect your circumstances and do not constitute financial, tax, legal or investment advice.

## 6. Third-party content and links
The website contains content and links supplied by third parties, including maps, payment providers, authentication providers, blog contributors and advertisers. We do not control and are not responsible for that content or for the practices of any third-party site.

## 7. No guarantee of results
We do not guarantee that a listing will sell or let, that any enquiry will convert, or that the website will be uninterrupted or error-free. Package and subscription purchases buy visibility and platform access, not outcomes.

## 8. Fraud warning
Foxwood Properties will never ask you to pay a deposit into a personal mobile-money or bank account on behalf of an agent. If you suspect fraud, report the listing using the "Report listing" button or contact us immediately.

## 9. Limitation of liability
To the fullest extent permitted by Kenyan law, Foxwood Properties, its directors and staff shall not be liable for any indirect, incidental or consequential loss — including loss of profit, data or opportunity — arising from your use of the website or reliance on any content published on it.

## 10. Governing law
This disclaimer is governed by the laws of Kenya and forms part of our Terms & Conditions.

## Contact
Questions about this disclaimer? Email hello@foxwoodproperties.co.ke or call +254 759 556 026.
`;

function Disclaimer() {
  return (
    <>
      <PageHero image={heroAbout} size="sm" eyebrow="Legal" title="Disclaimer" subtitle="What our listings, scores and tools do — and do not — guarantee." />
      <article className="container-page py-12 max-w-3xl">
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
      </article>
    </>
  );
}
