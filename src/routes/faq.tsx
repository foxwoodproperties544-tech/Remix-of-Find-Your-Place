import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { Search, ChevronDown } from "lucide-react";

const TITLE = "FAQ — Foxwood Properties";
const DESC = "Answers to frequently asked questions about buying, renting, listing, verifying and using Foxwood Properties.";
const OG_IMAGE = absoluteUrl(heroTools);

interface Faq { id: string; question: string; answer: string; category: string; sort_order: number }

const faqQO = queryOptions({
  queryKey: ["faq", "published"],
  queryFn: async () => {
    const { data, error } = await supabase.from("faq_items").select("id, question, answer, category, sort_order").eq("published", true).order("category").order("sort_order");
    if (error) throw error;
    return (data ?? []) as Faq[];
  },
});

export const Route = createFileRoute("/faq")({
  loader: ({ context }) => context.queryClient.ensureQueryData(faqQO),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/faq` }],
  }),
  errorComponent: () => <div className="container-page py-24 text-center">Couldn't load FAQs.</div>,
  notFoundComponent: () => <div className="container-page py-24 text-center">Not found.</div>,
  component: FAQPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  listing: "Listing your property",
  payments: "Payments & pricing",
  tools: "Tools & search",
  trust: "Trust & safety",
  buying: "Buying property",
  contact: "Contact & viewings",
  account: "Account",
  general: "General",
};

function FAQPage() {
  const { data: faqs } = useSuspenseQuery(faqQO);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return faqs;
    return faqs.filter((f) => f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term));
  }, [q, faqs]);

  const grouped = useMemo(() => {
    const map = new Map<string, Faq[]>();
    for (const f of filtered) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        image={heroTools}
        eyebrow="Help"
        title="Frequently asked questions"
        subtitle="Quick answers about listings, payments, verification and more."
      >
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full rounded-full border border-white/30 bg-white/95 backdrop-blur pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-white"
            aria-label="Search FAQs"
          />
        </div>
      </PageHero>

      <section className="container-page py-14 max-w-3xl">
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No matches found. Try a different search.</div>
        ) : (
          grouped.map(([cat, items]) => (
            <div key={cat} className="mb-10">
              <h2 className="text-xl font-bold mb-4">{CATEGORY_LABELS[cat] ?? cat}</h2>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border">
                {items.map((f) => <FAQItem key={f.id} item={f} />)}
              </div>
            </div>
          ))
        )}

        <div className="mt-12 rounded-2xl border border-border bg-primary-soft p-6 text-center">
          <h3 className="font-bold text-lg">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mt-1">Reach out and we'll get back within one business day.</p>
          <a href="/contact" className="btn-primary btn-primary-hover mt-4 inline-flex">Contact us</a>
        </div>
      </section>
    </>
  );
}

function FAQItem({ item }: { item: Faq }) {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="group">
      <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/40">
        <span className="font-semibold text-left">{item.question}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </summary>
      <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{item.answer}</div>
    </details>
  );
}
