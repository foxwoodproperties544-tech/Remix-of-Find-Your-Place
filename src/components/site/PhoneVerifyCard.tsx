import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Phone, ShieldCheck, Loader2 } from "lucide-react";
import { savePhoneNumber, getPhoneVerifyStatus } from "@/lib/phone-verify.functions";
import { normalizePhone, validatePhone } from "@/lib/phone";

export function PhoneVerifyCard() {
  const qc = useQueryClient();
  const saveFn = useServerFn(savePhoneNumber);
  const statusFn = useServerFn(getPhoneVerifyStatus);

  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["phone-verify-status"],
    queryFn: () => statusFn({}),
  });

  const save = useMutation({
    mutationFn: (p: string) => saveFn({ data: { phone: normalizePhone(p) } }),
    onSuccess: (res: any) => {
      toast.success(`Phone number saved — ${res?.phone ?? ""}`.trim());
      setEditing(false);
      setPhone("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["phone-verify-status"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => {
      const msg = e?.message ?? "Could not save phone number";
      setError(msg);
      toast.error(msg);
    },
  });

  function submit() {
    const invalid = validatePhone(phone);
    if (invalid) {
      setError(invalid);
      toast.error(invalid);
      return;
    }
    setError(null);
    save.mutate(phone);
  }

  const saved = !!status.data?.phone_verified;
  const currentPhone = status.data?.phone as string | null | undefined;
  const showForm = !saved || editing;


  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${saved ? "bg-primary-soft text-primary" : "bg-secondary/10 text-secondary"}`}>
            {saved ? <ShieldCheck className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-sm">Phone number</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {saved
                ? <>On file: <span className="font-medium text-foreground">{currentPhone}</span></>
                : "Add your phone number so buyers and agents can reach you."}
            </p>
          </div>
        </div>
        {saved && !editing && (
          <button onClick={() => { setEditing(true); setPhone(currentPhone ?? ""); }} className="btn-ghost text-sm">
            Change number
          </button>
        )}
      </div>

      {showForm && (
        <>
          <div className="mt-4 flex gap-2 flex-wrap">
            <input
              value={phone}
              onChange={e => { setPhone(e.target.value); if (error) setError(null); }}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              aria-label="Phone number"
              aria-invalid={!!error}
              placeholder="+254712345678"
              className={`flex-1 min-w-[200px] rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary ${error ? "border-destructive" : "border-border"}`}
            />
            <button
              onClick={submit}
              disabled={save.isPending || phone.trim().length < 7}
              className="btn-primary btn-primary-hover"
            >
              {save.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save number"}
            </button>
            {editing && (
              <button onClick={() => { setEditing(false); setPhone(""); setError(null); }} className="btn-ghost text-sm">
                Cancel
              </button>
            )}
          </div>
          {error
            ? <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>
            : <p className="mt-2 text-xs text-muted-foreground">Use international format, e.g. +254712345678.</p>}
        </>
      )}

    </section>
  );
}
