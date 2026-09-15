/**
 * Single source of truth for app branding (name, tagline, icons).
 * The manifest, head meta tags and the admin branding preview all read from here
 * so install prompts, browser tabs and home-screen icons never drift apart.
 *
 * Bump ICON_VERSION whenever an icon file in /public is replaced — the query
 * string busts browser/PWA caches so existing installs pick up the new artwork.
 */
export const ICON_VERSION = "8";

export const BRAND = {
  name: "Foxwood Properties",
  shortName: "Foxwood",
  appleTitle: "Foxwood",
  tagline: "Your gateway to prime deals",
  description:
    "Browse trusted properties for sale, rent and lease across Kenya. Search homes, land, apartments, Airbnbs and commercial spaces.",
  themeColor: "#0F766E",
  backgroundColor: "#ffffff",
} as const;

/** Append the cache-busting version to a public asset path. */
export const v = (path: string) => `${path}?v=${ICON_VERSION}`;

export type BrandIcon = {
  label: string;
  path: string;
  size: string;
  purpose: string;
};

export const BRAND_ICONS: BrandIcon[] = [
  { label: "Favicon (ICO)", path: "/favicon.ico", size: "16/32/48", purpose: "Browser tab (legacy)" },
  { label: "Favicon 16", path: "/favicon-16.png", size: "16×16", purpose: "Browser tab" },
  { label: "Favicon 32", path: "/favicon-32.png", size: "32×32", purpose: "Browser tab / bookmarks" },
  { label: "App icon 192", path: "/favicon-192.png", size: "192×192", purpose: "Android install prompt" },
  { label: "App icon 512", path: "/favicon-512.png", size: "512×512", purpose: "Splash screen / store" },
  { label: "Maskable 512", path: "/maskable-512.png", size: "512×512", purpose: "Android adaptive (maskable)" },
  { label: "Apple touch icon", path: "/apple-touch-icon.png", size: "180×180", purpose: "iOS home screen" },
];
