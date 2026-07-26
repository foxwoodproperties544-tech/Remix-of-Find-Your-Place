import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { confirmListingFreshness, FRESHNESS_DAYS } from "@/lib/listing-freshness.functions";
import { CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function daysSinceConfirmed(p: {
  last_confirmed_at?: string | null;
  published_at?: string | null;
  created_at?: string | null;
}): number {
  const src = p.last_confirmed_at ?? p.published_at ?? p.created_at;
  if (!src) return 0;
  return Math.floor((Date.now() - new Date(src).getTime()) / 86400_000);
}

export function isStale(p: Parameters<typeof daysSinceConfirmed>[0] & { status?: string }): boolean {
  return p.status === "published" && daysSinceConfirmed(p) >= FRESHNESS_DAYS;
}

/** Prompt shown on stale published listings so owners confirm availability. */
export function FreshnessPrompt({ property }: { property: any }) {
  const qc = useQueryClient();
  const confirmFn = useServerFn(confirmListingFreshness);

  const act = useMutation({
    mutationFn: (stillAvailable: boolean) =>
      confirmFn({ data: { propertyId: property.id, stillAvailable } }),
    onSuccess: (_d, stillAvailable) => {
      toast.success(stillAvailable ? "Thanks — listing confirmed as available" : "Listing archived");
      qc.invalidateQueries({ queryKey: ["my-properties"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update listing"),
  });

  const days = daysSinceConfirmed(property);

  return (
    <div className="mt-3 rounded-xl border border-secondary/40 bg-secondary/5 p-3">
      <div className="flex items-start gap-2">
        <CalendarCheck className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">Is this still available?</p>
          <p className="text-xs text-muted-foreground">
            Not confirmed for {days} days. Confirmed listings rank higher and keep buyer trust.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => act.mutate(true)}
            disabled={act.isPending}
            className="btn-primary btn-primary-hover text-xs !px-3 !py-1.5"
          >
            {act.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Still available
          </button>
          <button
            onClick={() => confirm("Archive this listing? It will no longer appear in search.") && act.mutate(false)}
            disabled={act.isPending}
            className="btn-ghost text-xs !px-3 !py-1.5"
          >
            No longer available
          </button>
        </div>
      </div>
    </div>
  );
}
