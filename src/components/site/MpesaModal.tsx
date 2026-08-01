import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Smartphone, X, CheckCircle2 } from "lucide-react";
import { getPaymentStatus } from "@/lib/payments.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  amountKes: number;
  initiate: (phone: string) => Promise<{ checkoutRequestId: string; customerMessage: string }>;
  onSuccess?: () => void;
};

export function MpesaModal({ open, onClose, title, amountKes, initiate, onSuccess }: Props) {
  const [phone, setPhone] = useState("");
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const poll = useServerFn(getPaymentStatus);

  const start = useMutation({
    mutationFn: (p: string) => initiate(p),
    onSuccess: (r) => { setCheckoutId(r.checkoutRequestId); toast.success(r.customerMessage ?? "Check your phone"); },
    onError: (e: any) => toast.error(e?.message ?? "Payment failed to start"),
  });

  useEffect(() => {
    if (!checkoutId || succeeded) return;
    const id = setInterval(async () => {
      try {
        const row = await poll({ data: { checkoutRequestId: checkoutId } });
        if (row?.status === "success") {
          setSucceeded(true);
          clearInterval(id);
          toast.success("Payment confirmed");
          onSuccess?.();
        } else if (row?.status === "failed" || row?.status === "cancelled") {
          clearInterval(id);
          toast.error(row?.result_desc ?? "Payment was not completed");
          setCheckoutId(null);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(id);
  }, [checkoutId, succeeded, poll, onSuccess]);

  const canSubmit = useMemo(() => phone.replace(/\D/g, "").length >= 9, [phone]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-glow p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary bg-primary-soft px-2 py-1 rounded-full"><Smartphone className="h-3 w-3" /> M-Pesa</div>
            <h3 className="mt-2 text-lg font-bold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Amount: <span className="font-bold text-foreground">KES {amountKes.toLocaleString()}</span></p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        {succeeded ? (
          <div className="mt-6 text-center py-6">
            <CheckCircle2 className="h-14 w-14 mx-auto text-primary" />
            <p className="mt-2 font-semibold">Payment received</p>
            <button onClick={onClose} className="btn-primary btn-primary-hover mt-4">Done</button>
          </div>
        ) : checkoutId ? (
          <div className="mt-6 text-center py-6">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="mt-3 text-sm">Check your phone for the M-Pesa prompt and enter your PIN.</p>
            <p className="text-xs text-muted-foreground mt-1">Waiting for confirmation…</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) start.mutate(phone); }} className="mt-5 space-y-3">
            <label className="block text-sm">
              <span className="font-medium">M-Pesa phone number</span>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX" autoFocus
                className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-field"
              />
              <span className="text-xs text-muted-foreground">Format: 07XX, 01XX, or 2547XX</span>
            </label>
            <button type="submit" disabled={!canSubmit || start.isPending} className="btn-primary btn-primary-hover w-full justify-center">
              {start.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</> : `Pay KES ${amountKes.toLocaleString()}`}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">By continuing you authorise a Lipa Na M-Pesa STK push to the number above.</p>
          </form>
        )}
      </div>
    </div>
  );
}
