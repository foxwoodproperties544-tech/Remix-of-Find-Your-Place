import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "../components/site/Header";
import { Footer } from "../components/site/Footer";
import { CookieBanner } from "../components/site/CookieBanner";
import { InstallAppBanner } from "../components/site/InstallAppBanner";
import { FloatingWhatsApp } from "../components/site/FloatingWhatsApp";
import { LiveChatWidget } from "../components/site/LiveChatWidget";
import { TosAcceptBanner } from "../components/site/TosAcceptBanner";
import { LanguageProvider } from "../components/site/LanguageProvider";
import { BRAND, v } from "../lib/branding";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link to="/" className="btn-primary btn-primary-hover">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. You can try refreshing.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-primary btn-primary-hover">Try again</button>
          <a href="/" className="btn-ghost">Go home</a>
        </div>
      </div>
    </div>
  );
}

const SITE_URL = "https://find-joy-list.lovable.app";
const SITE_NAME = BRAND.name;
const SITE_DESC = BRAND.description;
const SITE_OG = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/354431d1-41e3-4865-b0bc-ba59288bf311/id-preview-678a380e--617adacd-c42c-4316-910d-675f77d3209f.lovable.app-1784143550437.png";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: BRAND.themeColor },
      { name: "application-name", content: BRAND.name },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: BRAND.appleTitle },
      { name: "msapplication-TileColor", content: BRAND.themeColor },
      { name: "msapplication-TileImage", content: v("/favicon-192.png") },
      { title: `${SITE_NAME} — ${BRAND.tagline} in Kenya` },
      { name: "description", content: SITE_DESC },
      { property: "og:title", content: `${SITE_NAME} — ${BRAND.tagline} in Kenya` },
      { property: "og:description", content: SITE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE_NAME} — ${BRAND.tagline} in Kenya` },
      { name: "twitter:description", content: SITE_DESC },
      { property: "og:image", content: SITE_OG },
      { name: "twitter:image", content: SITE_OG },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" },
      { rel: "icon", href: v("/favicon.ico"), sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: v("/favicon-16.png") },
      { rel: "icon", type: "image/png", sizes: "32x32", href: v("/favicon-32.png") },
      { rel: "icon", type: "image/png", sizes: "192x192", href: v("/favicon-192.png") },
      { rel: "icon", type: "image/png", sizes: "512x512", href: v("/favicon-512.png") },
      { rel: "apple-touch-icon", sizes: "180x180", href: v("/apple-touch-icon.png") },
      { rel: "manifest", href: v("/manifest.webmanifest") },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/favicon-512.png`,
          description: SITE_DESC,
          areaServed: "KE",
          sameAs: [] as string[],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/properties?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <div className="min-h-screen flex flex-col pb-14 md:pb-0">
          <TosAcceptBanner />
          <Header />
          <main className="flex-1"><Outlet /></main>
          <Footer />
          <CookieBanner />
          <InstallAppBanner />
          <FloatingWhatsApp />
          <LiveChatWidget />
          <MobileTabBar />
        </div>

      </LanguageProvider>
    </QueryClientProvider>
  );
}
