import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPostBySlug, listRelated, listRecentPosts, listPopularPosts, listCategoriesWithCounts, listAllTags, getAuthor } from "@/lib/blog";
import { fetchPublishedProperties } from "@/lib/properties";
import { renderMarkdown, extractHeadings } from "@/lib/markdown";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import heroBlog from "@/assets/hero-blog.jpg";
import { PageHero } from "@/components/site/PageHero";
import { PropertyCard } from "@/components/site/PropertyCard";
import { TableOfContents } from "@/components/site/TableOfContents";
import { ReadingProgress } from "@/components/site/ReadingProgress";
import { BackToTop } from "@/components/site/BackToTop";
import { ShareBar } from "@/components/site/ShareBar";
import { BlogSidebar } from "@/components/site/BlogSidebar";
import { BlogComments } from "@/components/site/BlogComments";
import { Calendar, Clock, ArrowLeft, User, Building2, Phone, ListPlus } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getPostBySlug(params.slug);
    if (!post) throw notFound();
    const [related, recent, popular, categories, tags, author, allProps] = await Promise.all([
      listRelated(post, 4),
      listRecentPosts(6, post.id),
      listPopularPosts(6),
      listCategoriesWithCounts(),
      listAllTags(),
      getAuthor(post.author_id),
      fetchPublishedProperties().catch(() => []),
    ]);
    const tagSet = new Set(post.tags.map((t) => t.toLowerCase()));
    const hay = (post.title + " " + (post.excerpt ?? "")).toLowerCase();
    const relatedProps = allProps
      .filter((p) => {
        const t = p.town?.toLowerCase() ?? "";
        const ty = p.type?.toLowerCase() ?? "";
        return tagSet.has(t) || tagSet.has(ty) || hay.includes(t) || hay.includes(ty);
      })
      .slice(0, 3);
    const featuredProps = allProps.filter((p) => p.featured).slice(0, 4);
    return { post, related, recent, popular, categories, tags, author, relatedProps, featuredProps };
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
  const { post, related, recent, popular, categories, tags, author, relatedProps, featuredProps } = Route.useLoaderData();
  const html = renderMarkdown(post.content);
  const headings = extractHeadings(post.content);
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" }) : "";
  const cover = post.cover_image || heroBlog;
  const url = `${SITE_URL}/blog/${post.slug}`;

  return (
    <>
      <ReadingProgress />
      <PageHero
        image={cover}
        size="sm"
        eyebrow={<span className="capitalize">{post.category.replace("-", " ")}</span>}
        title={post.title}
        subtitle={post.excerpt ?? undefined}
      >
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/85">
          {author && <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{author.full_name}</span>}
          {date && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{date}</span>}
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{post.reading_minutes} min read</span>
        </div>
      </PageHero>

      <div className="container-page py-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-primary">Home</Link></li>
            <li>/</li>
            <li><Link to="/blog" className="hover:text-primary">Blog</Link></li>
            <li>/</li>
            <li className="text-foreground truncate max-w-[220px]">{post.title}</li>
          </ol>
        </nav>
      </div>

      <div className="container-page pb-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main */}
        <main className="min-w-0">
          <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
            <ShareBar url={url} title={post.title} />
          </div>

          {headings.length > 1 && (
            <div className="lg:hidden mb-6">
              <TableOfContents items={headings} />
            </div>
          )}

          <article className="prose-content max-w-none" dangerouslySetInnerHTML={{ __html: html }} />

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((t: string) => (
                <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <ShareBar url={url} title={post.title} />
          </div>

          {/* Author box */}
          {author && (
            <section aria-labelledby="author-heading" className="mt-10 rounded-2xl border border-border bg-card p-6">
              <h2 id="author-heading" className="sr-only">About the author</h2>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-start">
                {author.avatar_url ? (
                  <img src={author.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-full bg-primary-soft grid place-items-center text-primary font-bold text-xl">
                    {(author.full_name ?? "F").slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Written by</div>
                  <div className="text-lg font-bold">{author.full_name ?? "Foxwood Team"}</div>
                  {author.company_name && <div className="text-sm text-muted-foreground">{author.company_name}</div>}
                  {author.bio && <p className="mt-2 text-sm text-foreground/90">{author.bio}</p>}
                  <Link to="/agents/$id" params={{ id: author.id }} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    View all articles &amp; listings →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Property CTA */}
          <section className="mt-10 rounded-2xl bg-gradient-to-br from-primary to-secondary p-8 text-primary-foreground shadow-glow">
            <h2 className="text-2xl font-black">Looking for Land, Houses, Apartments or Commercial Property?</h2>
            <p className="mt-2 text-primary-foreground/90 max-w-2xl">
              Discover verified listings across Kenya and connect directly with owners and agents.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/properties" className="inline-flex items-center gap-2 rounded-full bg-white text-primary font-semibold px-4 py-2 hover:bg-white/90">
                <Building2 className="h-4 w-4" /> Browse Properties
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-white/15 ring-1 ring-white/40 px-4 py-2 font-semibold hover:bg-white/25">
                <Phone className="h-4 w-4" /> Contact Us
              </Link>
              <Link to="/services/list" className="inline-flex items-center gap-2 rounded-full bg-secondary text-secondary-foreground px-4 py-2 font-semibold hover:opacity-90">
                <ListPlus className="h-4 w-4" /> List Your Property
              </Link>
            </div>
          </section>

          {/* Related properties */}
          {relatedProps.length > 0 && (
            <section className="mt-12" aria-labelledby="related-props">
              <h2 id="related-props" className="text-2xl font-bold">Related properties</h2>
              <p className="text-sm text-muted-foreground mt-1">Handpicked listings connected to this article.</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProps.map((p) => <PropertyCard key={p.id} p={p} />)}
              </div>
            </section>
          )}

          {/* Related articles */}
          {related.length > 0 && (
            <section className="mt-12" aria-labelledby="related-posts">
              <h2 id="related-posts" className="text-2xl font-bold">Related articles</h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                {related.map((r) => (
                  <Link key={r.id} to="/blog/$slug" params={{ slug: r.slug }}
                    className="group rounded-2xl overflow-hidden border border-border bg-card shadow-soft hover:shadow-glow transition">
                    {r.cover_image ? (
                      <img src={r.cover_image} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                    )}
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground capitalize">{r.category.replace("-", " ")} · {r.reading_minutes} min</div>
                      <h3 className="mt-1 font-bold leading-snug group-hover:text-primary">{r.title}</h3>
                      {r.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.excerpt}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Comments */}
          <BlogComments postId={post.id} />

          <div className="mt-10">
            <Link to="/blog" className="btn-ghost inline-flex"><ArrowLeft className="h-4 w-4" /> All posts</Link>
          </div>
        </main>

        {/* Sidebar */}
        <div className="min-w-0">
          {headings.length > 1 && (
            <div className="hidden lg:block mb-6">
              <TableOfContents items={headings} />
            </div>
          )}
          <BlogSidebar
            currentPost={post}
            categories={categories}
            popularPosts={popular}
            recentPosts={recent}
            featuredProperties={featuredProps}
            tags={tags}
          />
        </div>
      </div>

      <BackToTop />
    </>
  );
}
