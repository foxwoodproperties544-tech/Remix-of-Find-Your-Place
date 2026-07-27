import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CalendarPlus, Home, CheckCircle2, Timer, MapPin, Building2 } from "lucide-react";

interface Stats {
  active: number;
  today: number;
  matched: number;
  successful: number;
  avgResponseHours: number | null;
  topCounties: { name: string; count: number }[];
  topTypes: { name: string; count: number }[];
}

async function loadStats(): Promise<Stats> {
  const { data } = await supabase
    .from("property_requests" as any)
    .select("county, property_type, status, created_at, published_at, response_count")
    .limit(5000);
  const rows = (data ?? []) as any[];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const active = rows.filter((r) => r.status === "active").length;
  const today = rows.filter((r) => new Date(r.created_at) >= startOfDay).length;
  const matched = rows.reduce((s, r) => s + (r.response_count ?? 0), 0);
  const successful = rows.filter((r) => r.status === "fulfilled").length;

  const tally = (key: string) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = r[key];
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  };

  return {
    active,
    today,
    matched,
    successful,
    avgResponseHours: null,
    topCounties: tally("county"),
    topTypes: tally("property_type"),
  };
}

export function RequestStats() {
  const { data } = useQuery({ queryKey: ["request-stats"], queryFn: loadStats, staleTime: 120_000 });
  if (!data) return null;

  const cards = [
    { icon: Activity, label: "Active requests", value: data.active },
    { icon: CalendarPlus, label: "Requests today", value: data.today },
    { icon: Home, label: "Properties matched", value: data.matched },
    { icon: CheckCircle2, label: "Successful matches", value: data.successful },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
              <span>
                <span className="block text-xl font-bold">{c.value}</span>
                <span className="block text-xs text-muted-foreground">{c.label}</span>
              </span>
            </div>
          );
        })}
      </div>
      {(data.topCounties.length > 0 || data.topTypes.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TagList icon={MapPin} title="Most requested counties" items={data.topCounties} />
          <TagList icon={Building2} title="Most requested property types" items={data.topTypes} />
        </div>
      )}
    </div>
  );
}

function TagList({ icon: Icon, title, items }: { icon: any; title: string; items: { name: string; count: number }[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" /> {title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i) => (
          <span key={i.name} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{i.name} · {i.count}</span>
        ))}
      </div>
    </div>
  );
}

export { Timer };
