import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

const packageSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only"),
  description: z.string().max(1000).optional().nullable(),
  price: z.coerce.number().min(0),
  duration_days: z.coerce.number().int().min(1).max(3650),
  features: z.array(z.string()).default([]),
  is_featured: z.boolean().default(false),
  is_sponsored: z.boolean().default(false),
  homepage_placement: z.boolean().default(false),
  priority_placement: z.boolean().default(false),
  badge_color: z.string().max(20).optional().nullable(),
  active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

const draftSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  slug: z.string().max(120).optional().nullable(),
  excerpt: z.string().max(400).optional().nullable(),
  content: z.string().min(20),
  category: z.string().min(2).max(60).default("guides"),
  tags: z.array(z.string().max(40)).max(20).default([]),
  cover_image: z.string().url().optional().nullable(),
  seo_title: z.string().max(120).optional().nullable(),
  seo_description: z.string().max(300).optional().nullable(),
  reading_minutes: z.coerce.number().int().min(1).max(120).default(5),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
}

async function uniqueSlug(supabase: any, base: string, ignoreId?: string): Promise<string> {
  const seed = slugify(base) || "post";
  let cand = seed;
  for (let i = 1; i < 30; i++) {
    let q = supabase.from("blog_posts").select("id").eq("slug", cand).limit(1);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data } = await q;
    if (!data || data.length === 0) return cand;
    cand = `${seed}-${i + 1}`;
  }
  return `${seed}-${Date.now().toString(36)}`;
}

/** Public: active blog packages */
export const listBlogPackages = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabase
    .from("blog_packages").select("*").eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

/** Admin: list all packages */
export const adminListBlogPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("blog_packages").select("*").order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertBlogPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), patch: packageSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await context.supabase.from("blog_packages").update(data.patch).eq("id", data.id);
      if (error) throw error;
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await context.supabase.from("blog_packages").insert(data.patch).select().single();
    if (error) throw error;
    return { ok: true, id: row.id };
  });

export const adminToggleBlogPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("blog_packages").update({ active: data.active }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteBlogPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("blog_packages").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Author: create or update a draft. Only allowed on draft/changes_requested/rejected. */
export const saveBlogDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => draftSchema.parse(d))
  .handler(async ({ data, context }) => {
    const editableStatuses = ["draft", "changes_requested", "rejected"];
    let postId = data.id ?? null;

    if (postId) {
      const { data: existing } = await context.supabase
        .from("blog_posts").select("id, author_id, status").eq("id", postId).maybeSingle();
      if (!existing) throw new Error("Post not found");
      if (existing.author_id !== context.userId) throw new Error("Not your post");
      if (!editableStatuses.includes(existing.status)) throw new Error(`Cannot edit while ${existing.status}`);
    }

    const slug = await uniqueSlug(context.supabase, data.slug || data.title, postId ?? undefined);
    const payload = {
      title: data.title.trim(),
      slug,
      excerpt: data.excerpt?.trim() || null,
      content: data.content,
      category: data.category,
      tags: data.tags,
      cover_image: data.cover_image?.trim() || null,
      seo_title: data.seo_title?.trim() || null,
      seo_description: data.seo_description?.trim() || null,
      reading_minutes: data.reading_minutes,
      author_id: context.userId,
    };

    if (postId) {
      const { error } = await context.supabase.from("blog_posts").update({ ...payload, status: "draft" }).eq("id", postId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await context.supabase
        .from("blog_posts").insert({ ...payload, status: "draft" }).select("id").single();
      if (error) throw error;
      postId = inserted.id;
    }
    return { id: postId, slug };
  });

/** Author: list my posts */
export const listMyBlogPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("id, slug, title, status, category, cover_image, published_at, expires_at, submitted_at, admin_notes, updated_at, package_id, is_sponsored, blog_packages(name, price, badge_color)")
      .eq("author_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

/** Author: get single post (for edit/pay/preview) */
export const getMyBlogPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: post, error } = await context.supabase
      .from("blog_posts").select("*, blog_packages(name, price, duration_days, badge_color, is_featured, is_sponsored)")
      .eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!post) throw new Error("Not found");
    const { data: role } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (post.author_id !== context.userId && !role) throw new Error("Forbidden");
    return post;
  });

