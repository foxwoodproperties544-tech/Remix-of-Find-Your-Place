import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import heroBlog from "@/assets/hero-blog.jpg";
import { PageHero } from "@/components/site/PageHero";
import { listAuthorsWithCounts } from "@/lib/blog";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";
import { PenLine, ArrowRight } from "lucide-react";

const TITLE = "Blog Authors — Foxwood Properties Kenya";
const DESC =
  "Meet the property experts, agents and writers behind the Foxwood Properties blog. Browse every author and read their latest Kenyan real estate articles.";
const OG_IMAGE = absoluteUrl(heroBlog);

const qo = queryOptions({
  queryKey: ["blog", "authors"],
  queryFn: () => listAuthorsWithCounts(),
});

export const Route = createFileRoute("/blog/authors/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
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
    links: [{ rel: "canonical", href: `${SITE_URL}/blog/authors` }],
  }),
  errorComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Couldn't load authors</h1>
    </div>
  ),
  notFoundComponent: () => <div className="container-page py-24 text-center">Not found.</div>,
  component: AuthorsIndex,
});

function AuthorsIndex() {
  const { data: authors } = useSuspenseQuery(qo);
  return (
    <>
      <PageHero
        image={heroBlog}
        size="sm"
        eyebrow="Blog"
        title="Our authors"
        subtitle="The agents, analysts and writers publishing on Foxwood Properties."
      />
      <section className="container-page py-14">
        <div className="mb-6 text-sm">
          <Link to="/blog" className="text-primary hover:underline">← All posts</Link>
        </div>
        {authors.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No published authors yet.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((a) => (
              <Link
                key={a.id}
                to="/blog/author/$id"
                params={{ id: a.id }}
                className="group rounded-2xl border border-border bg-card p-6 hover:shadow-glow transition"
              >
                <div className="flex items-center gap-4">
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt={a.full_name ?? "Author"} loading="lazy"
                      className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary text-lg font-bold">
                      {(a.full_name ?? "F").slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-bold truncate group-hover:text-primary transition">{a.full_name ?? "Foxwood Team"}</h2>
                    {a.company_name && <p className="text-xs text-muted-foreground truncate">{a.company_name}</p>}
                    <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                      <PenLine className="h-3 w-3" /> {a.post_count} article{a.post_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {a.bio && <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{a.bio}</p>}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  View profile <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
