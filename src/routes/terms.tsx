import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

const TITLE = "Terms and Conditions — Foxwood Properties";
const DESC = "The terms that govern your use of Foxwood Properties and its services.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:image", content: absoluteUrl(heroAbout) },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/terms` }],
  }),
  component: Terms,
});

const md = `
Last updated: 19 July 2026.

These Terms and Conditions ("Terms") govern your access to and use of the **Foxwood Properties** website, mobile applications and services ("Services"). By using the Services you agree to these Terms.

## 1. Eligibility
You must be at least 18 years old and have the legal capacity to enter contracts under Kenyan law to use Foxwood.

## 2. Your account
You are responsible for the security of your account and for all activity under it. Notify us immediately of any unauthorised use.

## 3. Listings
- You may only list properties you own or are authorised to market.
- Listings must be accurate, current and lawful.
- Foxwood may edit, hide, or remove listings that violate these Terms, applicable law, or our content standards.
- Featured listings and verification are subject to separate pricing published on the [Pricing page](/pricing).

## 4. Payments
Fees for featured listings, subscriptions and services are payable via M-Pesa or other supported methods. Fees are non-refundable except where required by law.

## 5. Prohibited conduct
You agree not to:
- Post false, misleading or fraudulent listings.
- Scrape, copy or resell our data without written permission.
- Attempt to circumvent security or access other users' accounts.
- Use the Services for money laundering, tax evasion or any illegal purpose.

## 6. Third-party transactions
Foxwood is a **marketplace**. We are not a party to any sale, rental or lease agreement between users. You are solely responsible for verifying counterparties, negotiating terms and completing transactions. Always engage a licensed advocate.

## 7. Intellectual property
All Foxwood branding, code and platform content are our property. You retain ownership of the listing content you upload, but grant us a worldwide, royalty-free licence to display and promote it while your listing is active.

## 8. Disclaimers
The Services are provided "as is". We do not warrant that listings are accurate, that agents are of any particular standard, or that the Services will be uninterrupted or error-free.

## 9. Limitation of liability
To the maximum extent permitted by law, Foxwood shall not be liable for indirect, incidental, special, consequential or punitive damages arising from your use of the Services.

## 10. Termination
We may suspend or terminate your account at any time for breach of these Terms. You may close your account at any time.

## 11. Governing law
These Terms are governed by the laws of Kenya. Disputes shall be submitted to the exclusive jurisdiction of the courts of Nairobi.

## 12. Contact
Questions? Email hello@foxwoodproperties.co.ke or write to Foxwood Properties, Nairobi, Kenya.
`;

function Terms() {
  return (
    <>
      <PageHero image={heroAbout} size="sm" eyebrow="Legal" title="Terms and Conditions" subtitle="The rules for using Foxwood Properties." />
      <article className="container-page py-12 max-w-3xl">
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
      </article>
    </>
  );
}
