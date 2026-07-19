import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

const TITLE = "Cookie Policy — Foxwood Properties";
const DESC = "How Foxwood Properties uses cookies and similar technologies.";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:image", content: absoluteUrl(heroAbout) },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/cookies` }],
  }),
  component: Cookies,
});

const md = `
Last updated: 19 July 2026.

This Cookie Policy explains how **Foxwood Properties** uses cookies and similar technologies when you visit our website.

## What are cookies?
Cookies are small text files stored on your device by your browser. They help websites remember your preferences and understand how you use them.

## Types of cookies we use
- **Essential cookies** — required for the site to function (authentication, session, security). These cannot be disabled.
- **Preference cookies** — remember your choices such as theme, language or saved filters.
- **Analytics cookies** — help us understand which pages are popular and how users navigate the site. We use aggregated data only.
- **Session storage** — we use browser session and local storage for things like your favorites list and recently viewed properties.

## Third-party cookies
Some third-party services we use (e.g. maps, authentication providers) may set their own cookies. We do not control those cookies — please refer to the third party's cookie policy.

## Managing cookies
You can control cookies through your browser settings — most browsers allow you to block or delete cookies. Disabling essential cookies may prevent the site from working correctly.

You can also withdraw analytics consent at any time by clicking "Cookie settings" in the footer (coming soon).

## Changes
We may update this Cookie Policy from time to time. Material changes will be communicated on this page.

## Contact
Questions? Email hello@foxwoodproperties.co.ke.
`;

function Cookies() {
  return (
    <>
      <PageHero image={heroAbout} size="sm" eyebrow="Legal" title="Cookie Policy" subtitle="How we use cookies on Foxwood." />
      <article className="container-page py-12 max-w-3xl">
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
      </article>
    </>
  );
}
