import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import { PageHero } from "./PageHero";
import type { ReactNode } from "react";
import { useState } from "react";

export type Faq = { q: string; a: string };

type Crumb = { label: string; to?: string };

interface Props {
  eyebrow?: ReactNode;
  title: string;
  subtitle: string;
  hero: string;
  intro?: ReactNode;
  crumbs: Crumb[];
  children: ReactNode;
  faqs?: Faq[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export function PackagePageShell({
  eyebrow,
  title,
  subtitle,
  hero,
  intro,
  crumbs,
  children,
  faqs = [],
  ctaTitle = "Ready to get started?",
  ctaSubtitle = "Talk to our team or jump straight into your workflow.",
  ctaHref = "/contact",
  ctaLabel = "Contact sales",
}: Props) {
  return (
    <>
      <PageHero
        image={hero}
        size="sm"
        eyebrow={eyebrow ?? (<><Sparkles className="h-3.5 w-3.5" /> Packages</>)}
        title={title}
        subtitle={subtitle}
      />
      <div className="container-page py-8">
        <Breadcrumbs items={crumbs} />
        {intro && <div className="max-w-3xl mt-6 text-muted-foreground text-sm md:text-base">{intro}</div>}
        <div className="mt-10 space-y-16">{children}</div>

        {faqs.length > 0 && (
          <section className="mt-20">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary"><HelpCircle className="h-3.5 w-3.5" /> FAQ</div>
              <h2 className="text-2xl md:text-3xl font-bold mt-2">Frequently asked questions</h2>
            </div>
            <div className="mt-8 max-w-3xl mx-auto divide-y divide-border border border-border rounded-2xl bg-card">
              {faqs.map((f, i) => <FaqRow key={i} faq={f} />)}
            </div>
          </section>
        )}

        <section className="mt-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 md:p-12 text-primary-foreground text-center shadow-glow">
          <h2 className="text-2xl md:text-3xl font-bold">{ctaTitle}</h2>
          <p className="mt-2 text-primary-foreground/90 max-w-2xl mx-auto text-sm md:text-base">{ctaSubtitle}</p>
          <Link to={ctaHref as any} className="btn-secondary mt-6 inline-flex">{ctaLabel} <ChevronRight className="h-4 w-4" /></Link>
        </section>
      </div>
    </>
  );
}

function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {c.to ? (
              <Link to={c.to as any} className="hover:text-primary">{c.label}</Link>
            ) : (
              <span className="text-foreground font-medium">{c.label}</span>
            )}
            {i < items.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function FaqRow({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="group p-5">
      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold">
        <span>{faq.q}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90 text-primary" : ""}`} />
      </summary>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
    </details>
  );
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
      {subtitle && <p className="mt-2 text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );
}
