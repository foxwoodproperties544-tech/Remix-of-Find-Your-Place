// Absolute URL helpers for social share metadata.
export const SITE_URL = "https://find-joy-list.lovable.app";

/** Convert a bundler-emitted asset path (e.g. "/assets/x.jpg") to an absolute URL. */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
