import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, isActive, type LeadStatus } from "@/lib/leads";
import { LeadStatusBadge } from "@/components/site/LeadStatusBadge";
import { TrendingUp, Users, CheckCircle2, XCircle, Percent, Clock, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/crm")({
  component: CrmDashboard,
  head: () => ({ meta: [{ title: "CRM Insights — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

type Range = "7" | "30" | "90" | "all";

function CrmDashboard() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [range, setRange] = useState<Range>("30");

  const since = useMemo(() => {
    if (range === "all") return null;
    const d = new Date(); d.setDate(d.getDate() - Number(range));
    return d.toISOString();
  }, [range]);

  const leadsQ = useQuery({
    queryKey: ["crm-leads", user?.id, isAdmin, range],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("leads")
        .select("id, status, assigned_to, deal_value, created_at, won_at, next_follow_up_at, last_contacted_at, contact_name")
        .order("created_at", { ascending: false });
      if (since) q = q.gte("created_at", since);
      if (!isAdmin) q = q.or(`assigned_to.eq.${user!.id},owner_id.eq.${user!.id}`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const followUpsQ = useQuery({
    queryKey: ["crm-followups", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("lead_follow_ups")
        .select("id, lead_id, title, due_at, completed_at, assigned_to")
        .is("completed_at", null).order("due_at", { ascending: true }).limit(20);
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = leadsQ.data ?? [];
    const total = list.length;
    const byStatus: Record<LeadStatus, number> = { new: 0, contacted: 0, qualified: 0, viewing_scheduled: 0, negotiation: 0, won: 0, lost: 0 };
    let dealValue = 0;
    const perAgent: Record<string, { leads: number; won: number; value: number }> = {};
    for (const l of list) {
      byStatus[l.status as LeadStatus]++;
      if (l.status === "won") dealValue += Number(l.deal_value ?? 0);
      const a = l.assigned_to ?? "unassigned";
      perAgent[a] ??= { leads: 0, won: 0, value: 0 };
      perAgent[a].leads++;
      if (l.status === "won") { perAgent[a].won++; perAgent[a].value += Number(l.deal_value ?? 0); }
    }
    const active = list.filter(l => isActive(l.status as LeadStatus)).length;
    const won = byStatus.won;
    const lost = byStatus.lost;
    const closed = won + lost;
    const conversion = closed ? Math.round((won / closed) * 100) : 0;

    // stale = active & last_contacted_at older than 7d (or never contacted, created >7d ago)
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const stale = list.filter(l => {
      if (!isActive(l.status as LeadStatus)) return false;
      const t = l.last_contacted_at ? new Date(l.last_contacted_at).getTime() : new Date(l.created_at).getTime();
      return t < sevenDaysAgo;
    });

    return { total, active, won, lost, conversion, dealValue, byStatus, perAgent, stale };
  }, [leadsQ.data]);

  return (
    <div className="container-page py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <TrendingUp className="h-3.5 w-3.5" /> CRM Insights
          </div>
          <h1 className="text-3xl font-bold mt-2">Pipeline performance</h1>
          <p className="text-sm text-muted-foreground mt-1">Track leads, conversions, and follow-ups.</p>
        </div>
        <div className="inline-flex rounded-full bg-muted p-1 text-xs">
          {(["7", "30", "90", "all"] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1.5 font-semibold ${range === r ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}>
              {r === "all" ? "All" : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Kpi icon={Users} label="Total leads" value={stats.total} color="text-primary" />
        <Kpi icon={Clock} label="Active" value={stats.active} color="text-blue-600" />
        <Kpi icon={CheckCircle2} label="Won" value={stats.won} color="text-emerald-600" />
        <Kpi icon={XCircle} label="Lost" value={stats.lost} color="text-muted-foreground" />
        <Kpi icon={Percent} label="Conversion" value={`${stats.conversion}%`} color="text-secondary" />
      </div>

      {stats.dealValue > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal value (won)</div>
          <div className="text-3xl font-bold mt-1">KES {stats.dealValue.toLocaleString()}</div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Pipeline funnel</h2>
          <div className="space-y-2.5">
            {LEAD_STATUSES.map(s => {
              const n = stats.byStatus[s];
              const pct = stats.total ? (n / stats.total) * 100 : 0;
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <LeadStatusBadge status={s} />
                    <span className="text-muted-foreground">{n} · {Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming follow-ups */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Upcoming follow-ups</h2>
            <Link to="/dashboard/leads" className="text-xs text-primary inline-flex items-center gap-1">All leads <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {followUpsQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : !followUpsQ.data?.length ? <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
              : <ul className="space-y-2">
                {followUpsQ.data.slice(0, 8).map(f => (
                  <li key={f.id} className="flex items-center justify-between gap-3 text-sm rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.title}</div>
                      <div className="text-xs text-muted-foreground">{new Date(f.due_at).toLocaleString()}</div>
                    </div>
                    <Link to="/dashboard/leads/$id" params={{ id: f.lead_id }} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0">Open</Link>
                  </li>
                ))}
              </ul>}
        </div>
      </div>

      {/* Stale leads */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-4">Stale leads <span className="text-xs font-normal text-muted-foreground">(no contact in 7+ days)</span></h2>
        {!stats.stale.length ? <p className="text-sm text-muted-foreground">Great — every active lead was contacted recently.</p>
          : <div className="grid gap-2 sm:grid-cols-2">
            {stats.stale.slice(0, 10).map(l => (
              <Link key={l.id} to="/dashboard/leads/$id" params={{ id: l.id }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:border-primary/40">
                <div>
                  <div className="text-sm font-medium">{l.contact_name}</div>
                  <div className="text-xs text-muted-foreground">Last touch: {l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleDateString() : "never"}</div>
                </div>
                <LeadStatusBadge status={l.status as LeadStatus} />
              </Link>
            ))}
          </div>}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className={`h-5 w-5 ${color}`} />
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