/** Author: start M-Pesa payment for a submission. */
export const startBlogSubmissionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    postId: z.string().uuid(),
    packageId: z.string().uuid(),
    phone: z.string().min(9),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");

    const { data: post } = await context.supabase
      .from("blog_posts").select("id, title, author_id, status").eq("id", data.postId).maybeSingle();
    if (!post) throw new Error("Post not found");
    if (post.author_id !== context.userId) throw new Error("Not your post");
    if (!["draft", "pending_payment", "changes_requested", "rejected", "expired"].includes(post.status)) {
      throw new Error(`Cannot pay while status is ${post.status}`);
    }

    const { data: pkg } = await context.supabase
      .from("blog_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Package unavailable");

    // Free package shortcut → straight to pending_review
    if (Number(pkg.price) === 0) {
      const expires = new Date(Date.now() + pkg.duration_days * 86400_000).toISOString();
      await context.supabase.from("blog_post_purchases").insert({
        post_id: post.id, package_id: pkg.id, user_id: context.userId,
        amount_paid: 0, status: "active",
        activated_at: new Date().toISOString(), expires_at: expires,
      });
      await context.supabase.from("blog_posts").update({
        status: "pending_review", package_id: pkg.id,
        submitted_at: new Date().toISOString(), expires_at: expires,
        is_sponsored: pkg.is_sponsored ?? false,
      }).eq("id", post.id);
      return { free: true };
    }

    const site = process.env.SITE_URL ?? "https://find-joy-list.lovable.app";
    const stk = await initiateStkPush({
      phone: data.phone, amount: Number(pkg.price),
      accountReference: `BLG${post.id.slice(0, 8)}`,
      description: `Blog: ${pkg.name}`,
      callbackUrl: `${site}/api/public/mpesa-callback`,
    });

    const { data: txn, error } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: Number(pkg.price),
      purpose: "blog_submission",
      blog_post_id: post.id,
      package_id: pkg.id,
      duration_days: pkg.duration_days,
      merchant_request_id: stk.MerchantRequestID,
      checkout_request_id: stk.CheckoutRequestID,
      status: "pending",
    }).select().single();
    if (error) throw error;

    await context.supabase.from("blog_post_purchases").insert({
      post_id: post.id, package_id: pkg.id, user_id: context.userId,
      mpesa_transaction_id: txn.id, amount_paid: Number(pkg.price), status: "pending",
    });

    await context.supabase.from("blog_posts").update({
      status: "pending_payment", package_id: pkg.id,
    }).eq("id", post.id);

    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage, free: false };
  });

/** Admin: list submissions by status */
export const adminListBlogSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["all", "pending_review", "changes_requested", "approved", "published", "rejected", "pending_payment", "paid", "expired", "archived", "draft"]).default("pending_review"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("blog_posts")
      .select("id, slug, title, status, category, cover_image, published_at, expires_at, submitted_at, reviewed_at, admin_notes, updated_at, author_id, package_id, is_sponsored, blog_packages(name, price, badge_color)")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

/** Admin: full post detail (bypasses author-only RLS via admin role) */
export const adminGetBlogPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: post, error } = await context.supabase
      .from("blog_posts").select("*, blog_packages(name, price, duration_days, is_featured, is_sponsored, badge_color)")
      .eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!post) throw new Error("Not found");
    return post;
  });

/** Admin: approve → published */
export const adminApproveBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), notes: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: post } = await context.supabase
      .from("blog_posts")
      .select("id, author_id, expires_at, package_id, blog_packages(duration_days, is_sponsored)")
      .eq("id", data.id).maybeSingle();
    if (!post) throw new Error("Not found");

    // Ensure expires_at is set (fallback 30d)
    let expiresAt = post.expires_at;
    if (!expiresAt) {
      const days = (post as any).blog_packages?.duration_days ?? 30;
      expiresAt = new Date(Date.now() + days * 86400_000).toISOString();
    }

    const { error } = await context.supabase.from("blog_posts").update({
      status: "published",
      published_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: context.userId,
      admin_notes: data.notes ?? null,
      expires_at: expiresAt,
    }).eq("id", data.id);
    if (error) throw error;

    if (post.author_id) {
      await context.supabase.from("notifications").insert({
        user_id: post.author_id, type: "blog_approved",
        title: "Your blog post is live",
        body: "Your submission has been approved and published.",
        link: "/dashboard/blog",
      });
    }
    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId, actorEmail: (context.claims as any)?.email ?? null,
      action: "blog.approve", entityType: "blog_post", entityId: data.id,
      summary: "Approved blog post", metadata: { notes: data.notes ?? null },
    });
    return { ok: true };
  });

/** Admin: reject */
export const adminRejectBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), notes: z.string().min(3).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: post } = await context.supabase.from("blog_posts").select("author_id").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("blog_posts").update({
      status: "rejected", reviewed_at: new Date().toISOString(),
      reviewed_by: context.userId, admin_notes: data.notes,
    }).eq("id", data.id);
    if (error) throw error;
    if (post?.author_id) {
      await context.supabase.from("notifications").insert({
        user_id: post.author_id, type: "blog_rejected",
        title: "Your blog post was rejected",
        body: data.notes, link: "/dashboard/blog",
      });
    }
    return { ok: true };
  });

