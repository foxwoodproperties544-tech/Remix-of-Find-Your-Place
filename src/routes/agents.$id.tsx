import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchPropertiesByOwner } from "@/lib/properties";
import { PropertyCard } from "@/components/site/PropertyCard";
import { ProfileReviews } from "@/components/site/ProfileReviews";
import {
  Phone, MessageCircle, MapPin, Home, BadgeCheck, Building2, Mail, Globe, Facebook, Instagram,
  Linkedin, Twitter, Music2, Clock, Languages as LangIcon, Briefcase, Award, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/agents/$id")({
  loader: async ({ params }) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (!profile) throw notFound();
    const listings = await fetchPropertiesByOwner(params.id);
    return { profile, listings };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.profile.full_name ?? "Agent"} — Foxwood Properties` },
          { name: "description", content: loaderData.profile.bio ?? `Browse properties listed by ${loaderData.profile.full_name ?? "this agent"} on Foxwood Properties.` },
          { property: "og:title", content: `${loaderData.profile.full_name ?? "Agent"} on Foxwood` },
          { property: "og:description", content: loaderData.profile.bio ?? "" },
          { property: "og:type", content: "profile" },
          { name: "twitter:card", content: "summary_large_image" },
          ...(loaderData.profile.avatar_url ? [
            { property: "og:image", content: loaderData.profile.avatar_url },
            { name: "twitter:image", content: loaderData.profile.avatar_url },
          ] : []),
        ]
      : [{ title: "Agent not found" }, { name: "robots", content: "noindex" }],
  }),
  errorComponent: () => <div className="container-page py-24 text-center"><h1 className="text-2xl font-bold">Something went wrong</h1></div>,
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Agent not found</h1>
      <Link to="/properties" className="btn-primary btn-primary-hover mt-6 inline-flex">Browse properties</Link>
    </div>
  ),
  component: AgentPage,
});

function AgentPage() {
  const { profile, listings } = Route.useLoaderData();
  const p: any = profile;
  const name = p.full_name ?? "Foxwood Agent";
  const initials = name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const phone = p.phone as string | null;
  const waNumber = (p.whatsapp || p.phone || "").replace(/[^\d]/g, "");
  const since = new Date(p.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long" });
  const roleLabel = p.role_primary === "developer" ? "Verified Developer" : p.role_primary === "owner" ? "Property Owner" : "Verified Agent";
  const location = [p.town, p.county].filter(Boolean).join(", ") || "Kenya";
  const services: string[] = p.services ?? [];
  const specialties: string[] = p.specialties ?? [];
  const areas: string[] = p.service_areas ?? [];
  const languages: string[] = p.languages ?? [];

  const socials = [
    { url: p.website, icon: Globe, label: "Website" },
    { url: p.facebook_url, icon: Facebook, label: "Facebook" },
    { url: p.instagram_url, icon: Instagram, label: "Instagram" },
    { url: p.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { url: p.twitter_url, icon: Twitter, label: "X / Twitter" },
    { url: p.tiktok_url, icon: Music2, label: "TikTok" },
  ].filter((s) => s.url);

  return (
    <>
      <section className="bg-primary-soft border-b border-border">
        <div className="container-page py-10 md:py-14 flex items-start gap-6 flex-wrap">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={name} className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-glow" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-3xl ring-4 ring-background shadow-glow">{initials || "FA"}</div>
          )}
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              {roleLabel}
              {p.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified" />}
              {p.kyc_status === "approved" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px]">
                  <ShieldCheck className="h-3 w-3" /> KYC verified
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">{name}</h1>
            {p.company_name && (
              <div className="mt-2 flex items-center gap-1 text-sm font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" /> {p.company_name}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {location}</span>
              <span className="flex items-center gap-1"><Home className="h-4 w-4" /> {listings.length} active listing{listings.length === 1 ? "" : "s"}</span>
              {p.years_experience ? <span className="flex items-center gap-1"><Award className="h-4 w-4" /> {p.years_experience}+ yrs experience</span> : null}
              <span>Member since {since}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {phone && <a href={`tel:${phone}`} className="btn-primary btn-primary-hover"><Phone className="h-4 w-4" /> Call</a>}
            {waNumber && <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          </div>
        </div>
      </section>

      <section className="container-page py-10 md:py-14 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {p.bio && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">About {name.split(" ")[0]}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{p.bio}</p>
            </div>
          )}

          {(services.length > 0 || specialties.length > 0 || areas.length > 0 || languages.length > 0) && (
            <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
              {services.length > 0 && (
                <TagBlock icon={<Briefcase className="h-4 w-4" />} title="Services">
                  {services.map((s) => <Tag key={s} tone="primary">{s}</Tag>)}
                </TagBlock>
              )}
              {specialties.length > 0 && (
                <TagBlock icon={<Home className="h-4 w-4" />} title="Property specialties">
                  {specialties.map((s) => <Tag key={s}>{s}</Tag>)}
                </TagBlock>
              )}
              {areas.length > 0 && (
                <TagBlock icon={<MapPin className="h-4 w-4" />} title="Areas served">
                  {areas.map((a) => <Tag key={a}>{a}</Tag>)}
                </TagBlock>
              )}
              {languages.length > 0 && (
                <TagBlock icon={<LangIcon className="h-4 w-4" />} title="Languages">
                  {languages.map((l) => <Tag key={l}>{l}</Tag>)}
                </TagBlock>
              )}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold">Listings by {name}</h2>
            {listings.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
                <Home className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="mt-3 font-semibold">No published listings yet</p>
                <p className="text-sm text-muted-foreground mt-1">Check back later or contact the agent directly.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {listings.map((prop: any) => <PropertyCard key={prop.id} p={prop} />)}
              </div>
            )}
          </div>

          <ProfileReviews targetId={p.id} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {phone && (
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a href={`tel:${phone}`} className="hover:text-primary break-all">{phone}</a>
                </li>
              )}
              {waNumber && (
                <li className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                  <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="hover:text-primary">WhatsApp chat</a>
                </li>
              )}
              {p.email_public && (
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href={`mailto:${p.email_public}`} className="hover:text-primary break-all">{p.email_public}</a>
                </li>
              )}
              {p.office_hours && (
                <li className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>{p.office_hours}</span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <Link to="/contact" className="hover:text-primary">Send an enquiry</Link>
              </li>
            </ul>
          </div>

          {(p.company_name || p.address_line || p.license_number) && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Business</h3>
              <div className="mt-3 space-y-2 text-sm">
                {p.company_name && <div className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-primary" /> {p.company_name}</div>}
                {p.address_line && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span>{p.address_line}{location ? `, ${location}` : ""}</span></div>}
                {p.license_number && <div className="flex items-center gap-2 text-muted-foreground"><Award className="h-4 w-4 text-primary" /> License #{p.license_number}</div>}
              </div>
            </div>
          )}

          {socials.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Online</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {socials.map(({ url, icon: Icon, label }) => (
                  <li key={label}>
                    <a href={url as string} target="_blank" rel="noreferrer" aria-label={label}
                       className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border hover:border-primary hover:text-primary transition">
                      <Icon className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}

function TagBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold flex items-center gap-2 text-foreground/90">{icon} {title}</div>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "primary" }) {
  const cls = tone === "primary"
    ? "bg-primary text-primary-foreground"
    : "bg-primary-soft text-primary";
  return <span className={`text-xs px-3 py-1 rounded-full font-medium ${cls}`}>{children}</span>;
}
