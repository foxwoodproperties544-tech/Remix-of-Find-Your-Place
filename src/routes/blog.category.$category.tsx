import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import heroBlog from "@/assets/hero-blog.jpg";
import blogPlaceholder from "@/assets/blog-placeholder.jpg";
import { PageHero } from "@/components/site/PageHero";
import { listPublishedPosts, type BlogPost } from "@/lib/blog";
import { Calendar, Clock, ArrowRight } from "lucide-react";

const qo = (category: string) =>
  queryOptions({
    queryKey: ["blog", "category", category],
    queryFn: () => listPublishedPosts(60, { category }),
  });

export const Route = createFileRoute("/blog/category/$category")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(qo(params.category)),
  head: ({ params }) => {
    const cat = params.category.replace(/-/g, " ");
    const title = `${cat[0]?.toUpperCase()}${cat.slice(1)} — Foxwood Blog`;
    const desc = `Latest ${cat} articles from Foxwood Properties in Kenya.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
      ],
    };
  },
  errorComponent: () => <div className="container-page py-24 text-center"><h1 className="text-2xl font-bold">Couldn't load category</h1></div>,
  notFoundComponent: () => <div className="container-page py-24 text-center">Category not found.</div>,
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { data: posts } = useSuspenseQuery(qo(category));
  const label = category.replace(/-/g, " ");
  return (
    <>
      <PageHero image={heroBlog} eyebrow="Category" title={label} subtitle={`Articles in ${label}.`} />
      <section className="container-page py-14">
        <div className="mb-6 text-sm">
          <Link to="/blog" className="text-primary hover:underline">← All posts</Link>
        </div>
        {posts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No posts in this category yet.</div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <Card key={p.id} p={p} />)}
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
          {p.is_sponsored && <span className="absolute top-3 left-3 rounded-full bg-secondary text-white px-2 py-0.5 text-[10px] font-bold uppercase">Sponsored</span>}
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
