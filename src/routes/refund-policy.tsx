import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

const TITLE = "Refund & Cancellation Policy — Foxwood Properties";
const DESC =
  "How refunds, cancellations and renewals work for Foxwood Properties listing packages, advertising packages, blog packages and agent subscriptions.";
const OG_IMAGE = absoluteUrl(heroTools);

export const Route = createFileRoute("/refund-policy")({
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
    links: [{ rel: "canonical", href: `${SITE_URL}/refund-policy` }],
  }),
  component: RefundPolicy,
});

const md = `
Last updated: 26 July 2026.

This policy explains when payments made to **Foxwood Properties** can be refunded or cancelled. It applies to listing packages, advertising packages, blog submission packages, agent and developer subscriptions, and the monthly verification subscription.

## 1. What you are paying for
All packages purchase **platform access and visibility** for a fixed period — for example a published listing slot, an ad placement, a blog placement or a subscription tier with a listing quota. They do not purchase a sale, a tenant, a specific number of leads, or any other outcome.

## 2. Payment confirmation
All payments are made by M-Pesa STK push. A payment is only complete once we receive the confirmed callback from Safaricom. Your receipt, activation date and expiry date are always visible under **Dashboard → Payment history**.

## 3. Refund eligibility
We will refund in full where:
- You were **charged twice** for the same package or subscription period (duplicate M-Pesa transaction).
- Payment was deducted but the package was **never activated** on your account.
- We **reject or remove your listing for a reason caused by us**, such as an administrative error on our side.
- You bought a package and the paid feature was **unavailable for more than 72 consecutive hours** because of a fault on our platform.

## 4. When refunds are not available
Refunds are not available where:
- The package or subscription period has already started and the listing, ad or blog post has been published.
- A listing was rejected or removed because it breached our Terms — for example inaccurate details, duplicate content, fraudulent documents or a property the lister has no right to market.
- You simply changed your mind after the package went live.
- The property sold, let or was withdrawn before the package expired.
- You did not receive as many enquiries as expected.
- The account was suspended for abuse, spam or fraud.

## 5. Cancelling before activation
If your payment has cleared but the listing, ad or blog post has **not yet been approved and published**, you may cancel for a full refund by contacting support before publication.

## 6. Subscriptions and renewals
- Subscriptions run for the period shown on your plan (typically 30 days) and are **not auto-charged** — you renew manually from your dashboard.
- Cancelling means you simply do not renew. Your plan features remain active until the expiry date, followed by a short grace period.
- Part-months are not refunded. Downgrades take effect at the end of the current period.
- The KSh 1,000/month verification subscription follows the same rule: the Verified badge stays active until expiry, and lapses if not renewed.

## 7. How to request a refund
Email **hello@foxwoodproperties.co.ke** or WhatsApp **+254 759 556 026** within **14 days** of the payment, including:
1. The M-Pesa transaction code.
2. The phone number used to pay.
3. The listing, ad, blog post or plan the payment relates to.
4. A short description of the problem.

You can also raise a ticket from the Help Centre so the request is tracked.

## 8. Processing time
Approved refunds are sent back to the **same M-Pesa number used for payment**, normally within **7 to 14 business days**. Any M-Pesa transaction charges are non-refundable.

## 9. Disputes
If you are unhappy with a refund decision, reply to the ticket and ask for escalation. A senior member of our team will review it and respond within 5 business days. Nothing in this policy limits your rights under Kenyan consumer law.

## 10. Changes to this policy
We may update this policy from time to time. The version in force is the one published on this page on the date of your payment.
`;

function RefundPolicy() {
  return (
    <>
      <PageHero
        image={heroTools}
        size="sm"
        eyebrow="Legal"
        title="Refund & Cancellation Policy"
        subtitle="When packages, ads and subscriptions can be refunded or cancelled."
      />
      <article className="container-page py-12 max-w-3xl">
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
      </article>
    </>
  );
}
