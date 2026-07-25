import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Clock, Radio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings/support")({
  component: SupportSettings,
  head: () => ({ meta: [{ title: "Support settings — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

const DAYS = [
  { v: 0, l: "Sun" }, { v: 1, l: "Mon" }, { v: 2, l: "Tue" }, { v: 3, l: "Wed" },
  { v: 4, l: "Thu" }, { v: 5, l: "Fri" }, { v: 6, l: "Sat" },
];

function SupportSettings() {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [override, setOverride] = useState<"auto" | "online" | "offline">("auto");

  useEffect(() => {
    if (!rolesLoading && !isAdmin) nav({ to: "/dashboard" });
  }, [rolesLoading, isAdmin, nav]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_settings").select("key, value").in("key", ["support_hours", "support_online_override"]);
      (data ?? []).forEach((row: any) => {
        if (row.key === "support_hours") {
          setStart(row.value?.start ?? "08:00");
          setEnd(row.value?.end ?? "18:00");
          setDays(row.value?.days ?? [1, 2, 3, 4, 5, 6]);
          setTimezone(row.value?.timezone ?? "Africa/Nairobi");
        }
        if (row.key === "support_online_override") setOverride(row.value?.mode ?? "auto");
      });
      setLoading(false);
    })();
  }, []);

  const toggleDay = (d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const save = async () => {
    setSaving(true);
    const rows = [
      { key: "support_hours", value: { start, end, days, timezone } },
      { key: "support_online_override", value: { mode: override } },
    ];
    for (const r of rows) {
      const { error } = await supabase.from("platform_settings").upsert(r, { onConflict: "key" });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    setSaving(false);
    toast.success("Support settings saved");
  };

  if (rolesLoading || !isAdmin || loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Support settings</h1>
        <p className="text-sm text-muted-foreground">Controls when the live chat widget shows agents as online.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="h-4 w-4" />
          <h2 className="font-bold">Availability mode</h2>
        </div>
        <div className="grid gap-2">
          {[
            { v: "auto", t: "Auto (based on business hours)", d: "Use the schedule below to decide when live chat is on." },
            { v: "online", t: "Force online", d: "Always show the chat as available, overriding the schedule." },
            { v: "offline", t: "Force offline", d: "Hide live chat and show WhatsApp / ticket fallbacks even during hours." },
          ].map((o) => (
            <label key={o.v} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${override === o.v ? "border-primary bg-primary-soft/40" : "border-border hover:bg-muted/40"}`}>
              <input type="radio" name="override" checked={override === o.v} onChange={() => setOverride(o.v as any)} className="mt-1" />
              <div>
                <div className="text-sm font-semibold">{o.t}</div>
                <div className="text-xs text-muted-foreground">{o.d}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <Clock className="h-4 w-4" />
          <h2 className="font-bold">Business hours</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Working days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = days.includes(d.v);
              return (
                <button key={d.v} type="button" onClick={() => toggleDay(d.v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {d.l}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timezone</label>
          <input value={timezone} onChange={(e) => setTimezone(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Africa/Nairobi" />
          <div className="text-[11px] text-muted-foreground">Standard IANA name. Currently used only for display.</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary btn-primary-hover">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </div>
    </div>
  );
}
