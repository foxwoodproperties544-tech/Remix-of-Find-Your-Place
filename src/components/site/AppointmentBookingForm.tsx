import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(7, "Phone is required for WhatsApp confirmation").max(20),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  notes: z.string().max(600).optional().or(z.literal("")),
});

export function AppointmentBookingForm({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: user?.email ?? "",
    phone: "",
    date: "",
    time: "10:00",
    notes: `I'd like to book a viewing for "${propertyTitle}".`,
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const iss of parsed.error.issues) errs[iss.path[0] as string] = iss.message;
      setErrors(errs);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});
    const requested_at = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
    if (requested_at.getTime() < Date.now()) {
      toast.error("Pick a future date and time");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("viewings").insert({
        property_id: propertyId,
        requester_id: user?.id ?? null,
        requester_name: parsed.data.name,
        requester_email: parsed.data.email,
        requester_phone: parsed.data.phone,
        requested_at: requested_at.toISOString(),
        notes: parsed.data.notes || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Viewing request sent — the agent will confirm shortly.");
      setForm({ ...form, notes: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = (f: string) => `w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-primary ${errors[f] ? "border-destructive" : "border-border"}`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-3">
      <div>
        <h3 className="font-bold text-sm flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Book a viewing</h3>
        <p className="text-xs text-muted-foreground mt-1">Pick a date and time. The agent will confirm via WhatsApp and email.</p>
      </div>
      <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" className={inputCls("name")} />
      <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className={inputCls("email")} />
      <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone / WhatsApp (e.g. 0712345678)" className={inputCls("phone")} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Date</label>
          <input required type="date" min={today} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={"mt-1 " + inputCls("date")} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Time</label>
          <input required type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className={"mt-1 " + inputCls("time")} />
        </div>
      </div>
      <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Notes (optional)" className={inputCls("notes")} />
      <button disabled={busy} className="btn-primary btn-primary-hover w-full">{busy ? "Sending…" : "Request viewing"}</button>
    </form>
  );
}
