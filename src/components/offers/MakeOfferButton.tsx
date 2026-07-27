import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { X, Handshake, ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { OfferPriceHistoryContext } from "./OfferPriceHistoryContext";
import { formatKsh } from "@/lib/mock-data";
import { submitOffer, getOfferCaptcha } from "@/lib/offers.functions";
import { TIMELINES, priceDiff } from "@/lib/offers";

interface Props {
  propertyId: string;
  propertyTitle: string;
  askingPrice: number;
  category: string;
  className?: string;
}

export function MakeOfferButton({ propertyId, propertyTitle, askingPrice, category, className }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["offer-settings-public"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "offers").maybeSingle();
      return (data?.value as any) ?? { enabled: true, allow_rentals: false };
    },
  });

  const isSale = (category ?? "").toLowerCase().includes("sale");
  const enabled = settings?.enabled !== false && (isSale || settings?.allow_rentals === true);
  if (!enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "btn-secondary"}
        aria-haspopup="dialog"
      >
        <Handshake className="h-4 w-4" /> Make an offer
      </button>
      {open && (
        <OfferDialog
          onClose={() => setOpen(false)}
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          askingPrice={askingPrice}
          signedIn={!!user}
        />
      )}
    </>
  );
}

function OfferDialog({
  onClose, propertyId, propertyTitle, askingPrice, signedIn,
}: { onClose: () => void; propertyId: string; propertyTitle: string; askingPrice: number; signedIn: boolean }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState<string>(String(askingPrice || ""));
  const [currency] = useState("KES");
  const [message, setMessage] = useState("");
  const [timeline, setTimeline] = useState<(typeof TIMELINES)[number]["value"]>("within_30");
  const [needsMortgage, setNeedsMortgage] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [cashBuyer, setCashBuyer] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setName(data.full_name);
        if (data?.phone) setPhone(data.phone);
      });
  }, [user]);

  const numericAmount = Number(String(amount).replace(/[^\d.]/g, "")) || 0;
  const diff = useMemo(() => priceDiff(askingPrice, numericAmount), [askingPrice, numericAmount]);

  const [captcha, setCaptcha] = useState<{ question: string; token: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const loadCaptcha = useServerFn(getOfferCaptcha);

  const send = useServerFn(submitOffer);
  const mut = useMutation({
    mutationFn: () =>
      send({
        data: {
          propertyId,
          amount: numericAmount,
          currency,
          message: message.trim() || undefined,
          timeline,
          needsMortgage,
          hasViewed,
          cashBuyer,
          buyerName: name.trim(),
          buyerEmail: email.trim(),
          buyerPhone: phone.trim(),
          acceptTerms: true as const,
          captchaToken: captcha?.token,
          captchaAnswer: captchaAnswer.trim() || undefined,
        },
      }),
    onSuccess: (o: any) => {
      setDone(o.id);
      toast.success(`Offer ${o.offer_ref} sent to the seller`);
    },
    onError: async (e: any) => {
      const msg = String(e?.message ?? "Could not submit offer");
      if (msg.includes("CAPTCHA_REQUIRED")) {
        setCaptchaAnswer("");
        try {
          setCaptcha((await loadCaptcha({})) as { question: string; token: string });
        } catch {
          /* ignore */
        }
        toast.error("Too many offers submitted — please complete the quick verification.");
        return;
      }
      toast.error(msg);
    },
  });

  const canNext1 = numericAmount > 0;
  const canNext2 = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && phone.trim().length > 6;


  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Make an offer">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-6 shadow-lift sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Make an offer</h2>
            <p className="text-xs text-muted-foreground line-clamp-1">{propertyTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {!signedIn ? (
          <div className="mt-6 space-y-4 text-sm">
            <p className="text-muted-foreground">You need an account to make an offer — this keeps the negotiation secure and traceable for both sides.</p>
            <Link to="/auth" className="btn-primary w-full justify-center">Sign in to make an offer</Link>
          </div>
        ) : done ? (
          <div className="mt-6 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="h-6 w-6" /></div>
            <p className="font-semibold">Your offer is on its way</p>
            <p className="text-sm text-muted-foreground">The seller and assigned agent have been notified. Track replies and counter offers in your Offer Center.</p>
            <Link to="/dashboard/offers/$id" params={{ id: done }} className="btn-primary w-full justify-center" onClick={onClose}>Open my offer</Link>
            <button onClick={onClose} className="btn-ghost w-full justify-center">Close</button>
          </div>
        ) : (
          <>
            <ol className="mt-4 flex items-center gap-2 text-xs">
              {["Offer", "Your details", "Review"].map((s, i) => (
                <li key={s} className={`flex-1 rounded-full px-3 py-1 text-center font-medium ${step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}. {s}</li>
              ))}
            </ol>

            {step === 1 && (
              <div className="mt-5 space-y-4 text-sm">
                <div className="rounded-xl bg-muted/60 p-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Asking price</span><span className="font-semibold">{formatKsh(askingPrice)}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Difference</span><span className={`font-semibold ${diff.tone}`}>{numericAmount ? diff.label : "—"}</span></div>
                </div>
                <OfferPriceHistoryContext propertyId={propertyId} currentPrice={askingPrice} />
                <Field label="Your offer">
                  <div className="flex gap-2">
                    <span className="inline-flex items-center rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground">{currency}</span>
                    <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-base flex-1" placeholder="e.g. 8500000" />
                  </div>
                </Field>
                <Field label="Message to seller (optional)">
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={3} className="input-base" placeholder="Anything that supports your offer…" />
                </Field>
                <Field label="Preferred completion timeline">
                  <select value={timeline} onChange={(e) => setTimeline(e.target.value as any)} className="input-base">
                    {TIMELINES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <div className="grid gap-2">
                  <Toggle label="Need mortgage financing?" checked={needsMortgage} onChange={setNeedsMortgage} />
                  <Toggle label="Have you viewed the property?" checked={hasViewed} onChange={setHasViewed} />
                  <Toggle label="Cash buyer?" checked={cashBuyer} onChange={setCashBuyer} />
                </div>
                <div className="flex justify-end">
                  <button disabled={!canNext1} onClick={() => setStep(2)} className="btn-primary disabled:opacity-50">Continue <ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-5 space-y-4 text-sm">
                <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="input-base" /></Field>
                <Field label="Email address"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className="input-base" /></Field>
                <Field label="Phone number"><input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} className="input-base" /></Field>
                <p className="text-xs text-muted-foreground">These details are shared only with the seller, assigned agent and Foxwood admins.</p>
                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="btn-ghost"><ChevronLeft className="h-4 w-4" /> Back</button>
                  <button disabled={!canNext2} onClick={() => setStep(3)} className="btn-primary disabled:opacity-50">Review <ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-5 space-y-4 text-sm">
                <dl className="rounded-xl border border-border p-4 space-y-2">
                  <Row label="Property" value={propertyTitle} />
                  <Row label="Asking price" value={formatKsh(askingPrice)} />
                  <Row label="Your offer" value={`${currency} ${numericAmount.toLocaleString()}`} />
                  <Row label="Difference" value={diff.label} />
                  <Row label="Timeline" value={TIMELINES.find((t) => t.value === timeline)!.label} />
                  <Row label="Cash buyer" value={cashBuyer ? "Yes" : "No"} />
                  <Row label="Mortgage needed" value={needsMortgage ? "Yes" : "No"} />
                  <Row label="Viewed property" value={hasViewed ? "Yes" : "No"} />
                  <Row label="Buyer" value={`${name} · ${email} · ${phone}`} />
                  {message && <Row label="Message" value={message} />}
                </dl>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
                  <span className="text-xs text-muted-foreground">
                    I confirm this offer is genuine and I accept the Foxwood Properties <Link to="/terms" className="text-primary underline">Terms</Link> and <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>. Offers are not legally binding until a sale agreement is signed.
                  </span>
                </label>
                {captcha && (
                  <div className="space-y-2 rounded-xl border border-secondary/40 bg-secondary/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Spam check</p>
                    <p className="text-sm">{captcha.question}</p>
                    <div className="flex gap-2">
                      <input
                        inputMode="numeric"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        className="input-base flex-1"
                        placeholder="Your answer"
                        aria-label="CAPTCHA answer"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          setCaptchaAnswer("");
                          setCaptcha((await loadCaptcha({})) as { question: string; token: string });
                        }}
                        className="btn-ghost text-xs"
                      >
                        New question
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="btn-ghost"><ChevronLeft className="h-4 w-4" /> Back</button>
                  <button disabled={!terms || mut.isPending || (!!captcha && !captchaAnswer.trim())} onClick={() => mut.mutate()} className="btn-primary disabled:opacity-50">
                    {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />} Submit offer
                  </button>
                </div>

              </div>
            )}
          </>
        )}
      </div>
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
    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
