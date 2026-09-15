import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, MessageCircle, Clock } from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import heroContact from "@/assets/hero-contact.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, trackSupportClick, whatsappUrl } from "@/lib/support";

const OG_IMAGE = absoluteUrl(heroContact);
const TITLE = "Contact — Foxwood Properties";
const DESC = "Get in touch with Foxwood Properties. Call, email, or WhatsApp us on +254 759 556 026.";

export const Route = createFileRoute("/contact")({
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
          <div className="rounded-2xl border border-primary/20 bg-primary-soft p-6">
            <div className="text-xs uppercase tracking-wider text-primary/80 font-semibold">Customer support</div>
            <div className="mt-1 text-2xl font-bold text-primary">{SUPPORT_PHONE_DISPLAY}</div>
            <p className="mt-1 text-sm text-foreground/70">We usually reply within a few minutes on WhatsApp.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`tel:${SUPPORT_PHONE_TEL}`}
                onClick={() => trackSupportClick("call", "contact")}
                className="btn-primary btn-primary-hover !py-2 !px-4 text-sm"
              >
                <Phone className="h-4 w-4" /> Call Now
              </a>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSupportClick("whatsapp", "contact")}
                className="btn-secondary !py-2 !px-4 text-sm"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
          {[
            {i: MapPin, t: "Office", v: "Westlands, Nairobi, Kenya"},
            {i: Phone, t: "Phone", v: SUPPORT_PHONE_DISPLAY, href: `tel:${SUPPORT_PHONE_TEL}`},
            {i: MessageCircle, t: "WhatsApp", v: SUPPORT_PHONE_DISPLAY, href: whatsappUrl()},
            {i: Mail, t: "Email", v: "info@foxwoodproperties.co.ke", href: "mailto:info@foxwoodproperties.co.ke"},
            {i: Clock, t: "Business hours", v: "Mon–Sat, 8:00 AM – 6:00 PM EAT"},
          ].map(({i:Icon,t,v,href}: any) => (
            <div key={t} className="flex items-start gap-4 rounded-2xl border border-border p-5 bg-card">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t}</div>
                {href ? (
                  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="font-semibold mt-0.5 hover:text-primary">{v}</a>
                ) : (
                  <div className="font-semibold mt-0.5">{v}</div>
                )}
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
