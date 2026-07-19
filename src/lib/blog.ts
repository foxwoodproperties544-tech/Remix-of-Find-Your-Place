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

export async function listPublishedPosts(limit = 30): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts").select("*").eq("status", "published")
    .order("published_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as BlogPost[];
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
  const { data } = await supabase.from("profiles")
    .select("id,full_name,avatar_url,bio,company_name").eq("id", id).maybeSingle();
  return (data as AuthorProfile | null) ?? null;
}

export async function incrementPostView(id: string): Promise<void> {
  await supabase.rpc("increment", { table_name: "blog_posts", row_id: id, col: "view_count" }).then(() => {}, () => {});
  // Fallback: best-effort update; ignore RLS failures for anon
  await supabase.from("blog_posts").update({ view_count: undefined as any }).eq("id", id).then(() => {}, () => {});
}

export async function listComments(postId: string): Promise<BlogComment[]> {
  const { data } = await supabase.from("blog_comments").select("*")
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
