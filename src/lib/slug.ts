import { supabase } from "@/integrations/supabase/client";

/** URL-safe slugify: lowercase, ASCII, hyphenated. */
export function slugify(input: string): string {
  const base = (input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return base.slice(0, 80) || "post";
}

/** Basic shape check for slugs used across the app. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 96;
}

/**
 * Ensure the slug is unique in `blog_posts.slug`, appending -2, -3, ...
 * Pass `excludeId` when editing an existing post.
 */
export async function ensureUniqueBlogSlug(desired: string, excludeId?: string): Promise<string> {
  const base = slugify(desired);
  let candidate = base;
  let i = 1;
  // Try up to 50 variants — enough for any realistic collision.
  while (i < 50) {
    let q = supabase.from("blog_posts").select("id").eq("slug", candidate).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}
