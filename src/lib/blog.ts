import { supabase } from "@/integrations/supabase/client";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_id: string | null;
  status: string;
  published_at: string | null;
  reading_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
  view_count: number;
  is_sponsored?: boolean;
  blog_packages?: { is_featured?: boolean; priority_placement?: boolean; badge_color?: string | null; name?: string } | null;
  created_at: string;
  updated_at: string;
}

export interface BlogComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string;
  body: string;
  status: string;
  like_count: number;
  created_at: string;
}

export interface AuthorProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company_name: string | null;
}

/**
 * Public: published posts, ordered by tier so Sponsored → Featured → Basic,
 * then by recency. Sponsorship is stored on the post; featured comes from the
 * chosen package. Uses a left join so posts with no package still return.
 */
export async function listPublishedPosts(
  limit = 30,
  opts: { category?: string; tag?: string } = {}
): Promise<BlogPost[]> {
  let q = supabase
    .from("blog_posts")
    .select("*, blog_packages(is_featured, priority_placement, badge_color, name)")
    .eq("status", "published");
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.tag) q = q.contains("tags", [opts.tag]);
  const { data, error } = await q
    .order("is_sponsored", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Secondary sort in JS to bubble featured packages above basic within same sponsored tier.
  const rows = (data ?? []) as any[];
  rows.sort((a, b) => {
    const rank = (r: any) =>
      (r.is_sponsored ? 3 : 0) +
      (r.blog_packages?.is_featured ? 2 : 0) +
      (r.blog_packages?.priority_placement ? 1 : 0);
    const d = rank(b) - rank(a);
    if (d !== 0) return d;
    return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
  });
  return rows as BlogPost[];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  return (data as BlogPost | null) ?? null;
}

export async function listRelated(post: BlogPost, limit = 6): Promise<BlogPost[]> {
  const { data } = await supabase
    .from("blog_posts").select("*").eq("status", "published")
    .eq("category", post.category).neq("id", post.id)
    .order("published_at", { ascending: false }).limit(limit);
  return (data ?? []) as BlogPost[];
}

export async function listRecentPosts(limit = 5, excludeId?: string): Promise<BlogPost[]> {
  let q = supabase.from("blog_posts").select("*").eq("status", "published")
    .order("published_at", { ascending: false }).limit(limit);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return (data ?? []) as BlogPost[];
}

export async function listPopularPosts(limit = 5): Promise<BlogPost[]> {
  const { data } = await supabase.from("blog_posts").select("*")
    .eq("status", "published").order("view_count", { ascending: false }).limit(limit);
  return (data ?? []) as BlogPost[];
}

export async function listCategoriesWithCounts(): Promise<{ category: string; count: number }[]> {
  const { data } = await supabase.from("blog_posts").select("category").eq("status", "published");
  const map = new Map<string, number>();
  for (const r of (data ?? []) as { category: string }[]) {
    map.set(r.category, (map.get(r.category) ?? 0) + 1);
  }
  return [...map.entries()].map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function listAllTags(): Promise<string[]> {
  const { data } = await supabase.from("blog_posts").select("tags").eq("status", "published");
  const set = new Set<string>();
  for (const r of (data ?? []) as { tags: string[] }[]) r.tags?.forEach((t) => set.add(t));
  return [...set].sort();
}

export async function getAuthor(id: string | null): Promise<AuthorProfile | null> {
  if (!id) return null;
  const { data } = await supabase.from("public_profiles")
    .select("id,full_name,avatar_url,bio,company_name").eq("id", id).maybeSingle();
  return (data as AuthorProfile | null) ?? null;
}

/** Published posts written by one author, newest first. */
export async function listPostsByAuthor(authorId: string, limit = 60): Promise<BlogPost[]> {
  const { data, error } = await supabase.from("blog_posts").select("*")
    .eq("status", "published").eq("author_id", authorId)
    .order("published_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export interface AuthorSummary extends AuthorProfile {
  post_count: number;
  latest_at: string | null;
}

/** All authors that have at least one published post, with post counts. */
export async function listAuthorsWithCounts(): Promise<AuthorSummary[]> {
  const { data } = await supabase.from("blog_posts")
    .select("author_id, published_at").eq("status", "published");
  const stats = new Map<string, { count: number; latest: string | null }>();
  for (const r of (data ?? []) as { author_id: string | null; published_at: string | null }[]) {
    if (!r.author_id) continue;
    const cur = stats.get(r.author_id) ?? { count: 0, latest: null };
    cur.count += 1;
    if (r.published_at && (!cur.latest || r.published_at > cur.latest)) cur.latest = r.published_at;
    stats.set(r.author_id, cur);
  }
  const ids = [...stats.keys()];
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase.from("public_profiles")
    .select("id,full_name,avatar_url,bio,company_name").in("id", ids);
  return (profiles ?? []).map((p) => ({
    ...(p as AuthorProfile),
    post_count: stats.get((p as AuthorProfile).id)?.count ?? 0,
    latest_at: stats.get((p as AuthorProfile).id)?.latest ?? null,
  })).sort((a, b) => b.post_count - a.post_count);
}


export async function incrementPostView(_id: string): Promise<void> {
  // Best-effort; requires an RPC or admin write. Silent no-op on RLS block.
  return;
}

export async function listComments(postId: string): Promise<BlogComment[]> {
  // author_email is intentionally excluded — commenter emails are not public.
  const { data } = await supabase.from("blog_comments")
    .select("id,post_id,parent_id,author_id,author_name,body,status,like_count,report_count,created_at,updated_at")
    .eq("post_id", postId).eq("status", "approved")
    .order("created_at", { ascending: true });
  return (data ?? []) as BlogComment[];
}

export async function postComment(input: {
  postId: string; parentId: string | null; body: string; authorName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, error: "Please sign in to comment." };
  const { error } = await supabase.from("blog_comments").insert({
    post_id: input.postId, parent_id: input.parentId,
    author_id: user.id, author_name: input.authorName || user.email?.split("@")[0] || "Anonymous",
    author_email: user.email ?? null, body: input.body, status: "pending",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleCommentLike(commentId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return false;
  const { data: existing } = await supabase.from("blog_comment_likes")
    .select("comment_id").eq("comment_id", commentId).eq("user_id", user.id).maybeSingle();
  if (existing) {
    await supabase.from("blog_comment_likes").delete()
      .eq("comment_id", commentId).eq("user_id", user.id);
    return false;
  }
  await supabase.from("blog_comment_likes").insert({ comment_id: commentId, user_id: user.id });
  return true;
}

export async function reportComment(commentId: string, reason: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return false;
  const { error } = await supabase.from("blog_comment_reports")
    .insert({ comment_id: commentId, reporter_id: user.id, reason });
  return !error;
}

export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { ok: false, error: "Enter a valid email." };
  const { error } = await supabase.from("blog_newsletter_subscribers").insert({ email: clean });
  if (error && !/duplicate|unique/i.test(error.message)) return { ok: false, error: error.message };
  return { ok: true };
}
