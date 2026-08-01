import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ShieldCheck, Smartphone, Trash2, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/security")({
  component: SecurityPage,
  head: () => ({
    meta: [
      { title: "Account security — Foxwood Properties" },
      { name: "description", content: "Manage two-factor authentication and account security for your Foxwood Properties account." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string };

function SecurityPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [pending, setPending] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [friendly, setFriendly] = useState("Authenticator app");

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) toast.error(error.message);
    setFactors(((data?.all as Factor[]) ?? []).filter((f) => f.factor_type === "totp"));
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  async function startEnroll() {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: friendly || `Authenticator ${new Date().toISOString().slice(0, 10)}`,
    });
    setEnrolling(false);
    if (error) { toast.error(error.message); return; }
    setPending({ factorId: data.id, qr: (data as any).totp?.qr_code ?? "", secret: (data as any).totp?.secret ?? "" });
  }

  async function verifyEnroll() {
    if (!pending) return;
    setVerifying(true);
    const { data: chal, error: cErr } = await supabase.auth.mfa.challenge({ factorId: pending.factorId });
    if (cErr || !chal) { setVerifying(false); toast.error(cErr?.message ?? "Challenge failed"); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: pending.factorId, challengeId: chal.id, code: otp.trim() });
    setVerifying(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Two-factor authentication enabled");
    setPending(null); setOtp("");
    await refresh();
  }

  async function unenroll(id: string) {
    if (!confirm("Remove this two-factor method? You'll need to re-enroll to protect your account again.")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Two-factor method removed");
    await refresh();
  }

  const verified = factors.filter((f) => f.status === "verified");
  const hasMfa = verified.length > 0;

  return (
    <DashboardShell>
      <div className="max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Account security</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a second step to sign-in with an authenticator app (Google Authenticator, 1Password, Authy).
            Strongly recommended for admins and agents handling client data.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-full ${hasMfa ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Two-factor authentication (TOTP)</div>
                <div className="text-xs text-muted-foreground">{hasMfa ? "Enabled — your account is protected by an authenticator app." : "Not enabled — anyone with your password can sign in."}</div>
              </div>
            </div>
            {!hasMfa && !pending && (
              <button onClick={startEnroll} disabled={enrolling} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                {enrolling ? "Setting up…" : "Enable 2FA"}
              </button>
            )}
          </div>

          {pending && (
            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4" /> Scan the QR with your authenticator app</div>
              {pending.qr && <img src={pending.qr} alt="TOTP QR code" className="h-40 w-40 rounded bg-white p-2" />}
              <div className="text-xs text-muted-foreground">
                Can't scan? Enter this secret manually:
                <code className="ml-2 rounded bg-background px-2 py-1 text-[11px] font-mono select-all">{pending.secret}</code>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  className="w-40 rounded-lg border border-border bg-field px-3 py-2 text-sm font-mono tracking-widest"
                />
                <button onClick={verifyEnroll} disabled={verifying || otp.length !== 6} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                  {verifying ? "Verifying…" : "Verify & activate"}
                </button>
                <button onClick={() => { setPending(null); setOtp(""); }} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="mt-4 text-sm text-muted-foreground">Loading…</div>
          ) : verified.length > 0 ? (
            <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
              {verified.map((f) => (
                <li key={f.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm font-medium">{f.friendly_name || "Authenticator"}</div>
                    <div className="text-xs text-muted-foreground">TOTP · verified</div>
                  </div>
                  <button onClick={() => unenroll(f.id)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/5">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3">
          <div className="font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Security tips</div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Use a unique password and store it in a password manager.</li>
            <li>Never share your 6-digit code or QR secret with anyone — Foxwood support will never ask for it.</li>
            <li>If you lose access to your authenticator, contact <a className="underline" href="mailto:support@foxwoodproperties.co.ke">support@foxwoodproperties.co.ke</a> from your registered email.</li>
          </ul>
        </section>
      </div>
    </DashboardShell>
  );
}
