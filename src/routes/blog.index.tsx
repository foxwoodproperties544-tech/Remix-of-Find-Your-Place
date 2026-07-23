import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import heroBlog from "@/assets/hero-blog.jpg";
import blogPlaceholder from "@/assets/blog-placeholder.jpg";
import { PageHero } from "@/components/site/PageHero";
import { absoluteUrl } from "@/lib/site-url";
import { listPublishedPosts, getAuthor, type BlogPost, type AuthorProfile } from "@/lib/blog";
import { Calendar, Clock, ArrowRight, User } from "lucide-react";

const OG_IMAGE = absoluteUrl(heroBlog);
const TITLE = "Blog — Foxwood Properties";
const DESC = "Real estate news, investment tips, and buying guides from Foxwood Properties.";

const postsQO = queryOptions({
  queryKey: ["blog", "list-with-authors"],
  queryFn: async () => {
    const posts = await listPublishedPosts();
    const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean) as string[])];
    const authors = await Promise.all(authorIds.map((id) => getAuthor(id)));
    const authorMap = new Map<string, AuthorProfile>();
    authors.forEach((a) => { if (a) authorMap.set(a.id, a); });
    return { posts, authorMap };
  },
});

export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQO),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  errorComponent: () => <div className="container-page py-24 text-center"><h1 className="text-2xl font-bold">Couldn't load blog</h1></div>,
  notFoundComponent: () => <div className="container-page py-24 text-center">Not found.</div>,
  component: Blog,
});

function formatDate(d: string | null, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }) {
  return d ? new Date(d).toLocaleDateString("en-KE", opts) : "";
}

function authorName(map: Map<string, AuthorProfile>, id: string | null): string {
  if (!id) return "Foxwood Team";
  return map.get(id)?.full_name ?? "Foxwood Team";
}

function Blog() {
  const { data } = useSuspenseQuery(postsQO);
  const { posts, authorMap } = data;
  const [featured, ...rest] = posts;

  return (
    <>
      <PageHero
        image={heroBlog}
        eyebrow="Insights"
        title="The Foxwood Blog"
        subtitle="News, guides and market updates from Kenya's real estate scene."
      />
      <section className="container-page py-14">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No posts published yet.</div>
        ) : (
          <>
            {featured && <FeaturedPost p={featured} authorMap={authorMap} />}
            {rest.length > 0 && (
              <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => <PostCard key={p.id} p={p} authorMap={authorMap} />)}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function FeaturedPost({ p, authorMap }: { p: BlogPost; authorMap: Map<string, AuthorProfile> }) {
  const img = p.cover_image || blogPlaceholder;
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft hover:shadow-glow transition">
      <Link to="/blog/$slug" params={{ slug: p.slug }} className="grid lg:grid-cols-2">
        <div className="relative aspect-[16/9] lg:aspect-auto overflow-hidden bg-muted">
          <img
            src={img}
            alt={p.title}
            width={1280}
            height={720}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute top-4 left-4 rounded-full bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1">
            {p.is_sponsored ? "Sponsored" : "Featured"}
          </span>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-10 gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary-soft text-primary font-semibold px-2.5 py-1 capitalize">
              {p.category.replace("-", " ")}
            </span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(p.published_at, { year: "numeric", month: "long", day: "numeric" })}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{p.reading_minutes} min read</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight group-hover:text-primary transition">
            {p.title}
          </h2>
          {p.excerpt && <p className="text-muted-foreground line-clamp-3">{p.excerpt}</p>}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" /> <span className="font-medium text-foreground">{authorName(authorMap, p.author_id)}</span>
          </div>
          <span className="btn-primary btn-primary-hover mt-2 inline-flex w-fit items-center gap-2">
            Read Article <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </article>
  );
}

function PostCard({ p, authorMap }: { p: BlogPost; authorMap: Map<string, AuthorProfile> }) {
  const img = p.cover_image || blogPlaceholder;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-glow transition">
      <Link to="/blog/$slug" params={{ slug: p.slug }} className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={img}
            alt={p.title}
            width={800}
            height={450}
            loading="lazy"
            decoding="async"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
          <span className="absolute top-3 left-3 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 capitalize shadow-soft">
            {p.category.replace("-", " ")}
          </span>
          {p.is_sponsored && (
            <span className="absolute top-3 right-3 rounded-full bg-secondary text-white text-[10px] font-bold uppercase px-2 py-0.5">Sponsored</span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-bold text-lg leading-snug line-clamp-2 group-hover:text-primary transition">
            {p.title}
          </h3>
          {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{authorName(authorMap, p.author_id)}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(p.published_at)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{p.reading_minutes} min</span>
          </div>

          <div className="mt-auto pt-4">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
              Read More <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
