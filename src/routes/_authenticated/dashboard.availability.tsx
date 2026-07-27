import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarCog, Loader2, Save, Trash2, Plus } from "lucide-react";
import { getMyAvailability, saveAvailability } from "@/lib/viewings.functions";
import { DAY_LABELS, DEFAULT_AVAILABILITY, type Availability } from "@/lib/viewings";

export const Route = createFileRoute("/_authenticated/dashboard/availability")({
  head: () => ({
    meta: [
      { title: "Viewing availability — Foxwood Properties" },
      { name: "description", content: "Set your working days, viewing slot length, buffers, daily limits and blocked dates so buyers only book times that work for you." },
      { property: "og:title", content: "Viewing availability | Foxwood Properties" },
      { property: "og:description", content: "Control when buyers can book property viewings with you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AvailabilityPage,
});

function AvailabilityPage() {
  const load = useServerFn(getMyAvailability);
  const save = useServerFn(saveAvailability);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["my-availability"], queryFn: () => load() as Promise<Availability> });
  const [form, setForm] = useState<Availability | null>(null);
  const [newDate, setNewDate] = useState("");

  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  const mut = useMutation({
    mutationFn: () => {
      const f = form!;
      return save({
        data: {
          working_days: f.working_days,
          start_time: f.start_time.slice(0, 5),
          end_time: f.end_time.slice(0, 5),
          slot_minutes: f.slot_minutes,
          buffer_minutes: f.buffer_minutes,
          max_per_day: f.max_per_day,
          lead_time_hours: f.lead_time_hours,
          horizon_days: f.horizon_days,
          blocked_dates: f.blocked_dates,
          block_public_holidays: f.block_public_holidays,
          allow_virtual: f.allow_virtual,
          allow_in_person: f.allow_in_person,
          default_location: f.default_location ?? null,
        },
      });
    },
    onSuccess: () => { toast.success("Availability saved"); qc.invalidateQueries({ queryKey: ["my-availability"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  if (q.isLoading || !form) return <div className="p-8"><div className="h-64 animate-pulse rounded-2xl bg-muted" /></div>;

  const set = <K extends keyof Availability>(k: K, v: Availability[K]) => setForm({ ...form, [k]: v });
  const toggleDay = (d: number) =>
    set("working_days", form.working_days.includes(d) ? form.working_days.filter((x) => x !== d) : [...form.working_days, d].sort());

  return (
    <div className="container-page py-10">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
        <CalendarCog className="h-3.5 w-3.5" /> Availability
      </div>
      <h1 className="mt-2 text-3xl font-bold">Viewing availability</h1>
      <p className="mt-1 text-sm text-muted-foreground">Buyers can only pick slots that match these rules, so you never get double-booked.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Working days</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {DAY_LABELS.map((d, i) => (
              <button
                key={d}
                onClick={() => toggleDay(i)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${form.working_days.includes(i) ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}
              >{d}</button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Start time"><input type="time" value={form.start_time.slice(0, 5)} onChange={(e) => set("start_time", e.target.value)} className="input-base" /></Field>
            <Field label="End time"><input type="time" value={form.end_time.slice(0, 5)} onChange={(e) => set("end_time", e.target.value)} className="input-base" /></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Slots & limits</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Slot length (min)"><input type="number" min={15} max={240} value={form.slot_minutes} onChange={(e) => set("slot_minutes", Number(e.target.value) || 30)} className="input-base" /></Field>
            <Field label="Buffer between viewings (min)"><input type="number" min={0} max={120} value={form.buffer_minutes} onChange={(e) => set("buffer_minutes", Number(e.target.value) || 0)} className="input-base" /></Field>
            <Field label="Max viewings per day"><input type="number" min={1} max={30} value={form.max_per_day} onChange={(e) => set("max_per_day", Number(e.target.value) || 1)} className="input-base" /></Field>
            <Field label="Minimum notice (hours)"><input type="number" min={0} max={168} value={form.lead_time_hours} onChange={(e) => set("lead_time_hours", Number(e.target.value) || 0)} className="input-base" /></Field>
            <Field label="Booking window (days ahead)"><input type="number" min={1} max={120} value={form.horizon_days} onChange={(e) => set("horizon_days", Number(e.target.value) || 30)} className="input-base" /></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Viewing types</h2>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_in_person} onChange={(e) => set("allow_in_person", e.target.checked)} /> Accept in-person viewings</label>
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allow_virtual} onChange={(e) => set("allow_virtual", e.target.checked)} /> Accept virtual viewings</label>
          <Field label="Default meeting point">
            <input value={form.default_location ?? ""} onChange={(e) => set("default_location", e.target.value)} className="input-base" placeholder="e.g. Shell petrol station, Kitengela" />
          </Field>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Blocked dates</h2>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.block_public_holidays} onChange={(e) => set("block_public_holidays", e.target.checked)} /> Block Kenyan public holidays
          </label>
          <div className="mt-3 flex gap-2">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input-base" />
            <button
              onClick={() => { if (newDate && !form.blocked_dates.includes(newDate)) set("blocked_dates", [...form.blocked_dates, newDate].sort()); setNewDate(""); }}
              className="btn-secondary shrink-0"
            ><Plus className="h-4 w-4" /> Block</button>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {form.blocked_dates.map((d) => (
              <li key={d} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                {d}
                <button onClick={() => set("blocked_dates", form.blocked_dates.filter((x) => x !== d))} aria-label={`Unblock ${d}`}><Trash2 className="h-3 w-3 text-destructive" /></button>
              </li>
            ))}
            {!form.blocked_dates.length && <li className="text-xs text-muted-foreground">No blocked dates.</li>}
          </ul>
        </section>
      </div>

      <div className="mt-6 flex gap-2">
        <button disabled={mut.isPending} onClick={() => mut.mutate()} className="btn-primary btn-primary-hover disabled:opacity-50">
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save availability
        </button>
        <button onClick={() => setForm({ ...form, ...DEFAULT_AVAILABILITY })} className="btn-ghost">Reset to defaults</button>
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
