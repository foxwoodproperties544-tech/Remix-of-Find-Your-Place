import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import heroContact from "@/assets/hero-contact.jpg";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Foxwood Properties" }, { name: "description", content: "Get in touch with Foxwood Properties. Call, email, or WhatsApp us." }] }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHero
        image={heroContact}
        eyebrow="Contact"
        title="Let's talk property"
        subtitle="We usually respond within a few hours. Prefer chat? WhatsApp works best."
      />

      <section className="container-page py-14 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          {[
            {i: MapPin, t: "Office", v: "Westlands, Nairobi, Kenya"},
            {i: Phone, t: "Phone", v: "+254 700 000 000"},
            {i: Mail, t: "Email", v: "hello@foxwood.co.ke"},
            {i: MessageCircle, t: "WhatsApp", v: "+254 700 000 000"},
          ].map(({i:Icon,t,v}) => (
            <div key={t} className="flex items-start gap-4 rounded-2xl border border-border p-5 bg-card">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t}</div>
                <div className="font-semibold mt-0.5">{v}</div>
              </div>
            </div>
          ))}
          <div className="aspect-[4/3] rounded-2xl border border-border bg-muted grid place-items-center text-muted-foreground text-sm">
            <div className="text-center"><MapPin className="h-6 w-6 mx-auto text-primary mb-2" />Map preview</div>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h2 className="text-xl font-bold">Send us a message</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input required placeholder="Full name" className="rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
            <input required type="email" placeholder="Email" className="rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
            <input placeholder="Phone" className="rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary sm:col-span-2" />
            <textarea required rows={5} placeholder="How can we help?" className="rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary sm:col-span-2" />
          </div>
          <button className="btn-primary btn-primary-hover mt-4">Send message</button>
          {sent && <p className="mt-3 text-sm text-primary">Thanks — we'll get back to you shortly.</p>}
        </form>
      </section>
    </>
  );
}
