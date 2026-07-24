import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { Search, ChevronDown, Phone, MessageCircle } from "lucide-react";
import {
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  supportMessageFor,
  trackFaqEvent,
  trackSupportClick,
  whatsappUrl,
} from "@/lib/support";
import { useEffect, useRef } from "react";

const TITLE = "Help & Support FAQ — Foxwood Properties";
const DESC = "Search answers about buying, renting, listing, payments, verification and support at Foxwood Properties, or reach the team by phone or WhatsApp.";
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
      { property: "og:type", content: "website" },
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

function slugifyCategory(cat: string) {
  return `cat-${cat.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
}

function FAQPage() {
  const { data: faqs } = useSuspenseQuery(faqQO);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of faqs) map.set(f.category, (map.get(f.category) ?? 0) + 1);
    return map;
  }, [faqs]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return faqs.filter((f) => {
      if (activeCat !== "all" && f.category !== activeCat) return false;
      if (!term) return true;
      return f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term);
    });
  }, [q, faqs, activeCat]);

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

  const waMessage = supportMessageFor("faq");

  // Debounced search analytics
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const term = q.trim();
    if (term.length < 2) return;
    searchTimer.current = setTimeout(() => trackFaqEvent({ event_type: "search", search_term: term }), 800);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [q]);

  const handleChip = (cat: string) => {
    setActiveCat(cat);
    trackFaqEvent({ event_type: "chip_select", category: cat, search_term: q.trim() || null });
    if (cat !== "all") {
      const el = document.getElementById(slugifyCategory(cat));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        image={heroTools}
        eyebrow="Help & Support"
        title="Frequently asked questions"
        subtitle="Search answers by topic — or reach a human on call or WhatsApp."
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

      <section className="container-page py-14 grid gap-10 lg:grid-cols-[16rem_1fr]">
        {/* Categories sidebar */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Categories</div>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              <button
                type="button"
                onClick={() => handleChip("all")}
                className={`text-left rounded-lg px-3 py-2 text-sm transition ${activeCat === "all" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"}`}
              >
                All topics <span className="text-xs opacity-70">({faqs.length})</span>
              </button>
              {Array.from(categoryCounts.entries()).map(([cat, count]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleChip(cat)}
                  className={`text-left rounded-lg px-3 py-2 text-sm transition ${activeCat === cat ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"}`}
                >
                  {CATEGORY_LABELS[cat] ?? cat} <span className="text-xs opacity-70">({count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary-soft p-5">
            <div className="text-xs uppercase tracking-wider text-primary/80 font-semibold">Talk to us</div>
            <div className="mt-1 text-lg font-bold text-primary">{SUPPORT_PHONE_DISPLAY}</div>
            <p className="mt-1 text-xs text-foreground/70">Mon–Sat, 8AM–6PM EAT. WhatsApp is fastest.</p>
            <div className="mt-3 grid gap-2">
              <a
                href={`tel:${SUPPORT_PHONE_TEL}`}
                onClick={() => trackSupportClick("call", "faq")}
                className="btn-primary btn-primary-hover !py-2 !px-4 text-sm justify-center"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
              <a
                href={whatsappUrl(waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSupportClick("whatsapp", "faq")}
                className="btn-secondary !py-2 !px-4 text-sm justify-center"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="max-w-3xl">
          {grouped.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground">No matches for "{q}". Try a different search or reach out.</p>
              <div className="mt-4 flex justify-center gap-2">
                <a
                  href={`tel:${SUPPORT_PHONE_TEL}`}
                  onClick={() => trackSupportClick("call", "faq")}
                  className="btn-primary btn-primary-hover !py-2 !px-4 text-sm"
                ><Phone className="h-4 w-4" /> Call {SUPPORT_PHONE_DISPLAY}</a>
                <a
                  href={whatsappUrl(waMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSupportClick("whatsapp", "faq")}
                  className="btn-secondary !py-2 !px-4 text-sm"
                ><MessageCircle className="h-4 w-4" /> WhatsApp us</a>
              </div>
            </div>
          ) : (
            grouped.map(([cat, items]) => (
              <div key={cat} id={slugifyCategory(cat)} className="mb-10 scroll-mt-24">
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
            <div className="mt-4 flex justify-center gap-2 flex-wrap">
              <a
                href={`tel:${SUPPORT_PHONE_TEL}`}
                onClick={() => trackSupportClick("call", "faq")}
                className="btn-primary btn-primary-hover"
              ><Phone className="h-4 w-4" /> Call {SUPPORT_PHONE_DISPLAY}</a>
              <a
                href={whatsappUrl(waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSupportClick("whatsapp", "faq")}
                className="btn-secondary"
              ><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              <a href="/contact" className="btn-ghost">Contact form</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FAQItem({ item }: { item: Faq }) {
  const [open, setOpen] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  // Track clicks on any link inside the answer body.
  useEffect(() => {
    const el = answerRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      trackFaqEvent({
        event_type: "answer_link_click",
        category: item.category,
        question_id: item.id,
        link_href: (target as HTMLAnchorElement).href,
      });
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [item.category, item.id, open]);

  return (
    <details
      open={open}
      onToggle={(e) => {
        const isOpen = (e.target as HTMLDetailsElement).open;
        setOpen(isOpen);
        if (isOpen) trackFaqEvent({ event_type: "answer_link_click", category: item.category, question_id: item.id, link_href: "#open" });
      }}
      className="group"
    >
      <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/40">
        <span className="font-semibold text-left">{item.question}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </summary>
      <div ref={answerRef} className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{item.answer}</div>
    </details>
  );
}
