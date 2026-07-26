import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, Star } from "lucide-react";
import {
  myBusinesses, updateMyBusiness, listDirectoryEnquiries, updateEnquiryStatus, replyToBusinessReview,
} from "@/lib/directory.functions";
import { fetchBusinessProperties, fetchBusinessReviews, fetchBusinessPlans } from "@/lib/directory";

export const Route = createFileRoute("/_authenticated/dashboard/business")({
  head: () => ({ meta: [{ title: "My company — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
  component: BusinessDashboard,
});

function BusinessDashboard() {
  const mine = useServerFn(myBusinesses);
  const { data: businesses = [], isLoading } = useQuery({ queryKey: ["my-businesses"], queryFn: () => mine({}) });
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && businesses.length) setActiveId((businesses[0] as any).id);
  }, [businesses, activeId]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!businesses.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">You don't manage a company yet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find your company in the directory and claim it. Once approved, you can manage it here.
        </p>
        <Link to="/companies" className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Browse the directory
        </Link>
      </div>
    );
  }

  const active = (businesses as any[]).find((b) => b.id === activeId) ?? businesses[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{active.name}</h1>
          <p className="text-sm text-muted-foreground">Manage your company profile, listings, enquiries and reviews.</p>
        </div>
        {businesses.length > 1 && (
          <select value={active.id} onChange={(e) => setActiveId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            {(businesses as any[]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </header>

      <SubscriptionPanel business={active} />
      <ProfileEditor business={active} />
      <ListingsPanel businessId={active.id} />
      <EnquiriesPanel businessId={active.id} />
      <ReviewsPanel businessId={active.id} />
    </div>
  );
}

function SubscriptionPanel({ business }: { business: any }) {
  const { data: plans = [] } = useQuery({ queryKey: ["business-plans"], queryFn: fetchBusinessPlans });
  const current = plans.find((p) => p.slug === business.plan_slug);
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Subscription</h2>
      {current ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {current.name} — KSh {current.price.toLocaleString()} / {current.duration_days} days · up to {current.listing_limit} listings
          {business.plan_expires_at ? ` · renews ${new Date(business.plan_expires_at).toLocaleDateString()}` : ""}
        </p>
      ) : (
        <div className="mt-1 space-y-2">
          <p className="text-sm text-muted-foreground">No active plan. Subscribe to unlock premium directory features.</p>
          <ul className="space-y-1 text-sm">
            {plans.map((p) => (
              <li key={p.id} className="rounded-lg border border-border px-3 py-2">
                <span className="font-medium">{p.name}</span> — KSh {p.price.toLocaleString()} / month · {p.listing_limit} listings
                {p.featured_placement ? " · featured placement" : ""}
              </li>
            ))}
          </ul>
          <Link to="/dashboard/subscription" className="inline-block rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Subscribe
          </Link>
        </div>
      )}
    </section>
  );
}

function ProfileEditor({ business }: { business: any }) {
  const save = useServerFn(updateMyBusiness);
  const qc = useQueryClient();
  const [f, setF] = useState({
    shortDescription: business.short_description ?? "", description: business.description ?? "",
    logoUrl: business.logo_url ?? "", coverUrl: business.cover_url ?? "", website: business.website ?? "",
    email: business.email ?? "", phone: business.phone ?? "", whatsapp: business.whatsapp ?? "",
    address: business.address ?? "", county: business.county ?? "", town: business.town ?? "",
    services: (business.services ?? []).join(", "), propertyTypes: (business.property_types ?? []).join(", "),
    yearsInBusiness: business.years_in_business ? String(business.years_in_business) : "",
    facebook: business.socials?.facebook ?? "", instagram: business.socials?.instagram ?? "",
    x: business.socials?.x ?? "", linkedin: business.socials?.linkedin ?? "",
    weekdays: business.business_hours?.weekdays ?? "", saturday: business.business_hours?.saturday ?? "",
    sunday: business.business_hours?.sunday ?? "",
  });
  const [busy, setBusy] = useState(false);
  const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const socials: Record<string, string> = {};
          (["facebook", "instagram", "x", "linkedin"] as const).forEach((k) => { if ((f as any)[k]) socials[k] = (f as any)[k]; });
          const businessHours: Record<string, string> = {};
          (["weekdays", "saturday", "sunday"] as const).forEach((k) => { if ((f as any)[k]) businessHours[k] = (f as any)[k]; });
          await save({ data: {
            id: business.id, shortDescription: f.shortDescription, description: f.description,
            logoUrl: f.logoUrl, coverUrl: f.coverUrl, website: f.website, email: f.email,
            phone: f.phone, whatsapp: f.whatsapp, address: f.address, county: f.county, town: f.town,
            services: list(f.services), propertyTypes: list(f.propertyTypes), socials, businessHours,
            yearsInBusiness: f.yearsInBusiness ? Number(f.yearsInBusiness) : null,
          } as any });
          toast.success("Profile updated");
          qc.invalidateQueries({ queryKey: ["my-businesses"] });
        } catch (err: any) { toast.error(err?.message ?? "Update failed"); }
        finally { setBusy(false); }
      }}
    >
      <h2 className="sm:col-span-2 text-sm font-semibold">Company information</h2>
      {([
        ["logoUrl", "Logo URL"], ["coverUrl", "Cover image URL"], ["website", "Website"], ["email", "Email"],
        ["phone", "Phone"], ["whatsapp", "WhatsApp"], ["address", "Office address"], ["county", "County"],
        ["town", "Town"], ["yearsInBusiness", "Years in business"], ["services", "Services (comma separated)"],
        ["propertyTypes", "Property types (comma separated)"], ["facebook", "Facebook URL"], ["instagram", "Instagram URL"],
        ["x", "X (Twitter) URL"], ["linkedin", "LinkedIn URL"], ["weekdays", "Hours — Mon-Fri"],
        ["saturday", "Hours — Saturday"], ["sunday", "Hours — Sunday"],
      ] as const).map(([k, label]) => (
        <label key={k} className="text-sm">
          <span className="mb-1 block font-medium">{label}</span>
          <input value={(f as any)[k]} onChange={set(k)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </label>
      ))}
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block font-medium">Short description</span>
        <input value={f.shortDescription} onChange={set("shortDescription")} maxLength={300}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block font-medium">About the company</span>
        <textarea rows={5} value={f.description} onChange={set("description")}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
        </button>
      </div>
    </form>
  );
}

