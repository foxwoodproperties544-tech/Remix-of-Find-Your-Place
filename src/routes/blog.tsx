import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import heroBlog from "@/assets/hero-blog.jpg";
import { PageHero } from "@/components/site/PageHero";
import { absoluteUrl } from "@/lib/site-url";
import { listPublishedPosts, type BlogPost } from "@/lib/blog";
import { Calendar, Clock, ArrowRight } from "lucide-react";

const OG_IMAGE = absoluteUrl(heroBlog);
const TITLE = "Blog — Foxwood Properties";
const DESC = "Real estate news, investment tips, and buying guides from Foxwood Properties.";

const postsQO = queryOptions({
  queryKey: ["blog", "list"],
  queryFn: () => listPublishedPosts(),
});

export const Route = createFileRoute("/blog")({
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

function Blog() {
  const { data: posts } = useSuspenseQuery(postsQO);
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
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <PostCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </>
  );
}

function PostCard({ p }: { p: BlogPost }) {
  const date = p.published_at ? new Date(p.published_at).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }) : "";
  return (
    <article className="group rounded-2xl overflow-hidden border border-border bg-card shadow-soft hover:shadow-glow transition">
      <Link to="/blog/$slug" params={{ slug: p.slug }} className="block">
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          {p.cover_image ? (
            <img src={p.cover_image} alt="" loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary-soft text-primary font-semibold px-2 py-0.5 capitalize">{p.category.replace("-", " ")}</span>
          {date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>}
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.reading_minutes} min</span>
        </div>
        <h3 className="font-bold leading-snug mt-3">
          <Link to="/blog/$slug" params={{ slug: p.slug }} className="hover:text-primary">{p.title}</Link>
        </h3>
        {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
        <Link to="/blog/$slug" params={{ slug: p.slug }} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Read article <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
