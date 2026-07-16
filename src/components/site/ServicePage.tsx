import { PageHero } from "./PageHero";
import { ServiceLeadForm } from "./ServiceLeadForm";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface ServicePageProps {
  title: string;
  eyebrow: string;
  subtitle: string;
  heroImage: string;
  benefits: { title: string; text: string }[];
  process: string[];
  service: string;
  cta?: ReactNode;
}

export function ServicePage({ title, eyebrow, subtitle, heroImage, benefits, process, service, cta }: ServicePageProps) {
  return (
    <>
      <PageHero
        image={heroImage}
        size="md"
        eyebrow={<><Sparkles className="h-3.5 w-3.5" /> {eyebrow}</>}
        title={title}
        subtitle={subtitle}
        actions={cta}
      />
      <section className="container-page py-14 md:py-20 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Why choose Foxwood for {title.toLowerCase()}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">We combine market data, verified partners and a human-first process so you get the right outcome — faster.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary"><Check className="h-4 w-4" /></div>
                <h3 className="mt-3 font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-14 text-2xl md:text-3xl font-bold">How it works</h2>
          <ol className="mt-6 space-y-3">
            {process.map((step, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold">{i + 1}</span>
                <p className="text-sm pt-1.5">{step}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8">
            <h3 className="text-xl font-bold">Ready to get started?</h3>
            <p className="mt-1 text-sm text-primary-foreground/85">Talk to a Foxwood advisor today — no obligation.</p>
            <Link to="/contact" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-background text-foreground px-5 py-2.5 text-sm font-semibold hover:bg-background/90 transition">
              Contact us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="lg:sticky lg:top-24 self-start">
          <ServiceLeadForm service={service} />
        </div>
      </section>
    </>
  );
}
