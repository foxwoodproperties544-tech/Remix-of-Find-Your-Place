import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { UserCog, Upload, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, BadgeCheck, Clock, XCircle } from "lucide-react";
import { SERVICES, ALL_TYPES } from "@/lib/taxonomy";
import { KENYA_COUNTIES, KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { PhoneVerifyCard } from "@/components/site/PhoneVerifyCard";
import { requestAgentVerification } from "@/lib/agent-verification.functions";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "My profile — Foxwood" }, { name: "robots", content: "noindex" }] }),
});


const LANGUAGES = ["English", "Kiswahili", "Kikuyu", "Luo", "Luhya", "Kalenjin", "Kamba", "Meru", "Somali", "French", "Arabic"];

type ProfileForm = {
  full_name: string;
  phone: string;
  whatsapp: string;
  email_public: string;
  company_name: string;
  bio: string;
  avatar_url: string;
  county: string;
  town: string;
  address_line: string;
  website: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  twitter_url: string;
  tiktok_url: string;
  services: string[];
  service_areas: string[];
  specialties: string[];
  languages: string[];
  years_experience: string;
  license_number: string;
  office_hours: string;
};

const empty: ProfileForm = {
  full_name: "", phone: "", whatsapp: "", email_public: "", company_name: "", bio: "", avatar_url: "",
  county: "", town: "", address_line: "", website: "",
  facebook_url: "", instagram_url: "", linkedin_url: "", twitter_url: "", tiktok_url: "",
  services: [], service_areas: [], specialties: [], languages: [],
  years_experience: "", license_number: "", office_hours: "",
};

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(empty);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      full_name: data.full_name ?? "",
      phone: data.phone ?? "",
      whatsapp: data.whatsapp ?? "",
      email_public: (data as any).email_public ?? "",
      company_name: data.company_name ?? "",
      bio: data.bio ?? "",
      avatar_url: data.avatar_url ?? "",
      county: (data as any).county ?? "",
      town: (data as any).town ?? "",
      address_line: (data as any).address_line ?? "",
      website: (data as any).website ?? "",
      facebook_url: (data as any).facebook_url ?? "",
      instagram_url: (data as any).instagram_url ?? "",
      linkedin_url: (data as any).linkedin_url ?? "",
      twitter_url: (data as any).twitter_url ?? "",
      tiktok_url: (data as any).tiktok_url ?? "",
      services: (data as any).services ?? [],
      service_areas: (data as any).service_areas ?? [],
      specialties: (data as any).specialties ?? [],
      languages: (data as any).languages ?? [],
      years_experience: (data as any).years_experience?.toString() ?? "",
      license_number: (data as any).license_number ?? "",
      office_hours: (data as any).office_hours ?? "",
    });
  }, [data]);

  const townOptions = useMemo(() => (form.county ? (KENYA_SUBLOCATIONS[form.county] ?? []) : []), [form.county]);

  const save = useMutation({
    mutationFn: async (payload: ProfileForm) => {
      const yrs = payload.years_experience.trim();
      const hasPhone = payload.phone.trim().length > 6;
      const clean = {
        ...payload,
        years_experience: yrs === "" ? null : Math.max(0, Math.min(80, parseInt(yrs, 10) || 0)),
        phone_verified: hasPhone,
        phone_verified_at: hasPhone ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("profiles").update(clean as any).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  async function handleAvatarUpload(file: File) {
    if (!user) return;
    if (file.size > 4 * 1024 * 1024) { toast.error("Max avatar size is 4 MB"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("property-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
      setForm((f) => ({ ...f, avatar_url: pub.publicUrl }));
      toast.success("Avatar uploaded — click Save to apply");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const checks = {
    name: form.full_name.trim().length > 1,
    bio: form.bio.trim().length >= 60,
    phone: form.phone.trim().length > 6,
    phone_verified: !!(data as any)?.phone_verified,
    location: !!form.county && !!form.town,
    services: form.services.length > 0,
    areas: form.service_areas.length > 0,
    avatar: !!form.avatar_url,
  };
  const complete = checks.name && checks.bio && checks.phone && checks.phone_verified && checks.location && checks.services && checks.areas;
  const verificationStatus = ((data as any)?.agent_verification_status ?? "none") as "none" | "pending" | "approved" | "rejected";
  const isVerified = !!(data as any)?.verified;

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;


  return (
    <div className="max-w-4xl">
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
        <UserCog className="h-3.5 w-3.5" /> Public agent profile
      </div>
      <h1 className="text-3xl font-bold mt-2">My profile</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Buyers and tenants review this before contacting you. Complete every section so people trust you enough to reach out.
      </p>

      <div className={`mt-5 rounded-2xl border p-4 flex items-start gap-3 ${complete ? "border-emerald-500/30 bg-emerald-500/10" : "border-secondary/30 bg-secondary/10"}`}>
        {complete ? <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="h-5 w-5 text-secondary mt-0.5 shrink-0" />}
        <div className="flex-1 text-sm">
          <div className="font-semibold">
            {complete ? "Your profile is public and ready to receive enquiries." : "Complete these to appear as a verified agent"}
          </div>
          {!complete && (
            <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-xs">
              <ChecklistItem ok={checks.name} label="Full name" />
              <ChecklistItem ok={checks.avatar} label="Profile photo" />
              <ChecklistItem ok={checks.bio} label="Bio (60+ characters)" />
              <ChecklistItem ok={checks.phone} label="Phone number" />
              <ChecklistItem ok={checks.phone_verified} label="Phone verified (SMS code)" />
              <ChecklistItem ok={checks.location} label="County & town" />
              <ChecklistItem ok={checks.services} label="At least one service" />
              <ChecklistItem ok={checks.areas} label="At least one area served" />
            </ul>
          )}
          {complete && user && (
            <Link to="/agents/$id" params={{ id: user.id }} className="text-primary hover:underline inline-flex items-center gap-1 text-xs font-semibold mt-1">
              View public profile <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Phone verification (required for public profile) */}
      <div className="mt-5">
        <PhoneVerifyCard />
      </div>

      {/* Agent verification */}
      <VerificationCard
        complete={complete}
        phoneVerified={checks.phone_verified}
        status={verificationStatus}
        verified={isVerified}
        reviewerNotes={(data as any)?.agent_verification_reviewer_notes ?? null}
      />


      <form
        className="mt-6 space-y-8"
        onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}
      >
        <Section title="Photo & identity">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                : <UserCog className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div>
              <label className="btn-ghost text-sm cursor-pointer inline-flex items-center gap-2">
                <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload photo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (f) handleAvatarUpload(f);
                }} />
              </label>
              <p className="text-xs text-muted-foreground mt-2">Clear face photo works best. Max 4 MB.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mt-5">
            <Field label="Full name" required>
              <Input value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} maxLength={100} required />
            </Field>
            <Field label="Company / agency">
              <Input value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} maxLength={120} />
            </Field>
            <Field label="Years of experience">
              <Input type="number" value={form.years_experience} onChange={(v) => setForm({ ...form, years_experience: v })} placeholder="e.g. 5" />
            </Field>
            <Field label="License / registration number" hint="Optional — helps build trust">
              <Input value={form.license_number} onChange={(v) => setForm({ ...form, license_number: v })} maxLength={60} />
            </Field>
          </div>
        </Section>

        <Section title="About you" description="Explain who you are, what you specialise in, and why buyers should trust you.">
          <Field label="Bio" required hint={`${form.bio.length}/800 characters — aim for 60+`}>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[160px]"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 800) })}
              placeholder="e.g. I'm a Nairobi-based property consultant with 6 years helping first-time buyers find land in Kajiado and Kiambu. I handle everything from site visits and price negotiation to title transfer."
              maxLength={800}
            />
          </Field>
        </Section>

        <Section title="Location">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="County" required>
              <Select value={form.county} onChange={(v) => setForm({ ...form, county: v, town: "" })}>
                <option value="">Select county…</option>
                {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Town / area" required>
              <Select value={form.town} onChange={(v) => setForm({ ...form, town: v })} disabled={!form.county}>
                <option value="">{form.county ? "Select town…" : "Pick a county first"}</option>
                {townOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Office address" hint="Building, street">
              <Input value={form.address_line} onChange={(v) => setForm({ ...form, address_line: v })} maxLength={160} placeholder="e.g. ABC Place, 5th Floor, Waiyaki Way" />
            </Field>
          </div>
        </Section>

        <Section title="Contact" description="Buyers use these to reach you directly.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" required>
              <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+254…" maxLength={20} />
            </Field>
            <Field label="WhatsApp">
              <Input value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="+254…" maxLength={20} />
            </Field>
            <Field label="Public email" hint="Different from your sign-in email if you prefer">
              <Input type="email" value={form.email_public} onChange={(v) => setForm({ ...form, email_public: v })} maxLength={255} />
            </Field>
            <Field label="Office hours">
              <Input value={form.office_hours} onChange={(v) => setForm({ ...form, office_hours: v })} placeholder="e.g. Mon–Sat, 8am–6pm" maxLength={120} />
            </Field>
          </div>
        </Section>

        <Section title="What you offer" description="Pick everything that applies. These filters help the right buyers find you.">
          <Field label="Services" required>
            <MultiChips
              options={SERVICES.map((s) => s.title)}
              selected={form.services}
              onChange={(v) => setForm({ ...form, services: v })}
            />
          </Field>
          <Field label="Property specialties" hint="Types of property you handle">
            <MultiChips
              options={ALL_TYPES}
              selected={form.specialties}
              onChange={(v) => setForm({ ...form, specialties: v })}
            />
          </Field>
          <Field label="Areas you serve" required hint="Counties or major towns">
            <MultiChips
              options={KENYA_COUNTIES}
              selected={form.service_areas}
              onChange={(v) => setForm({ ...form, service_areas: v })}
            />
          </Field>
          <Field label="Languages you speak">
            <MultiChips options={LANGUAGES} selected={form.languages} onChange={(v) => setForm({ ...form, languages: v })} />
          </Field>
        </Section>

        <Section title="Online presence" description="Optional — profiles with socials get contacted more.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website"><Input value={form.website} onChange={(v) => setForm({ ...form, website: v })} placeholder="https://…" maxLength={200} /></Field>
            <Field label="Facebook"><Input value={form.facebook_url} onChange={(v) => setForm({ ...form, facebook_url: v })} placeholder="https://facebook.com/…" maxLength={200} /></Field>
            <Field label="Instagram"><Input value={form.instagram_url} onChange={(v) => setForm({ ...form, instagram_url: v })} placeholder="https://instagram.com/…" maxLength={200} /></Field>
            <Field label="LinkedIn"><Input value={form.linkedin_url} onChange={(v) => setForm({ ...form, linkedin_url: v })} placeholder="https://linkedin.com/in/…" maxLength={200} /></Field>
            <Field label="X / Twitter"><Input value={form.twitter_url} onChange={(v) => setForm({ ...form, twitter_url: v })} placeholder="https://x.com/…" maxLength={200} /></Field>
            <Field label="TikTok"><Input value={form.tiktok_url} onChange={(v) => setForm({ ...form, tiktok_url: v })} placeholder="https://tiktok.com/@…" maxLength={200} /></Field>
          </div>
        </Section>

        <div className="flex items-center justify-end gap-3 pt-2 sticky bottom-4 bg-background/80 backdrop-blur rounded-2xl border border-border p-3">
          <span className="text-xs text-muted-foreground mr-auto">
            {complete ? "Profile is complete." : "Fill required fields to publish your public profile."}
          </span>
          <button type="submit" className="btn-primary btn-primary-hover" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function VerificationCard({
  complete, phoneVerified, status, verified, reviewerNotes,
}: {
  complete: boolean; phoneVerified: boolean;
  status: "none" | "pending" | "approved" | "rejected";
  verified: boolean; reviewerNotes: string | null;
}) {
  const qc = useQueryClient();
  const requestFn = useServerFn(requestAgentVerification);
  const [notes, setNotes] = useState("");
  const request = useMutation({
    mutationFn: () => requestFn({ data: { notes: notes.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Verification requested — we'll email you when reviewed");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit"),
  });

  if (verified || status === "approved") {
    return (
      <div className="mt-5 rounded-2xl border border-primary/30 bg-primary-soft p-5 flex items-start gap-3">
        <BadgeCheck className="h-6 w-6 text-primary shrink-0" />
        <div>
          <div className="font-semibold text-primary">You're a Foxwood-verified agent</div>
          <p className="text-xs text-muted-foreground mt-1">The verified badge is showing on your public profile.</p>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mt-5 rounded-2xl border border-secondary/30 bg-secondary/10 p-5 flex items-start gap-3">
        <Clock className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">Verification pending review</div>
          <p className="text-xs text-muted-foreground mt-1">
            An admin will review your profile shortly. You'll be notified by email and in the app once a decision is made.
          </p>
        </div>
      </div>
    );
  }

  const canRequest = complete && phoneVerified;
  return (
    <div className="mt-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold">Request the Foxwood Verified Agent badge</div>
          <p className="text-xs text-muted-foreground mt-1">
            Verified agents are ranked higher on the directory and rank of trust with buyers. Requires a complete profile and a verified phone number.
          </p>
          {status === "rejected" && reviewerNotes && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2 text-xs">
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
              <div><strong>Reviewer notes:</strong> {reviewerNotes}</div>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            placeholder="Optional: anything the reviewer should know (license number, referral, etc.)"
            className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
            maxLength={500}
          />
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {canRequest
                ? "Ready to submit."
                : !phoneVerified
                  ? "Verify your phone first."
                  : "Complete your profile checklist above first."}
            </span>
            <button
              type="button"
              onClick={() => request.mutate()}
              disabled={!canRequest || request.isPending}
              className="btn-primary btn-primary-hover disabled:opacity-50"
            >
              {request.isPending ? "Submitting…" : status === "rejected" ? "Resubmit for review" : "Request verification"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-foreground/80"}`}>
      <CheckCircle2 className={`h-3.5 w-3.5 ${ok ? "" : "opacity-30"}`} /> {label}
    </li>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1 flex items-center gap-1.5">
        {label} {required && <span className="text-secondary">*</span>}
      </div>
      {children}
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

function Input(props: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxLength?: number; required?: boolean }) {
  return (
    <input
      type={props.type ?? "text"}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      maxLength={props.maxLength}
      required={props.required}
    />
  );
}

function Select({ value, onChange, children, disabled }: { value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <select
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  );
}

function MultiChips({ options, selected, onChange }: { options: readonly string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => toggle(opt)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              on
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/50 hover:bg-primary-soft/50"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