function ListingsPanel({ businessId }: { businessId: string }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["business-properties", businessId],
    queryFn: () => fetchBusinessProperties(businessId),
  });
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Property listings ({rows.length})</h2>
        <Link to="/dashboard/new" className="text-xs font-semibold text-primary">Add a listing →</Link>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.length === 0 && <li className="text-muted-foreground">No published listings linked to this company yet.</li>}
        {(rows as any[]).map((p) => (
          <li key={p.id} className="flex justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <span className="truncate">{p.title}</span>
            <span className="text-muted-foreground">{p.category}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EnquiriesPanel({ businessId }: { businessId: string }) {
  const list = useServerFn(listDirectoryEnquiries);
  const update = useServerFn(updateEnquiryStatus);
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["business-enquiries", businessId],
    queryFn: () => list({ data: { businessId } }),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Enquiries ({rows.length})</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.length === 0 && <li className="text-muted-foreground">No enquiries yet.</li>}
        {(rows as any[]).map((r) => (
          <li key={r.id} className="rounded-lg border border-border px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{r.name}</span>
              <select value={r.status}
                onChange={async (e) => {
                  await update({ data: { id: r.id, status: e.target.value as any } });
                  qc.invalidateQueries({ queryKey: ["business-enquiries", businessId] });
                }}
                className="rounded-lg border border-input bg-background px-2 py-1 text-xs">
                {["new", "contacted", "converted", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{r.email} {r.phone} · {new Date(r.created_at).toLocaleString()}</p>
            {r.message && <p className="mt-1">{r.message}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewsPanel({ businessId }: { businessId: string }) {
  const reply = useServerFn(replyToBusinessReview);
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["business-reviews", businessId],
    queryFn: () => fetchBusinessReviews(businessId),
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Reviews ({rows.length})</h2>
      <ul className="mt-3 space-y-3 text-sm">
        {rows.length === 0 && <li className="text-muted-foreground">No reviews yet.</li>}
        {(rows as any[]).map((r) => (
          <li key={r.id} className="rounded-lg border border-border p-3">
            <p className="inline-flex items-center gap-1 font-medium">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {r.rating}/5 · {r.author_name ?? "Customer"}
            </p>
            {r.body && <p className="mt-1 text-muted-foreground">{r.body}</p>}
            {r.reply ? (
              <p className="mt-2 rounded bg-muted p-2 text-xs">Your reply: {r.reply}</p>
            ) : (
              <form className="mt-2 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await reply({ data: { reviewId: r.id, reply: (draft[r.id] ?? "").trim() } });
                    toast.success("Reply posted");
                    qc.invalidateQueries({ queryKey: ["business-reviews", businessId] });
                  } catch (err: any) { toast.error(err?.message ?? "Failed"); }
                }}>
                <input value={draft[r.id] ?? ""} onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })}
                  placeholder="Reply to this review" required
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs" />
                <button className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Reply</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
