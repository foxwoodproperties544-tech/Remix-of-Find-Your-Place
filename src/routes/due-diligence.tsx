import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import { PageHero } from "@/components/site/PageHero";
import { FileSearch, Landmark, Ruler, ScrollText, ShieldAlert, Check } from "lucide-react";

export const Route = createFileRoute("/due-diligence")({
  component: DueDiligence,
  head: () => ({
    meta: [
      { title: "Land Due Diligence Hub — Foxwood Properties" },
      {
        name: "description",
        content:
          "Order a land search, title verification, survey or valuation in Kenya, and learn how to avoid land-buying fraud with the Foxwood due-diligence guide.",
      },
      { property: "og:title", content: "Land Due Diligence Hub — Foxwood Properties" },
      { property: "og:description", content: "Land searches, title verification, surveys and valuations for Kenyan property buyers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SERVICES = [
  { key: "land_search", label: "Official land search", icon: FileSearch, blurb: "Confirm the registered owner, size and any encumbrances at the lands registry." },
  { key: "title_verification", label: "Title deed verification", icon: ScrollText, blurb: "Check the title is genuine, unencumbered and matches the seller's identity." },
  { key: "survey", label: "Survey & beacon check", icon: Ruler, blurb: "A licensed surveyor confirms the boundaries and beacons on the ground." },
  { key: "valuation", label: "Professional valuation", icon: Landmark, blurb: "An independent market valuation for financing or negotiation." },
];

const STEPS = [
  "Get the title number and a copy of the title deed from the seller.",
  "Run an official land search to confirm ownership and encumbrances.",
  "Confirm the land use, zoning and rates/rent clearance certificates.",
  "Visit the site with a licensed surveyor to verify beacons.",
  "Sign a sale agreement drafted by an advocate — never a verbal deal.",
  "Pay through traceable channels only, never cash to a stranger.",
  "Complete transfer forms, consent to transfer and stamp duty payment.",
  "Confirm registration of the new title in your name.",
];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  county: z.string().trim().max(60).optional().or(z.literal("")),
  property_ref: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  service: z.string().min(1),
});

function DueDiligence() {
  const { user } = useAuth();
  const [service, setService] = useState(SERVICES[0].key);
  const [form, setForm] = useState({ name: "", phone: "", email: "", county: "", property_ref: "", message: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse({ ...form, service });
      const { error } = await supabase.from("due_diligence_requests").insert({
        user_id: user?.id ?? null,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email || null,
        county: parsed.county || null,
        property_ref: parsed.property_ref || null,
        message: parsed.message || null,
        service: parsed.service,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request received — our team will contact you shortly");
      setForm({ name: "", phone: "", email: "", county: "", property_ref: "", message: "" });
    },
    onError: (e: any) => toast.error(e?.errors?.[0]?.message ?? e?.message ?? "Could not send request"),
  });

  return (
    <div>
      <PageHero
        image={heroTools}
        size="sm"
        eyebrow={<><FileSearch className="h-3.5 w-3.5" /> Buy land with confidence</>}
        title="Land Due Diligence Hub"
        subtitle="Land searches, title verification, surveys and valuations — plus the checks every Kenyan buyer should complete before paying a deposit."
      />

      <section className="container-page py-12">
        <h2 className="text-2xl font-bold">Order a due-diligence service</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <button
              key={s.key}
              onClick={() => setService(s.key)}
              aria-pressed={service === s.key}
              className={`text-left rounded-2xl border p-4 transition ${service === s.key ? "border-primary bg-primary-soft/50" : "border-border bg-card hover:border-primary/40"}`}
            >
              <s.icon className="h-6 w-6 text-primary" />
              <div className="mt-2 font-semibold">{s.label}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.blurb}</p>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <form
            className="rounded-2xl border border-border bg-card p-5 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
          >
            <h3 className="sm:col-span-2 text-lg font-bold">Your details</h3>
            <label className="block">
              <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Full name</span>
              <input required maxLength={100} className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Phone</span>
              <input required maxLength={20} className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Email (optional)</span>
              <input type="email" maxLength={255} className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">County</span>
              <select className="input" value={form.county} onChange={(e) => set("county", e.target.value)}>
                <option value="">Select county</option>
                {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Title number or listing reference (optional)</span>
              <input maxLength={120} className="input" value={form.property_ref} onChange={(e) => set("property_ref", e.target.value)} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Anything else we should know?</span>
              <textarea rows={4} maxLength={1000} className="input" value={form.message} onChange={(e) => set("message", e.target.value)} />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary btn-primary-hover" disabled={submit.isPending}>
                {submit.isPending ? "Sending…" : `Request ${SERVICES.find((s) => s.key === service)?.label}`}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-bold flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Buyer's step-by-step</h3>
              <ol className="mt-3 space-y-2 text-sm list-decimal pl-4">
                {STEPS.map((s) => <li key={s} className="text-muted-foreground">{s}</li>)}
              </ol>
            </div>
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
              <h3 className="font-bold flex items-center gap-2 text-destructive"><ShieldAlert className="h-4 w-4" /> Fraud red flags</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-4">
                <li>Pressure to pay a deposit before a land search.</li>
                <li>Seller refuses to share the title number.</li>
                <li>Price far below the area average.</li>
                <li>Payments requested to a personal account with no agreement.</li>
                <li>No advocate, no written sale agreement.</li>
              </ul>
              <Link to="/dashboard/buyer" className="mt-3 inline-flex text-sm text-primary hover:underline">
                Track your checklist in the buyer dashboard →
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
