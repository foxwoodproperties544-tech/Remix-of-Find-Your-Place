import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileSignature, Loader2, X, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { submitRentalApplication } from "@/lib/rentals.functions";

export function ApplyToRentButton({
  propertyId,
  propertyTitle,
  category,
  className,
}: {
  propertyId: string;
  propertyTitle: string;
  category: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const cat = (category ?? "").toLowerCase();
  if (!cat.includes("rent") && !cat.includes("lease")) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "btn-primary"} aria-haspopup="dialog">
        <FileSignature className="h-4 w-4" /> Apply to rent
      </button>
      {open && (
        <ApplyDialog
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          signedIn={!!user}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ApplyDialog({
  propertyId,
  propertyTitle,
  signedIn,
  onClose,
}: {
  propertyId: string;
  propertyTitle: string;
  signedIn: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    occupation: "",
    employer: "",
    monthlyIncome: "",
    moveInDate: "",
    occupants: "1",
    pets: false,
    notes: "",
  });
  const [done, setDone] = useState(false);
  const submit = useServerFn(submitRentalApplication);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () =>
      submit({
        data: {
          propertyId,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          occupation: form.occupation.trim() || undefined,
          employer: form.employer.trim() || undefined,
          monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : undefined,
          moveInDate: form.moveInDate || undefined,
          occupants: Number(form.occupants) || 1,
          pets: form.pets,
          notes: form.notes.trim() || undefined,
        },
      }),
    onSuccess: () => setDone(true),
    onError: (e: any) => toast.error(e?.message ?? "Application not submitted"),
  });

  const valid = form.fullName.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length > 6;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Rental application">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Apply to rent</h2>
            <p className="mt-1 text-xs text-muted-foreground">{propertyTitle}</p>
          </div>
          <button onClick={onClose} className="btn-ghost" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        {!signedIn ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Sign in so you can track your application status in your dashboard.</p>
            <Link to="/auth" className="btn-primary w-full justify-center">Sign in to apply</Link>
          </div>
        ) : done ? (
          <div className="mt-6 space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="font-bold">Application submitted</h3>
            <p className="text-sm text-muted-foreground">The agent has been notified. Track progress in your dashboard.</p>
            <Link to="/dashboard/my-applications" className="btn-primary w-full justify-center">View my applications</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Full name *</span>
              <input className="input-base mt-1 w-full" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} maxLength={120} />
            </label>
            <label className="text-sm">
              <span className="font-medium">Email *</span>
              <input type="email" className="input-base mt-1 w-full" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
            </label>
            <label className="text-sm">
              <span className="font-medium">Phone *</span>
              <input className="input-base mt-1 w-full" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} />
            </label>
            <label className="text-sm">
              <span className="font-medium">Occupation</span>
              <input className="input-base mt-1 w-full" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} maxLength={120} />
            </label>
            <label className="text-sm">
              <span className="font-medium">Employer</span>
              <input className="input-base mt-1 w-full" value={form.employer} onChange={(e) => set("employer", e.target.value)} maxLength={160} />
            </label>
            <label className="text-sm">
              <span className="font-medium">Monthly income (KSh)</span>
              <input type="number" min={0} className="input-base mt-1 w-full" value={form.monthlyIncome} onChange={(e) => set("monthlyIncome", e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="font-medium">Preferred move-in date</span>
              <input type="date" className="input-base mt-1 w-full" value={form.moveInDate} onChange={(e) => set("moveInDate", e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="font-medium">Number of occupants</span>
              <input type="number" min={1} max={30} className="input-base mt-1 w-full" value={form.occupants} onChange={(e) => set("occupants", e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm sm:mt-6">
              <input type="checkbox" checked={form.pets} onChange={(e) => set("pets", e.target.checked)} />
              <span className="font-medium">I have pets</span>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Anything else the agent should know?</span>
              <textarea rows={3} maxLength={2000} className="input-base mt-1 w-full" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </label>
            <button
              onClick={() => mut.mutate()}
              disabled={!valid || mut.isPending}
              className="btn-primary mt-1 w-full justify-center disabled:opacity-50 sm:col-span-2"
            >
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Submit application
            </button>
            <p className="text-[11px] text-muted-foreground sm:col-span-2">
              Your details are shared only with the listing agent and Foxwood admins.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
