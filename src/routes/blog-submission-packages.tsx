import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PackagePageShell, Li, SectionHeader } from "@/components/site/PackagePageShell";
import { listBlogPackages } from "@/lib/blog-submission.functions";
import heroBlog from "@/assets/hero-blog.jpg";
import { ArrowRight, PenSquare } from "lucide-react";
import { SupportBanner } from "@/components/site/SupportBanner";

const qo = queryOptions({ queryKey: ["active-blog-packages"], queryFn: () => listBlogPackages() });

export const Route = createFileRoute("/blog-submission-packages")({
  component: Page,
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  head: () => ({
    meta: [
      { title: "Blog Submission Packages — Foxwood Properties" },
      { name: "description", content: "Publish your article on Foxwood Properties. Basic, Featured and Sponsored blog packages with SEO optimisation and editorial review." },
      { property: "og:title", content: "Blog Submission Packages — Foxwood Properties" },
      { property: "og:description", content: "Get your real estate story in front of Kenya's property audience." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://find-joy-list.lovable.app/blog-submission-packages" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://find-joy-list.lovable.app/blog-submission-packages" }],
  }),
});

function Page() {
  const { data: pkgs } = useSuspenseQuery(qo);
  const list = (pkgs ?? []) as any[];

  return (
    <PackagePageShell
      eyebrow={<><PenSquare className="h-3.5 w-3.5" /> Blog Submissions</>}
      title="Publish your story to Kenya's property audience"
      subtitle="Submit articles as an agent, developer or property expert. Basic, Featured and Sponsored plans available with SEO optimisation and editorial review."
      hero={heroBlog}
      crumbs={[{ label: "Home", to: "/" }, { label: "Blog Submission Packages" }]}
      intro={<>Every submission is reviewed by our editors and prioritised on the blog by tier: <strong>Sponsored</strong> articles appear first, then <strong>Featured</strong>, then <strong>Basic</strong>. All plans include SEO metadata, category and tag placement, and social share previews.</>}
      ctaTitle="Have a story to share?"
      ctaSubtitle="Write your article, choose a package, pay by M-Pesa and submit for editorial review."
      ctaHref="/dashboard/blog/new"
      ctaLabel="Submit a blog"
      faqs={[
        { q: "Who reviews my submission?", a: "Our editorial team checks originality, tone and quality before publishing. We may request minor changes." },
        { q: "How long does my article stay live?", a: "Publication duration matches the package you buy. You can renew when it expires to stay published." },
        { q: "Do you check for plagiarism?", a: "Yes — every submission is scanned by our AI-assisted originality tool before approval." },
        { q: "Can I edit after publishing?", a: "Yes, minor edits go through a light review; major changes may need re-approval." },
      ]}
    >
      {list.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No blog packages available right now. Please check back soon.</div>
      ) : (
        <section>
          <SectionHeader title="Choose a plan" subtitle="Pricing shown in KES. Pay by M-Pesa." />
          <div className={`mt-8 grid gap-6 sm:grid-cols-2 ${list.length >= 3 ? "lg:grid-cols-3" : ""}`}>
            {list.map((p) => {
              const featured = !!p.is_featured || (p.badge_color && p.name?.toLowerCase().includes("feature"));
              const sponsored = p.name?.toLowerCase().includes("sponsor");
              return (
                <div key={p.id} className={`relative rounded-2xl border p-6 shadow-soft flex flex-col ${featured || sponsored ? "border-primary bg-primary-soft/40" : "border-border bg-card"}`}>
                  {(featured || sponsored) && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider px-3 py-1">
                      {sponsored ? "Sponsored" : "Most popular"}
                    </span>
                  )}
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold">KES {Number(p.price).toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground"> / {p.duration_days} days</span>
                  </div>
                  <ul className="mt-4 space-y-2 flex-1">
                    <Li>{p.duration_days} days published</Li>
                    {sponsored ? <Li>Sponsored — top of blog</Li> : featured ? <Li>Featured placement</Li> : <Li>Standard placement</Li>}
                    <Li>SEO title, description &amp; OG tags</Li>
                    <Li>Category &amp; tag pages</Li>
                    <Li>Editorial review &amp; originality check</Li>
                    <Li>Social share previews</Li>
                    {p.renewal_enabled && <Li>Renewable when it expires</Li>}
                  </ul>
                  <Link to="/dashboard/blog/new" className="btn-primary btn-primary-hover mt-6 justify-center">
                    Submit Blog <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="mt-8">
        <SupportBanner context="blog_packages" whatsappMessage="Hello Foxwood Properties, I need help with a blog submission package." />
      </div>
    </PackagePageShell>
  );
}
