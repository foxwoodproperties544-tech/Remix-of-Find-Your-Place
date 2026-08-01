import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { z } from "zod";
import { ALL_TYPES } from "@/lib/taxonomy";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import { REQUEST_AMENITIES, REQUEST_KINDS, KIND_LABEL, fetchRequestPackages, budgetLabel } from "@/lib/property-requests";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/requests/new")({
  component: NewRequest,
});

const STEPS = ["Property details", "Requirements", "Additional info", "Publish"];

const schema = z.object({
  title: z.string().trim().min(10, "Give your request a clear title (10+ characters)").max(140),
  property_type: z.string().min(1, "Choose a property type"),
  county: z.string().min(1, "Choose a county"),
  description: z.string().trim().max(4000),
  budget_min: z.number().nonnegative().nullable(),
  budget_max: z.number().nonnegative().nullable(),
});

function NewRequest() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const [a] = useState(() => Math.floor(Math.random() * 8) + 2);
  const [b] = useState(() => Math.floor(Math.random() * 8) + 2);


  const { data: packages } = useQuery({ queryKey: ["request-packages", "buyer"], queryFn: () => fetchRequestPackages("buyer") });

  const [f, setF] = useState({
    kind: "buy" as (typeof REQUEST_KINDS)[number],
    title: "",
    property_type: "",
    county: "",
    town: "",
    estate: "",
    preferred_location: "",
    budget_min: "",
    budget_max: "",
    currency: "KES",
    bedrooms: "",
    bathrooms: "",
    parking: "",
    land_size: "",
    building_size: "",
    furnished: false,
    amenities: [] as string[],
    description: "",
    move_date: "",
    viewing_times: "",
    images: "",
    hide_phone: false,
    hide_email: true,
    allow_whatsapp: true,
    allow_messages: true,
    email_notifications: true,
    contact_phone: "",
    contact_email: "",
    package_slug: "free-request",
  });

  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));
  const pkg = packages?.find((p) => p.slug === f.package_slug);

  async function save(status: "draft" | "active") {
    if (authLoading) {
      toast.info("Just a moment — finishing sign-in…");
      return;
    }
    if (!user) {
      toast.error("Please sign in again to submit your request.");
      navigate({ to: "/auth" });
      return;
    }
    const parsed = schema.safeParse({
      title: f.title,
      property_type: f.property_type,
      county: f.county,
      description: f.description,
      budget_min: f.budget_min ? Number(f.budget_min) : null,
      budget_max: f.budget_max ? Number(f.budget_max) : null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      // Send the user back to the step that holds the offending field.
      const field = String(issue.path[0] ?? "");
      setStep(field === "description" ? 1 : 0);
      toast.error(issue.message);
      return;
    }
    const min = f.budget_min ? Number(f.budget_min) : null;
    const max = f.budget_max ? Number(f.budget_max) : null;
    if (min != null && max != null && min > max) {
      setStep(0);
      toast.error("Budget min cannot be greater than budget max");
      return;
    }
    if (status === "active" && Number(captcha) !== a + b) {
      toast.error("Please answer the spam check correctly");
      return;

    }
    setSaving(true);
    try {
      const ok = await checkRateLimit("property_request_submit", rateLimitKey(user.id), 5, 3600);
      if (!ok) throw new Error("You've submitted several requests recently. Please try again later.");

      const payload: Record<string, any> = {
        user_id: user.id,
        title: f.title.trim(),
        kind: f.kind,
        property_type: f.property_type,
        county: f.county,
        town: f.town || null,
        estate: f.estate || null,
        preferred_location: f.preferred_location || null,
        budget_min: f.budget_min ? Number(f.budget_min) : null,
        budget_max: f.budget_max ? Number(f.budget_max) : null,
        currency: f.currency,
        bedrooms: f.bedrooms ? Number(f.bedrooms) : null,
        bathrooms: f.bathrooms ? Number(f.bathrooms) : null,
        parking: f.parking ? Number(f.parking) : null,
        land_size: f.land_size || null,
        building_size: f.building_size || null,
        furnished: f.furnished,
        amenities: f.amenities,
        description: f.description.trim(),
        move_date: f.move_date || null,
        viewing_times: f.viewing_times || null,
        images: f.images.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 6),
        hide_phone: f.hide_phone,
        hide_email: f.hide_email,
        allow_whatsapp: f.allow_whatsapp,
        allow_messages: f.allow_messages,
        email_notifications: f.email_notifications,
        contact_phone: f.contact_phone || null,
        contact_email: f.contact_email || null,
        package_slug: f.package_slug,
        // is_featured / is_urgent are privileged: the database decides them
        // from the paid package, never the browser.
        status,
      };
      const { error } = await supabase.from("property_requests" as any).insert(payload).select("id").single();
      if (error) throw error;

      toast.success(status === "draft" ? "Draft saved" : "Request published");
      navigate({ to: "/dashboard/requests" });
    } catch (e: any) {
      const msg = [e?.message, e?.details, e?.hint].filter(Boolean).join(" — ");
      toast.error(msg || "Could not save request. Please try again.");

    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Submit a property request</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tell verified agents, developers and owners exactly what you're looking for.</p>

      <ol className="mt-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
            {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>} {s}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 space-y-4">
        {step === 0 && (
          <>
            <Field label="I want to">
              <select className="input-base" value={f.kind} onChange={(e) => set("kind", e.target.value)}>
                {REQUEST_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </Field>
            <Field label="Request title">
              <input className="input-base" maxLength={140} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Looking for a 3 bedroom house in Kitengela" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Property type">
                <select className="input-base" value={f.property_type} onChange={(e) => set("property_type", e.target.value)}>
                  <option value="">Select…</option>
                  {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="County">
                <select className="input-base" value={f.county} onChange={(e) => set("county", e.target.value)}>
                  <option value="">Select…</option>
                  {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Town"><input className="input-base" value={f.town} onChange={(e) => set("town", e.target.value)} /></Field>
              <Field label="Estate"><input className="input-base" value={f.estate} onChange={(e) => set("estate", e.target.value)} /></Field>
              <Field label="Preferred location notes"><input className="input-base" value={f.preferred_location} onChange={(e) => set("preferred_location", e.target.value)} placeholder="Near a tarmac road, close to schools" /></Field>
              <Field label="Currency">
                <select className="input-base" value={f.currency} onChange={(e) => set("currency", e.target.value)}>
                  <option value="KES">KES</option><option value="USD">USD</option>
                </select>
              </Field>
              <Field label="Budget min"><input type="number" className="input-base" value={f.budget_min} onChange={(e) => set("budget_min", e.target.value)} /></Field>
              <Field label="Budget max"><input type="number" className="input-base" value={f.budget_max} onChange={(e) => set("budget_max", e.target.value)} /></Field>
              <Field label="Bedrooms"><input type="number" min={0} className="input-base" value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></Field>
              <Field label="Bathrooms"><input type="number" min={0} className="input-base" value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} /></Field>
              <Field label="Parking spaces"><input type="number" min={0} className="input-base" value={f.parking} onChange={(e) => set("parking", e.target.value)} /></Field>
              <Field label="Land size"><input className="input-base" value={f.land_size} onChange={(e) => set("land_size", e.target.value)} placeholder="1/8 acre" /></Field>
              <Field label="Building size"><input className="input-base" value={f.building_size} onChange={(e) => set("building_size", e.target.value)} placeholder="150 sqm" /></Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm font-semibold">Required amenities</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REQUEST_AMENITIES.map((a2) => (
                <label key={a2} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                    checked={f.amenities.includes(a2)}
                    onChange={(e) => set("amenities", e.target.checked ? [...f.amenities, a2] : f.amenities.filter((x) => x !== a2))}
                  />
                  {a2}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm pt-2">
              <input type="checkbox" className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]" checked={f.furnished} onChange={(e) => set("furnished", e.target.checked)} />
              Must be furnished
            </label>
            <Field label="Describe exactly what you're looking for">
              <textarea rows={6} maxLength={4000} className="input-base" value={f.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred move date"><input type="date" className="input-base" value={f.move_date} onChange={(e) => set("move_date", e.target.value)} /></Field>
              <Field label="Preferred viewing times"><input className="input-base" value={f.viewing_times} onChange={(e) => set("viewing_times", e.target.value)} placeholder="Weekends, 10am–2pm" /></Field>
              <Field label="Contact phone"><input className="input-base" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="07XX XXX XXX" /></Field>
              <Field label="Contact email"><input type="email" className="input-base" value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></Field>
            </div>
            <Field label="Reference image URLs (optional, one per line)">
              <textarea rows={3} className="input-base" value={f.images} onChange={(e) => set("images", e.target.value)} placeholder="https://…" />
            </Field>
            <div className="space-y-2 pt-2">
              <Toggle label="Hide my phone number" checked={f.hide_phone} onChange={(v) => set("hide_phone", v)} />
              <Toggle label="Hide my email address" checked={f.hide_email} onChange={(v) => set("hide_email", v)} />
              <Toggle label="Receive WhatsApp enquiries" checked={f.allow_whatsapp} onChange={(v) => set("allow_whatsapp", v)} />
              <Toggle label="Receive platform messages" checked={f.allow_messages} onChange={(v) => set("allow_messages", v)} />
              <Toggle label="Receive email notifications" checked={f.email_notifications} onChange={(v) => set("email_notifications", v)} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Preview</p>
              <p className="mt-2 text-lg font-bold">{f.title || "Untitled request"}</p>
              <p className="text-sm text-muted-foreground">{KIND_LABEL[f.kind]} · {f.property_type || "Any type"} · {[f.estate, f.town, f.county].filter(Boolean).join(", ") || "Location TBC"}</p>
              <p className="mt-2 font-semibold text-primary">
                {budgetLabel({ budget_min: f.budget_min ? Number(f.budget_min) : null, budget_max: f.budget_max ? Number(f.budget_max) : null, currency: f.currency })}
              </p>
              {f.amenities.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Amenities: {f.amenities.join(", ")}</p>}
              {f.description && <p className="mt-2 whitespace-pre-wrap text-sm">{f.description}</p>}
            </div>

            <Field label="Choose a package">
              <select className="input-base" value={f.package_slug} onChange={(e) => set("package_slug", e.target.value)}>
                {(packages ?? []).map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name} — {p.price > 0 ? `KES ${p.price.toLocaleString()}` : "Free"}</option>
                ))}
              </select>
            </Field>
            {pkg?.description && <p className="text-xs text-muted-foreground">{pkg.description}</p>}

            <Field label={`Spam check: what is ${a} + ${b}?`}>
              <input className="input-base" value={captcha} onChange={(e) => setCaptcha(e.target.value)} inputMode="numeric" />
            </Field>

            <div className="flex flex-wrap gap-2 pt-2">
              <button disabled={saving} onClick={() => save("draft")} className="rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-muted">Save draft</button>
              <button disabled={saving} onClick={() => save("active")} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {saving ? "Publishing…" : "Publish request"}
              </button>
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 && (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Looking for inspiration? <Link to="/property-requests" className="text-primary hover:underline">Browse live requests</Link>.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
