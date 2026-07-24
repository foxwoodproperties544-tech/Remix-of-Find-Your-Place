import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Phone, ShieldCheck, Loader2 } from "lucide-react";
import { sendPhoneOtp, verifyPhoneOtp, getPhoneVerifyStatus } from "@/lib/phone-verify.functions";

export function PhoneVerifyCard() {
  const qc = useQueryClient();
  const sendFn = useServerFn(sendPhoneOtp);
  const verifyFn = useServerFn(verifyPhoneOtp);
  const statusFn = useServerFn(getPhoneVerifyStatus);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  const status = useQuery({
    queryKey: ["phone-verify-status"],
    queryFn: () => statusFn({}),
  });

  const send = useMutation({
    mutationFn: (p: string) => sendFn({ data: { phone: p } }),
    onSuccess: () => { toast.success("Code sent via SMS"); setSent(true); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send code"),
  });

  const verify = useMutation({
    mutationFn: (c: string) => verifyFn({ data: { code: c } }),
    onSuccess: () => {
      toast.success("Phone verified 🎉");
      setSent(false); setCode("");
      qc.invalidateQueries({ queryKey: ["phone-verify-status"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Invalid code"),
  });

  const verified = !!status.data?.phone_verified;
  const currentPhone = status.data?.phone as string | null | undefined;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${verified ? "bg-primary-soft text-primary" : "bg-secondary/10 text-secondary"}`}>
            {verified ? <ShieldCheck className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-sm">Phone verification</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {verified
                ? <>Verified: <span className="font-medium text-foreground">{currentPhone}</span></>
                : "Verify your Kenyan phone number to earn a trust badge."}
            </p>
          </div>
        </div>
        {verified && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft rounded-full px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
      </div>

      {!verified && (
        <div className="mt-4 space-y-3">
          {!sent ? (
            <div className="flex gap-2 flex-wrap">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+254712345678"
                className="flex-1 min-w-[200px] rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => send.mutate(phone)}
                disabled={send.isPending || phone.length < 7}
                className="btn-primary btn-primary-hover"
              >
                {send.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send code"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                className="flex-1 min-w-[160px] rounded-xl border border-border px-4 py-2.5 text-sm tracking-widest font-mono outline-none focus:border-primary"
              />
              <button
                onClick={() => verify.mutate(code)}
                disabled={verify.isPending || code.length !== 6}
                className="btn-primary btn-primary-hover"
              >
                {verify.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : "Verify"}
              </button>
              <button onClick={() => { setSent(false); setCode(""); }} className="btn-ghost text-sm">
                Change number
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
