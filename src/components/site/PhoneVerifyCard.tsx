import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Phone, ShieldCheck, Loader2 } from "lucide-react";
import { savePhoneNumber, getPhoneVerifyStatus } from "@/lib/phone-verify.functions";

export function PhoneVerifyCard() {
  const qc = useQueryClient();
  const saveFn = useServerFn(savePhoneNumber);
  const statusFn = useServerFn(getPhoneVerifyStatus);

  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);

  const status = useQuery({
    queryKey: ["phone-verify-status"],
    queryFn: () => statusFn({}),
  });

  const save = useMutation({
    mutationFn: (p: string) => saveFn({ data: { phone: p } }),
    onSuccess: () => {
      toast.success("Phone number saved");
      setEditing(false);
      setPhone("");
      qc.invalidateQueries({ queryKey: ["phone-verify-status"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save phone number"),
  });

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
        <div className="mt-4 flex gap-2 flex-wrap">
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+254712345678"
            className="flex-1 min-w-[200px] rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => save.mutate(phone)}
            disabled={save.isPending || phone.trim().length < 7}
            className="btn-primary btn-primary-hover"
          >
            {save.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save number"}
          </button>
          {editing && (
            <button onClick={() => { setEditing(false); setPhone(""); }} className="btn-ghost text-sm">
              Cancel
            </button>
          )}
        </div>
      )}
    </section>
  );
}
