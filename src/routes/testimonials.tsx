import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { Star, Quote, MessageCircle } from "lucide-react";

const TITLE = "Customer Testimonials & Reviews — Foxwood Properties";
const DESC =
  "Real reviews from buyers, tenants and landlords who used Foxwood Properties to find, rent or sell property in Kenya.";
const OG_IMAGE = absoluteUrl(heroAbout);

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  target_type: string;
  reviewer?: { full_name: string | null; avatar_url: string | null } | null;
};

const testimonialsQO = queryOptions({
  queryKey: ["testimonials", "approved"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id, target_type")
      .eq("status", "approved")
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    const rows = (data ?? []) as Review[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("public_profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      (profs ?? []).forEach((p: any) => (map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    return rows.map((r) => ({ ...r, reviewer: map[r.user_id] ?? null }));
  },
});

export const Route = createFileRoute("/testimonials")({
  loader: ({ context }) => context.queryClient.ensureQueryData(testimonialsQO),
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
    links: [{ rel: "canonical", href: `${SITE_URL}/testimonials` }],
  }),
  errorComponent: () => (
    <div className="container-page py-24 text-center text-muted-foreground">Couldn't load testimonials right now.</div>
  ),
  notFoundComponent: () => <div className="container-page py-24 text-center">Not found.</div>,
  component: Testimonials,
});

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function initials(name: string | null) {
  if (!name) return "FX";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function Testimonials() {
  const { data } = useSuspenseQuery(testimonialsQO);
  const count = data.length;
  const avg = count ? Math.round((data.reduce((s, r) => s + (r.rating || 0), 0) / count) * 10) / 10 : 0;

  return (
    <>
      <PageHero
        image={heroAbout}
        size="sm"
        eyebrow="Social proof"
        title="What our customers say"
        subtitle="Verified reviews from people who found, rented or sold property through Foxwood."
      />

      <section className="container-page py-12">
        {count > 0 && (
          <div className="mx-auto mb-10 flex max-w-md flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
            <div className="text-4xl font-bold text-primary">{avg.toFixed(1)}</div>
            <Stars n={Math.round(avg)} />
            <p className="text-sm text-muted-foreground">
              Based on {count} approved review{count === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {count === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-border p-10 text-center">
            <Quote className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <h2 className="mt-3 font-semibold">No published reviews yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Reviews appear here once our team has approved them. Worked with one of our agents?
            </p>
            <Link to="/agents" className="btn-primary btn-primary-hover mt-5 inline-flex">Review an agent</Link>
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.map((r) => (
              <li key={r.id} className="flex flex-col rounded-2xl border border-border bg-card p-6">
                <Quote className="h-6 w-6 text-primary/25" />
                <p className="mt-3 flex-1 text-sm leading-relaxed">{r.comment}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  {r.reviewer?.avatar_url ? (
                    <img
                      src={r.reviewer.avatar_url}
                      alt={r.reviewer.full_name ?? "Reviewer"}
                      loading="lazy"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {initials(r.reviewer?.full_name ?? null)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.reviewer?.full_name ?? "Foxwood customer"}</div>
                    <div className="flex items-center gap-2">
                      <Stars n={r.rating} />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border bg-muted/40">
        <div className="container-page py-14 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-2xl font-bold">Worked with a Foxwood agent?</h2>
          <p className="mt-2 text-muted-foreground">
            Share your experience — every review is checked by our team before it's published.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/agents" className="btn-primary btn-primary-hover">Find your agent</Link>
            <Link to="/how-it-works" className="btn-ghost">See how Foxwood works</Link>
          </div>
        </div>
      </section>
    </>
  );
}
