import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getVerificationSubscription,
  startVerificationSubscription,
} from "@/lib/verification-subscription.functions";
import { getPaymentStatus } from "@/lib/payments.functions";
import { ShieldCheck, ArrowLeft, Loader2, CheckCircle2, Clock, BadgeCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/kyc")({
  component: VerificationSubscriptionPage,
  head: () => ({
    meta: [
      { title: "Verified agent subscription — Foxwood" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const BENEFITS = [
  "Verified badge on your public profile and every listing",
  "Higher placement in agent directory and search results",
  "Buyers see you as a trusted, vetted Foxwood agent",
  "Renewable monthly — cancel any time by not renewing",
];

function VerificationSubscriptionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchSub = useServerFn(getVerificationSubscription);
  const startPay = useServerFn(startVerificationSubscription);
  const pollStatus = useServerFn(getPaymentStatus);

  const [phone, setPhone] = useState("");
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

  const { data: sub, isLoading } = useQuery({
    queryKey: ["verification-sub", user?.id],
    enabled: !!user,
    queryFn: () => fetchSub({}),
  });

  useQuery({
    queryKey: ["verification-sub-poll", checkoutId],
    enabled: !!checkoutId,
    refetchInterval: 4000,
    queryFn: async () => {
      const row = await pollStatus({ data: { checkoutRequestId: checkoutId! } });
      if (row?.status === "success") {
        setCheckoutId(null);
        toast.success("Payment received — you're verified 🎉");
        qc.invalidateQueries({ queryKey: ["verification-sub"] });
      } else if (row?.status === "failed" || row?.status === "cancelled") {
        setCheckoutId(null);
        toast.error(row?.result_desc ?? "Payment was not completed");
      }
      return row;
    },
  });

  const pay = useMutation({
    mutationFn: async () => {
      if (!/^(\+?254|0)?7\d{8}$|^(\+?254|0)?1\d{8}$/.test(phone.replace(/\s/g, "")))
        throw new Error("Enter a valid Safaricom number, e.g. 0712345678");
      return startPay({ data: { phone: phone.replace(/\s/g, "") } });
    },
    onSuccess: (r) => {
      setCheckoutId(r.checkoutRequestId);
      toast.success(r.customerMessage ?? "Check your phone for the M-Pesa prompt");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not start payment"),
  });

  const active = sub?.active ?? false;

  return (
    <div className="container-page py-10 max-w-3xl">
      <Link to="/dashboard/account" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Agent verification
        </div>
        <h1 className="text-3xl font-bold mt-2">Get your Verified badge</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          No paperwork needed. You're already signed in — simply subscribe to the monthly
          verification plan and your Verified badge activates instantly.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {active && (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary-soft p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h2 className="font-semibold">You are verified ✅</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Active until{" "}
                    <strong>{sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "—"}</strong>
                    {typeof sub?.daysRemaining === "number" && <> · {Math.max(0, sub.daysRemaining)} days remaining</>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!active && sub?.expiresAt && (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5 flex items-start gap-3">
              <Clock className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h2 className="font-semibold">Your verification expired</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Expired on {new Date(sub.expiresAt).toLocaleDateString()}. Renew below to restore your badge.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-baseline gap-2">
              <BadgeCheck className="h-5 w-5 text-primary self-center" />
              <span className="text-3xl font-bold">KSh {(sub?.price ?? 1000).toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sub?.durationDays ?? 30}-day cycle, renewable after expiry.
            </p>

            <ul className="mt-4 space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <form
              onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}
              className="mt-6 border-t border-border pt-5 space-y-3"
            >
              <label className="block text-sm">
                <span className="font-medium">M-Pesa phone number</span>
                <div className="mt-1 relative">
                  <Smartphone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712345678"
                    inputMode="tel"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={pay.isPending || !!checkoutId}
                className="btn-primary btn-primary-hover disabled:opacity-40"
              >
                {pay.isPending || checkoutId ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {checkoutId ? "Waiting for M-Pesa…" : "Sending prompt…"}</>
                ) : active ? (
                  `Extend by ${sub?.durationDays ?? 30} days`
                ) : (
                  `Subscribe — KSh ${(sub?.price ?? 1000).toLocaleString()}/month`
                )}
              </button>

              {checkoutId && (
                <p className="text-xs text-muted-foreground">
                  Enter your M-Pesa PIN on your phone. This page updates automatically once payment is confirmed.
                </p>
              )}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
