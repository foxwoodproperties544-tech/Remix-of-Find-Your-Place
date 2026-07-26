import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import heroBlog from "@/assets/hero-blog.jpg";
import blogPlaceholder from "@/assets/blog-placeholder.jpg";
import { PageHero } from "@/components/site/PageHero";
import { getAuthor, listPostsByAuthor, type BlogPost } from "@/lib/blog";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { Calendar, Clock, ArrowRight, Building2, PenLine } from "lucide-react";

export const Route = createFileRoute("/blog/author/$id")({
  loader: async ({ params }) => {
    const author = await getAuthor(params.id);
    if (!author) throw notFound();
    const posts = await listPostsByAuthor(params.id);
    return { author, posts };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Author not found" }, { name: "robots", content: "noindex" }] };
    const { author, posts } = loaderData;
    const name = author.full_name ?? "Foxwood Team";
    const title = `${name} — Author at Foxwood Properties`;
    const desc =
      (author.bio && author.bio.slice(0, 155)) ||
      `Read ${posts.length} property article${posts.length === 1 ? "" : "s"} written by ${name} on the Foxwood Properties blog.`;
    const image = author.avatar_url || absoluteUrl(heroBlog);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: `${SITE_URL}/blog/author/${params.id}` },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/blog/author/${params.id}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name,
            description: author.bio ?? undefined,
            image: author.avatar_url ?? undefined,
            url: `${SITE_URL}/blog/author/${params.id}`,
            worksFor: author.company_name
              ? { "@type": "Organization", name: author.company_name }
              : { "@type": "Organization", name: "Foxwood Properties" },
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Couldn't load this author</h1>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Author not found</h1>
      <Link to="/blog/authors" className="mt-4 inline-block text-primary hover:underline">Browse all authors</Link>
    </div>
  ),
  component: AuthorPage,
});

function AuthorPage() {
  const { author, posts } = Route.useLoaderData();
  const name = author.full_name ?? "Foxwood Team";
  return (
    <>
      <PageHero image={heroBlog} size="sm" eyebrow="Author" title={name}
        subtitle={`${posts.length} published article${posts.length === 1 ? "" : "s"} on Foxwood Properties.`} />

      <section className="container-page py-12">
        <div className="mb-6 text-sm flex gap-4">
          <Link to="/blog" className="text-primary hover:underline">← All posts</Link>
          <Link to="/blog/authors" className="text-primary hover:underline">All authors</Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row gap-5">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt={name} className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary text-2xl font-bold">
              {name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{name}</h1>
            {author.company_name && (
              <p className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {author.company_name}
              </p>
            )}
            {author.bio && <p className="mt-3 text-sm text-foreground/90 leading-relaxed">{author.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/agents/$id" params={{ id: author.id }} className="btn-ghost text-sm">View agent profile</Link>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <PenLine className="h-4 w-4" /> {posts.length} article{posts.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-bold">Articles by {name}</h2>
        {posts.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No published articles yet.</p>
        ) : (
          <div className="mt-5 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p: BlogPost) => <Card key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </>
  );
}

function Card({ p }: { p: BlogPost }) {
  const img = p.cover_image || blogPlaceholder;
  return (
    <article className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-glow transition">
      <Link to="/blog/$slug" params={{ slug: p.slug }}>
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <img src={img} alt={p.title} loading="lazy" decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div className="p-5">
          <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition">{p.title}</h3>
          {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {p.reading_minutes} min</span>
            <span className="ml-auto inline-flex items-center gap-1 text-primary font-semibold">Read <ArrowRight className="h-3 w-3" /></span>
          </div>
        </div>
      </Link>
    </article>
  );
}
