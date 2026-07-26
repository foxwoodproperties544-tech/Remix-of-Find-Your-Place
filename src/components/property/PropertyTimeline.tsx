import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UUID_RE } from "@/lib/scoring";
import {
  History, PlusCircle, BadgeCheck, TrendingDown, Images, RefreshCw, Star, Eye, Heart, Activity,
} from "lucide-react";

const ICONS: Record<string, any> = {
  created: PlusCircle,
  published: BadgeCheck,
  price_change: TrendingDown,
  photos_updated: Images,
  status_change: Activity,
  renewed: RefreshCw,
  featured: Star,
};

interface Props {
  propertyId: string;
  propertyKey: string;
}

/** Chronological property history timeline with view/save counters. */
export function PropertyTimeline({ propertyId, propertyKey }: Props) {
  const enabled = UUID_RE.test(propertyId);
  const { data } = useQuery({
    queryKey: ["property-timeline", propertyId, propertyKey],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const [events, views, saves] = await Promise.all([
        supabase
          .from("property_events")
          .select("id, type, title, detail, created_at")
          .eq("property_id", propertyId)
          .order("created_at", { ascending: true }),
        supabase.from("property_views").select("id", { count: "exact", head: true }).eq("property_key", propertyKey),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("property_key", propertyKey),
      ]);
      return {
        events: (events.data ?? []) as any[],
        views: views.count ?? 0,
        saves: saves.count ?? 0,
      };
    },
  });

  if (!enabled || !data || data.events.length === 0) return null;

  return (
    <section aria-labelledby="property-history" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h2 id="property-history" className="text-xl font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Property history
        </h2>
        <div className="flex gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold">
            <Eye className="h-3.5 w-3.5" /> {data.views} views
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold">
            <Heart className="h-3.5 w-3.5" /> {data.saves} saves
          </span>
        </div>
      </div>

      <ol className="mt-4 relative border-l border-border pl-5 space-y-4">
        {data.events.map((e) => {
          const Icon = ICONS[e.type] ?? Activity;
          return (
            <li key={e.id} className="relative">
              <span className="absolute -left-[30px] grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-primary" aria-hidden="true">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="text-sm font-semibold">{e.title}</div>
              {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
              <time className="text-[11px] text-muted-foreground" dateTime={e.created_at}>
                {new Date(e.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </time>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
