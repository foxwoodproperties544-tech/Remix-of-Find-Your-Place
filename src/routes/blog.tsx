import { createFileRoute } from "@tanstack/react-router";
import p1 from "@/assets/p1.jpg";
import p3 from "@/assets/p3.jpg";
import p5 from "@/assets/p5.jpg";
import heroBlog from "@/assets/hero-blog.jpg";
import { PageHero } from "@/components/site/PageHero";
import { absoluteUrl } from "@/lib/site-url";

const OG_IMAGE = absoluteUrl(heroBlog);
const TITLE = "Blog — Foxwood Properties";
const DESC = "Real estate news, investment tips, and land-buying guides from Foxwood Properties.";

export const Route = createFileRoute("/blog")({
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
  component: Blog,
});

const posts = [
  { t: "5 things to check before buying land in Kenya", img: p3, d: "A practical checklist for first-time land buyers — from title search to zoning."},
  { t: "Renting in Nairobi: what to budget in 2026", img: p1, d: "A neighbourhood-by-neighbourhood look at rental prices across the city."},
  { t: "Investing in commercial property: is it worth it?", img: p5, d: "How commercial yields compare with residential in today's market."},
];

function Blog() {
  return (
    <>
      <PageHero
        image={heroBlog}
        eyebrow="Insights"
        title="The Foxwood Blog"
        subtitle="News, guides and market updates from Kenya's real estate scene."
      />
      <section className="container-page py-14 grid gap-8 md:grid-cols-3">
        {posts.map(p => (
          <article key={p.t} className="rounded-2xl overflow-hidden border border-border bg-card shadow-soft hover:shadow-glow transition">
            <div className="aspect-[4/3] overflow-hidden"><img src={p.img} alt="" className="h-full w-full object-cover" /></div>
            <div className="p-5">
              <h3 className="font-bold leading-snug">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
              <button className="mt-4 text-sm font-semibold text-primary hover:underline">Read article →</button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
