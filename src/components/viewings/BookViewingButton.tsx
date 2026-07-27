import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, X, Check, Video, MapPin, Users, Loader2, ChevronRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { bookViewing, getBookingContext, getViewingCaptcha } from "@/lib/viewings.functions";
import {
  VIEWING_TYPES, VIEWING_TYPE_LABEL, bookableDays, formatViewingTime, slotsForDay, type ViewingType,
} from "@/lib/viewings";

type Props = {
  propertyId: string;
  propertyTitle: string;
  className?: string;
  label?: string;
};

/** Multi-step "Book a viewing" workflow used on property pages. */
export function BookViewingButton({ propertyId, propertyTitle, className, label = "Book a viewing" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "btn-secondary"}>
        <CalendarClock className="h-4 w-4" /> {label}
      </button>
      {open && <BookingDialog propertyId={propertyId} propertyTitle={propertyTitle} onClose={() => setOpen(false)} />}
    </>
  );
}

function BookingDialog({ propertyId, propertyTitle, onClose }: { propertyId: string; propertyTitle: string; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const load = useServerFn(getBookingContext);
  const book = useServerFn(bookViewing);
  const captchaFn = useServerFn(getViewingCaptcha);

  const [step, setStep] = useState(1);
  const [type, setType] = useState<ViewingType>("in_person");
  const [dayKey, setDayKey] = useState("");
  const [slot, setSlot] = useState("");
  const [visitors, setVisitors] = useState(1);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(user?.user_metadata?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<{ question: string; token: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const ctxQ = useQuery({
    queryKey: ["booking-context", propertyId],
    queryFn: () => load({ data: { propertyId } }),
  });

  const ctx = ctxQ.data;
  const availability = ctx?.availability;
  const days = useMemo(
    () => (availability ? bookableDays(availability, ctx!.bookedTimes) : []),
    [availability, ctx],
  );
  const slots = useMemo(
    () => (availability && dayKey ? slotsForDay(availability, dayKey, ctx!.bookedTimes) : []),
    [availability, dayKey, ctx],
  );

  const openHouseAt = ctx?.property?.open_house_at ?? null;
  const types = VIEWING_TYPES.filter((t) => {
    if (t.value === "open_house") return !!openHouseAt;
    if (t.value === "virtual") return availability?.allow_virtual !== false;
    return availability?.allow_in_person !== false;
  });

  const chosenTime = type === "open_house" ? openHouseAt : slot;

  async function submit() {
    if (!chosenTime) return;
    setBusy(true);
    try {
      const res: any = await book({
        data: {
          propertyId: ctx!.property.id,
          viewingType: type,
          slot: new Date(chosenTime).toISOString(),
          visitorCount: visitors,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim() || undefined,
          captchaToken: captcha?.token,
          captchaAnswer: captchaAnswer || undefined,
        },
      });
      toast.success(`Viewing requested — booking ${res.booking_ref}`);
      onClose();
      navigate({ to: "/dashboard/viewings/$id", params: { id: res.id } });
    } catch (e: any) {
      const msg = e?.message ?? "Could not book the viewing";
      if (msg.startsWith("CAPTCHA_REQUIRED")) {
        const c = await captchaFn();
        setCaptcha(c as any);
        toast.error("Please complete the quick verification below.");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const canStep2 = !!type;
  const canStep3 = type === "open_house" ? !!openHouseAt : !!slot;
  const canStep4 = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && phone.trim().length > 6;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Book a viewing">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Book a viewing</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{propertyTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <ol className="mt-4 flex items-center gap-1 text-[11px] font-semibold">
          {["Type", "Date & time", "Your details", "Confirm"].map((s, i) => (
            <li key={s} className={`flex-1 rounded-full px-2 py-1 text-center ${step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>{s}</li>
          ))}
        </ol>

        {!user ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold">Sign in to book a viewing</p>
            <p className="mt-1 text-sm text-muted-foreground">Bookings are tied to your account so you can track and reschedule them.</p>
            <Link to="/auth" className="btn-primary btn-primary-hover mt-4 inline-flex">Sign in or create an account</Link>
          </div>
        ) : ctxQ.isLoading ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />
        ) : !ctx ? (
          <p className="mt-6 text-sm text-muted-foreground">This listing is not accepting viewings right now.</p>
        ) : (
          <>
            {step === 1 && (
              <div className="mt-5 space-y-3">
                {types.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${type === t.value ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"}`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      {t.value === "virtual" ? <Video className="h-4 w-4" /> : t.value === "open_house" ? <Users className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      {t.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{t.blurb}</span>
                    {t.value === "open_house" && openHouseAt && (
                      <span className="mt-1 block text-xs font-semibold text-primary">{formatViewingTime(openHouseAt)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="mt-5">
                {type === "open_house" ? (
                  <div className="rounded-2xl border border-border p-4 text-sm">
                    <p className="font-semibold">Open house</p>
                    <p className="mt-1 text-muted-foreground">{formatViewingTime(openHouseAt)}</p>
                  </div>
                ) : !days.length ? (
                  <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No slots are currently open. Contact the agent to arrange a suitable viewing time.
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a date</p>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                      {days.map((d) => (
                        <button
                          key={d.key}
                          onClick={() => { setDayKey(d.key); setSlot(""); }}
                          className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${dayKey === d.key ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary/50"}`}
                        >
                          {d.label}
                          <span className="block text-[10px] font-normal text-muted-foreground">{d.slots} slots</span>
                        </button>
                      ))}
                    </div>
                    {dayKey && (
                      <>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a time</p>
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {slots.map((s) => (
                            <button
                              key={s.iso}
                              disabled={!s.available}
                              onClick={() => setSlot(s.iso)}
                              className={`rounded-xl border px-2 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${slot === s.iso ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-primary/50"}`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="mt-5 space-y-3">
                <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} className="input-base" /></Field>
                <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" /></Field>
                <Field label="Phone / WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-base" placeholder="0712345678" /></Field>
                <Field label="Number of visitors">
                  <input type="number" min={1} max={20} value={visitors} onChange={(e) => setVisitors(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="input-base" />
                </Field>
                <Field label="Special requests or notes (optional)">
                  <textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className="input-base" placeholder="e.g. I would like to see the title deed during the viewing." />
                </Field>
              </div>
            )}

            {step === 4 && (
              <div className="mt-5 space-y-3 rounded-2xl border border-border p-4 text-sm">
                <Row label="Property" value={propertyTitle} />
                <Row label="Viewing type" value={VIEWING_TYPE_LABEL[type]} />
                <Row label="Date & time" value={formatViewingTime(chosenTime)} />
                <Row label="Agent" value={ctx.agent?.full_name ?? "Foxwood agent"} />
                {type === "in_person" && (
                  <Row label="Meeting location" value={availability?.default_location || ctx.property.address || [ctx.property.town, ctx.property.county].filter(Boolean).join(", ") || "Shared on confirmation"} />
                )}
                {type === "virtual" && <Row label="Virtual meeting" value="Link shared once the agent confirms" />}
                <Row label="Visitors" value={String(visitors)} />
                <Row label="Contact" value={`${name} · ${email} · ${phone}`} />
                {notes && <Row label="Notes" value={notes} />}

                {captcha && (
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-xs font-semibold">{captcha.question}</p>
                    <input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} className="input-base mt-2 text-sm" placeholder="Answer" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  By confirming you agree to be contacted by the agent about this viewing.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-2">
              <button onClick={() => (step === 1 ? onClose() : setStep(step - 1))} className="btn-ghost">
                {step === 1 ? "Cancel" : "Back"}
              </button>
              {step < 4 ? (
                <button
                  disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3) || (step === 3 && !canStep4)}
                  onClick={() => setStep(step + 1)}
                  className="btn-primary btn-primary-hover disabled:opacity-50"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button disabled={busy} onClick={submit} className="btn-primary btn-primary-hover disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm booking
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value}</span>
    </div>
  );
}