/** Admin: request revisions */
export const adminRequestBlogRevisions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), notes: z.string().min(3).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: post } = await context.supabase.from("blog_posts").select("author_id").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("blog_posts").update({
      status: "changes_requested", reviewed_at: new Date().toISOString(),
      reviewed_by: context.userId, admin_notes: data.notes,
    }).eq("id", data.id);
    if (error) throw error;
    if (post?.author_id) {
      await context.supabase.from("notifications").insert({
        user_id: post.author_id, type: "blog_changes_requested",
        title: "Revisions requested on your blog post",
        body: data.notes, link: "/dashboard/blog",
      });
    }
    return { ok: true };
  });

export const adminArchiveBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("blog_posts").update({ status: "archived" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Admin: edit post content directly (formatting fixes) */
export const adminEditBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      title: z.string().optional(),
      excerpt: z.string().nullable().optional(),
      content: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      cover_image: z.string().nullable().optional(),
      seo_title: z.string().nullable().optional(),
      seo_description: z.string().nullable().optional(),
      is_sponsored: z.boolean().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("blog_posts").update(data.patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Author: purchase history for a post */
export const listBlogPostPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("blog_post_purchases")
      .select("*, blog_packages(name, price, duration_days)")
      .eq("post_id", data.postId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

/** Admin: revenue + counts */
export const adminBlogStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [{ data: revRows }, { count: pending }, { count: published }, { count: total }] = await Promise.all([
      context.supabase.from("blog_post_purchases").select("amount_paid").eq("status", "active"),
      context.supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      context.supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
      context.supabase.from("blog_posts").select("id", { count: "exact", head: true }),
    ]);
    const revenue = (revRows ?? []).reduce((s: number, r: any) => s + Number(r.amount_paid ?? 0), 0);
    return { revenue, pending: pending ?? 0, published: published ?? 0, total: total ?? 0 };
  });

/** Admin: manually mark a purchase paid (recovery) */
export const adminMarkBlogPurchasePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: purch } = await context.supabase
      .from("blog_post_purchases").select("*, blog_packages(duration_days, is_sponsored)")
      .eq("id", data.purchaseId).maybeSingle();
    if (!purch) throw new Error("Purchase not found");
    const days = (purch as any).blog_packages?.duration_days ?? 30;
    const expires = new Date(Date.now() + days * 86400_000).toISOString();
    await context.supabase.from("blog_post_purchases").update({
      status: "active", activated_at: new Date().toISOString(), expires_at: expires,
    }).eq("id", data.purchaseId);
    await context.supabase.from("blog_posts").update({
      status: "pending_review", expires_at: expires,
      submitted_at: new Date().toISOString(),
      is_sponsored: (purch as any).blog_packages?.is_sponsored ?? false,
    }).eq("id", purch.post_id);
    return { ok: true };
  });

/** Admin: AI-assisted originality check (Lovable AI, heuristic — not a web-corpus match). */
export const adminRunBlogPlagiarismCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: post } = await context.supabase
      .from("blog_posts").select("id, title, content").eq("id", data.id).maybeSingle();
    if (!post) throw new Error("Not found");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const content = String(post.content ?? "").slice(0, 12000);
    const prompt = `You are an editor screening a blog submission for originality. Return STRICT JSON only, no prose, matching:
{"score": <0-100 integer risk of plagiarism/AI-boilerplate>, "verdict": "clean"|"suspicious"|"likely_copied", "reasons": [short strings], "suspicious_passages": [{"quote": string, "why": string}]}

Article title: ${post.title}
Article:
"""${content}"""`;

    let report: any = { score: 0, verdict: "clean", reasons: [], suspicious_passages: [] };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You return ONLY valid minified JSON." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (res.status === 429) throw new Error("AI rate limit — try again shortly");
      if (res.status === 402) throw new Error("AI credits exhausted — please top up");
      if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
      const json: any = await res.json();
      const text: string = json?.choices?.[0]?.message?.content ?? "{}";
      const match = text.match(/\{[\s\S]*\}/);
      report = JSON.parse(match ? match[0] : text);
    } catch (e: any) {
      report = { score: 0, verdict: "error", reasons: [e?.message ?? "check failed"], suspicious_passages: [] };
    }

    const score = Math.max(0, Math.min(100, Number(report.score ?? 0)));
    await context.supabase.from("blog_posts").update({
      plagiarism_score: score,
      plagiarism_report: report,
      plagiarism_checked_at: new Date().toISOString(),
    }).eq("id", data.id);

    return { ok: true, score, report };
  });

/** Public: list categories and tags with counts for filter pages. */
export const listBlogTaxonomy = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await supabase.from("blog_posts").select("category, tags").eq("status", "published");
  const cats = new Map<string, number>();
  const tags = new Map<string, number>();
  for (const r of (data ?? []) as any[]) {
    cats.set(r.category, (cats.get(r.category) ?? 0) + 1);
    for (const t of r.tags ?? []) tags.set(t, (tags.get(t) ?? 0) + 1);
  }
  return {
    categories: [...cats.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    tags: [...tags.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
});
