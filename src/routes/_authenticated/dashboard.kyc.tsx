import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { submitKyc } from "@/lib/kyc.functions";
import { ShieldCheck, ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/kyc")({
  component: KycPage,
  head: () => ({ meta: [{ title: "Identity verification (KYC) — Foxwood" }, { name: "robots", content: "noindex" }] }),
});

async function uploadKycFile(userId: string, kind: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${kind}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

function KycPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const submitFn = useServerFn(submitKyc);

  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState<"national_id" | "passport" | "alien_id">("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [earbNo, setEarbNo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [kraFile, setKraFile] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [earbFile, setEarbFile] = useState<File | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["my-kyc", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase
      .from("kyc_submissions")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()).data,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!fullName || !idNumber) throw new Error("Full legal name and ID number are required");
      if (!idFile || !selfieFile) throw new Error("ID document and selfie are required");

      const id_document_url = await uploadKycFile(user.id, "id", idFile);
      const selfie_url = await uploadKycFile(user.id, "selfie", selfieFile);
      const kra_pin_certificate_url = kraFile ? await uploadKycFile(user.id, "kra", kraFile) : null;
      const business_permit_url = permitFile ? await uploadKycFile(user.id, "permit", permitFile) : null;
      const earb_license_url = earbFile ? await uploadKycFile(user.id, "earb", earbFile) : null;

      await submitFn({ data: {
        full_legal_name: fullName.trim(),
        id_type: idType,
        id_number: idNumber.trim(),
        id_document_url,
        selfie_url,
        kra_pin: kraPin.trim() || null,
        kra_pin_certificate_url,
        business_permit_url,
        earb_license_number: earbNo.trim() || null,
        earb_license_url,
        company_name: companyName.trim() || null,
        notes: notes.trim() || null,
      } });
    },
    onSuccess: () => { toast.success("KYC submitted — we'll review within 24–48 hours"); qc.invalidateQueries({ queryKey: ["my-kyc"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to submit"),
  });

  const status = existing?.status ?? "none";
  const isBlocked = status === "pending" || status === "approved";

  return (
    <div className="container-page py-10 max-w-3xl">
      <Link to="/dashboard/account" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Identity verification
        </div>
        <h1 className="text-3xl font-bold mt-2">Get your Verified badge</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Verified agents and owners earn buyer trust, appear higher in search, and can list on premium tiers.
          Documents are stored privately and only shared with the Foxwood verification team.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
      ) : status === "approved" ? (
        <StatusCard icon={CheckCircle2} tone="success" title="You are verified ✅">
          Approved on {existing?.reviewed_at ? new Date(existing.reviewed_at).toLocaleDateString() : "—"}. Your profile now shows the Verified badge.
        </StatusCard>
      ) : status === "pending" ? (
        <StatusCard icon={Clock} tone="warn" title="Under review">
          Submitted on {existing?.created_at ? new Date(existing.created_at).toLocaleDateString() : "—"}. Reviews typically take 24–48 hours.
        </StatusCard>
      ) : status === "rejected" ? (
        <StatusCard icon={AlertCircle} tone="error" title="Previous submission was rejected">
          {existing?.reviewer_notes ? <span className="italic">Reviewer notes: {existing.reviewer_notes}</span> : "Please re-submit with clearer documents."}
        </StatusCard>
      ) : null}

      {!isBlocked && (
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="mt-6 space-y-6">
          <Section title="Identity">
            <Field label="Full legal name *">
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="As shown on your ID" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="ID type *">
                <select value={idType} onChange={(e) => setIdType(e.target.value as any)} className="input">
                  <option value="national_id">Kenyan National ID</option>
                  <option value="passport">Passport</option>
                  <option value="alien_id">Alien ID</option>
                </select>
              </Field>
              <Field label="ID number *">
                <input required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="input" />
              </Field>
            </div>
            <FileField label="ID document (photo or PDF) *" file={idFile} onChange={setIdFile} accept="image/*,.pdf" />
            <FileField label="Selfie holding your ID *" file={selfieFile} onChange={setSelfieFile} accept="image/*" />
          </Section>

          <Section title="Tax & business (optional but recommended)">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="KRA PIN">
                <input value={kraPin} onChange={(e) => setKraPin(e.target.value)} className="input" placeholder="A012345678B" />
              </Field>
              <Field label="Company name">
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input" placeholder="Your agency" />
              </Field>
            </div>
            <FileField label="KRA PIN certificate" file={kraFile} onChange={setKraFile} accept="image/*,.pdf" />
            <FileField label="Business permit" file={permitFile} onChange={setPermitFile} accept="image/*,.pdf" />
          </Section>

          <Section title="Real estate agents (EARB)" hint="Estate Agents Registration Board licence — required for licensed agents.">
            <Field label="EARB licence number">
              <input value={earbNo} onChange={(e) => setEarbNo(e.target.value)} className="input" />
            </Field>
            <FileField label="EARB licence certificate" file={earbFile} onChange={setEarbFile} accept="image/*,.pdf" />
          </Section>

          <Field label="Notes for reviewer (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submit.isPending} className="btn-primary btn-primary-hover disabled:opacity-40">
              {submit.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit for verification"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function FileField({ label, file, onChange, accept }: { label: string; file: File | null; onChange: (f: File | null) => void; accept: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <Upload className="h-5 w-5 text-muted-foreground" />
        <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="text-sm flex-1" />
        {file && <span className="text-xs text-primary font-medium truncate max-w-[12rem]">{file.name}</span>}
      </div>
    </label>
  );
}

function StatusCard({ icon: Icon, tone, title, children }: { icon: any; tone: "success" | "warn" | "error"; title: string; children: React.ReactNode }) {
  const toneCls =
    tone === "success" ? "border-primary/30 bg-primary-soft text-primary"
    : tone === "warn" ? "border-secondary/30 bg-secondary/10 text-foreground"
    : "border-destructive/30 bg-destructive/10 text-foreground";
  return (
    <div className={`mt-6 rounded-xl border p-5 ${toneCls}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">{title}</p>
          <div className="text-sm text-muted-foreground mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
