import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Clock, Home, Handshake, Star, ShieldCheck, Zap, CalendarDays, Activity } from "lucide-react";


export type AgentPerf = {
  active_listings: number;
  total_listings: number;
  completed_transactions: number;
  total_leads: number;
  responded_leads: number;
  avg_response_hours: number | null;
  rating: number | null;
  reviews_count: number;
  verified: boolean;
  member_since: string | null;
};

export function useAgentPerformance(agentId?: string | null) {
  return useQuery({
    queryKey: ["agent-performance", agentId],
    enabled: !!agentId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("agent_performance", { _agent_id: agentId! });
      if (error) throw error;
      return data as unknown as AgentPerf;
    },
  });
}

export function agentBadges(p: AgentPerf) {
  const badges: { label: string; icon: any; tone: string }[] = [];
  const responseRate = p.total_leads > 0 ? p.responded_leads / p.total_leads : 0;
  if (p.verified) badges.push({ label: "Foxwood Verified", icon: ShieldCheck, tone: "bg-primary-soft text-primary" });
  if (p.avg_response_hours != null && p.avg_response_hours <= 4)
    badges.push({ label: "Fast Responder", icon: Zap, tone: "bg-secondary/10 text-secondary" });
  if ((p.rating ?? 0) >= 4.5 && p.reviews_count >= 3)
    badges.push({ label: "Trusted Agent", icon: Award, tone: "bg-primary-soft text-primary" });
  if (p.completed_transactions >= 5 || (p.active_listings >= 10 && responseRate >= 0.8))
    badges.push({ label: "Top Performer", icon: Star, tone: "bg-secondary/10 text-secondary" });
  return badges;
}

function years(since?: string | null) {
  if (!since) return null;
  const y = (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24 * 365);
  return y < 1 ? "<1" : Math.floor(y).toString();
}

/** Last public activity = most recent listing publish/update by this agent. */
export function useAgentLastActive(agentId?: string | null) {
  return useQuery({
    queryKey: ["agent-last-active", agentId],
    enabled: !!agentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("published_at, last_confirmed_at, updated_at")
        .eq("owner_id", agentId!)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      const times = [data.last_confirmed_at, data.published_at, data.updated_at]
        .filter(Boolean)
        .map((t) => new Date(t as string).getTime());
      return times.length ? new Date(Math.max(...times)).toISOString() : null;
    },
  });
}

export function relativeActivity(iso?: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Active today";
  if (days === 1) return "Active yesterday";
  if (days < 7) return `Active ${days} days ago`;
  if (days < 14) return "Active last week";
  if (days < 60) return `Active ${Math.floor(days / 7)} weeks ago`;
  return `Active ${Math.floor(days / 30)} months ago`;
}

export function formatResponseTime(hours?: number | null) {
  if (hours == null) return null;
  if (hours < 1) return "Replies in under an hour";
  if (hours <= 4) return `Replies in ~${Math.round(hours)}h`;
  if (hours <= 24) return `Replies within ${Math.round(hours)}h`;
  const d = Math.round(hours / 24);
  return `Replies in ~${d} day${d === 1 ? "" : "s"}`;
}

/** Compact trust badges: typical response time + last activity. */
export function AgentActivityBadges({ agentId, className = "" }: { agentId: string; className?: string }) {
  const { data: perf } = useAgentPerformance(agentId);
  const { data: lastActive } = useAgentLastActive(agentId);
  const response = formatResponseTime(perf?.avg_response_hours ?? null);
  const active = relativeActivity(lastActive);
  if (!response && !active) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {response && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
          <Clock className="h-3.5 w-3.5" /> {response}
        </span>
      )}
      {active && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          <Activity className="h-3.5 w-3.5" /> {active}
        </span>
      )}
    </div>
  );
}


export function AgentPerformanceCard({ agentId }: { agentId: string }) {
  const { data } = useAgentPerformance(agentId);
  if (!data) return null;
  const responseRate = data.total_leads > 0 ? Math.round((data.responded_leads / data.total_leads) * 100) : null;
  const badges = agentBadges(data);

  const stats = [
    { label: "Active listings", value: String(data.active_listings), icon: Home },
    { label: "Deals completed", value: String(data.completed_transactions), icon: Handshake },
    { label: "Avg. response", value: data.avg_response_hours != null ? `${data.avg_response_hours}h` : "—", icon: Clock },
    { label: "Response rate", value: responseRate != null ? `${responseRate}%` : "—", icon: Zap },
    { label: "Customer rating", value: data.rating != null ? `${data.rating}/5` : "—", icon: Star },
    { label: "Years on Foxwood", value: years(data.member_since) ?? "—", icon: CalendarDays },
  ];

  return (
    <section aria-labelledby="agent-performance" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="agent-performance" className="text-xl font-bold flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" /> Agent performance
      </h2>

      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b.label} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${b.tone}`}>
              <b.icon className="h-3.5 w-3.5" /> {b.label}
            </span>
          ))}
        </div>
      )}

      <dl className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-background p-3">
            <dt className="flex items-center gap-1.5 text-[11px] uppercase font-semibold text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </dt>
            <dd className="mt-1 text-xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>
      {data.reviews_count > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Based on {data.reviews_count} customer review{data.reviews_count === 1 ? "" : "s"}.</p>
      )}
    </section>
  );
}
