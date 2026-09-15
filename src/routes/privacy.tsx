import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

const TITLE = "Privacy Policy — Foxwood Properties";
const DESC = "How Foxwood Properties collects, uses and protects your personal data in line with Kenya's Data Protection Act.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:image", content: absoluteUrl(heroAbout) },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy` }],
  }),
  component: Privacy,
});

const md = `
Last updated: 19 July 2026.

This page describes how **Foxwood Properties** ("we", "us") collects, uses and protects information about you when you use our website and services. Foxwood Properties is committed to complying with Kenya's Data Protection Act, 2019 and applicable regulations issued by the Office of the Data Protection Commissioner.

## Who we are
Foxwood Properties is a real-estate marketplace based in Nairobi, Kenya. Contact us at info@foxwoodproperties.co.ke for any privacy-related enquiries.

## Information we collect
- **Account information** — name, email, phone, WhatsApp number and profile photo you provide when you register.
- **Listing information** — property details, photos, documents and location data you submit when you list a property.
- **Communications** — enquiry messages, viewing requests and reviews you send through the platform.
- **Usage data** — pages visited, searches performed and property views, collected via cookies and analytics.
- **Payment data** — for M-Pesa and card transactions, we receive confirmation identifiers only; we do not store your PIN or card number.

## How we use your information
- Provide, maintain and improve the marketplace.
- Match buyers, tenants and agents.
- Send transactional emails and in-app notifications about your account, listings, enquiries and viewings.
- Prevent fraud, verify identity and enforce our terms.
- Comply with legal obligations.

## Sharing your information
- **Agents and property owners** receive your name, contact details and message when you enquire or book a viewing.
- **Service providers** (hosting, email, SMS, payments) process data on our behalf under confidentiality agreements.
- **Legal authorities** where required by law.

We do **not** sell your personal data.

## Data retention
We retain account and listing data for as long as your account is active. Enquiry and viewing records are retained for up to 24 months to help resolve disputes. You can request deletion at any time.

## Your rights
Under Kenya's Data Protection Act you have the right to:
- Access the personal data we hold about you.
- Correct inaccurate data.
- Request deletion of your data ("right to be forgotten").
- Object to certain processing.
- Withdraw consent for marketing communications.

Email info@foxwoodproperties.co.ke to exercise any of these rights.

## Security
We use industry-standard measures including encryption in transit (HTTPS), row-level access controls on our database, and regular backups. No system is 100% secure — please use a strong password and keep it confidential.

## Cookies
We use cookies for essential site functionality, session management and analytics. See our [Cookie Policy](/cookies) for details.

## Changes to this policy
We may update this policy from time to time. Material changes will be notified via email or in-app notification.

## Contact
Data Protection Officer, Foxwood Properties, Nairobi, Kenya. Email: info@foxwoodproperties.co.ke
`;

function Privacy() {
  return (
    <>
      <PageHero image={heroAbout} size="sm" eyebrow="Legal" title="Privacy Policy" subtitle="How we handle your personal data." />
      <article className="container-page py-12 max-w-3xl">
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
      </article>
    </>
  );
}
