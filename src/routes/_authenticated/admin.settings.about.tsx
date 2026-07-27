import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { Loader2, Save, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings/about")({
  component: AboutStatsSettings,
  head: () => ({ meta: [{ title: "About page stats — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

type Stat = { label: string; value: number; suffix: string };

const DEFAULTS: Stat[] = [
  { label: "Properties listed", value: 1200, suffix: "+" },
  { label: "Counties covered", value: 47, suffix: "" },
  { label: "Trusted agents", value: 180, suffix: "+" },
  { label: "Happy customers", value: 3500, suffix: "+" },
  { label: "Successful connections", value: 5200, suffix: "+" },
  { label: "Monthly visitors", value: 42000, suffix: "+" },
];

function AboutStatsSettings() {
  const { isAdmin, loading: rolesLoading } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stat[]>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "about_stats").maybeSingle();
      const items = (data?.value as any)?.items;
      if (Array.isArray(items) && items.length) setStats(items as Stat[]);
      setLoading(false);
    })();
  }, []);

  const update = (i: number, patch: Partial<Stat>) =>
    setStats((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "about_stats", value: { items: stats } as any }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("About page stats saved");
  };

  if (rolesLoading || !isAdmin || loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">About page stats</h1>
        <p className="text-sm text-muted-foreground">These counters appear in the “Our numbers” section of the About Us page.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <BarChart3 className="h-4 w-4" />
          <h2 className="font-bold">Counters</h2>
        </div>
        {stats.map((s, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_90px]">
            <input
              value={s.label}
              onChange={(e) => update(i, { label: e.target.value })}
              aria-label={`Stat ${i + 1} label`}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Label"
            />
            <input
              type="number"
              value={s.value}
              onChange={(e) => update(i, { value: Number(e.target.value) })}
              aria-label={`Stat ${i + 1} value`}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={s.suffix}
              onChange={(e) => update(i, { suffix: e.target.value })}
              aria-label={`Stat ${i + 1} suffix`}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="+"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary btn-primary-hover">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </div>
    </div>
  );
}
