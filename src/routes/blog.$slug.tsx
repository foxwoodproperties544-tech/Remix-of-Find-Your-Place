import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPostBySlug, listRelated } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import heroBlog from "@/assets/hero-blog.jpg";
import { PageHero } from "@/components/site/PageHero";
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getPostBySlug(params.slug);
    if (!post) throw notFound();
    const related = await listRelated(post);
    return { post, related };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Post not found" }, { name: "robots", content: "noindex" }] };
    const { post } = loaderData;
    const title = post.seo_title || `${post.title} — Foxwood Properties`;
    const desc = post.seo_description || post.excerpt || "Read the latest from Foxwood Properties.";
    const image = post.cover_image || absoluteUrl(heroBlog);
    const url = `${SITE_URL}/blog/${post.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "article:published_time", content: post.published_at ?? "" },
        { property: "article:section", content: post.category },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: desc,
            image: [image],
            datePublished: post.published_at,
            dateModified: post.updated_at,
            author: { "@type": "Organization", name: "Foxwood Properties" },
            publisher: {
              "@type": "Organization",
              name: "Foxwood Properties",
              logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon-512.png` },
            },
            mainEntityOfPage: url,
            articleSection: post.category,
            keywords: post.tags.join(", "),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  errorComponent: () => <div className="container-page py-24 text-center"><h1 className="text-2xl font-bold">Couldn't load post</h1></div>,
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Post not found</h1>
      <Link to="/blog" className="btn-primary btn-primary-hover mt-6 inline-flex">Back to blog</Link>
    </div>
  ),
  component: PostPage,
});

function PostPage() {
  const { post, related } = Route.useLoaderData();
  const html = renderMarkdown(post.content);
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" }) : "";
  const cover = post.cover_image || heroBlog;

  return (
    <>
      <PageHero
        image={cover}
        size="sm"
        eyebrow={<span className="capitalize">{post.category.replace("-", " ")}</span>}
        title={post.title}
        subtitle={post.excerpt ?? undefined}
      >
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/85">
          {date && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{date}</span>}
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{post.reading_minutes} min read</span>
        </div>
      </PageHero>

      <div className="container-page py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-primary">Home</Link></li>
            <li>/</li>
            <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
            <li>/</li>
            <li className="text-foreground truncate max-w-[220px]">{post.title}</li>
          </ol>
        </nav>
      </div>

      <article className="container-page pb-16 grid gap-10 lg:grid-cols-[1fr_260px]">
        <div className="max-w-3xl">
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: html }} />

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((t: string) => (
                <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}

          <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
            <Link to="/blog" className="btn-ghost inline-flex"><ArrowLeft className="h-4 w-4" /> All posts</Link>
            <ShareButton title={post.title} />
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 self-start">
          {related.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Related reads</h3>
              <ul className="mt-3 space-y-4">
                {related.map((r: import("@/lib/blog").BlogPost) => (
                  <li key={r.id}>
                    <Link to="/blog/$slug" params={{ slug: r.slug }} className="group block">
                      <div className="font-semibold text-sm group-hover:text-primary leading-snug">{r.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{r.reading_minutes} min read</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-primary-soft p-5">
            <h3 className="font-bold">Ready to find your next property?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Browse thousands of verified listings across Kenya.</p>
            <Link to="/properties" className="btn-primary btn-primary-hover mt-3 inline-flex">Browse properties</Link>
          </div>
        </aside>
      </article>
    </>
  );
}

function ShareButton({ title }: { title: string }) {
  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await (navigator as any).share({ title, url }); return; } catch { /* cancelled */ }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try { await navigator.clipboard.writeText(url); alert("Link copied to clipboard"); } catch { /* ignore */ }
    }
  };
  return (
    <button type="button" onClick={onShare} className="btn-ghost inline-flex">
      <Share2 className="h-4 w-4" /> Share
    </button>
  );
}
