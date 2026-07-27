import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, LineChart as LineChartIcon, Eye, Heart, MessageSquare, CalendarCheck, HandCoins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh } from "@/lib/mock-data";
import { fetchPriceHistory, summarizeHistory, formatDate, formatDelta, UUID_RE } from "@/lib/price-history";
import { updateListingPrice } from "@/lib/price-history.functions";
import { PriceChangeBadge, NoPriceChangeBadge } from "@/components/property/PriceChangeBadge";

interface Props {
  propertyId: string;
  propertyKey?: string;
  currentPrice: number;
  listedAt?: string | null;
  canEdit?: boolean;
}

/**
 * Dashboard price-history panel for agents and property owners: history, listing
 * performance, and an inline asking-price update with an optional reason.
 */
export function ListingPriceManager({ propertyId, propertyKey, currentPrice, listedAt, canEdit = true }: Props) {
  const enabled = UUID_RE.test(propertyId);
  const qc = useQueryClient();
  const update = useServerFn(updateListingPrice);
  const [price, setPrice] = useState(String(currentPrice ?? ""));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: history } = useQuery({
    queryKey: ["price-history", propertyId],
    enabled,
    queryFn: () => fetchPriceHistory(propertyId),
  });

  const { data: perf } = useQuery({
    queryKey: ["listing-performance", propertyId, propertyKey],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const key = propertyKey ?? propertyId;
      const [views, saves, inquiries, viewings, offers] = await Promise.all([
        supabase.from("property_views").select("id", { count: "exact", head: true }).eq("property_key", key),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("property_key", key),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("property_key", key),
        supabase.from("viewings").select("id", { count: "exact", head: true }).eq("property_id", propertyId),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("property_id", propertyId),
      ]);
      return {
        views: views.count ?? 0,
        saves: saves.count ?? 0,
        inquiries: inquiries.count ?? 0,
        viewings: viewings.count ?? 0,
        offers: offers.count ?? 0,
      };
    },
  });

  if (!enabled) return null;
  const summary = summarizeHistory(history ?? [], currentPrice, listedAt);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid asking price");
      return;
    }
    if (value === currentPrice) {
      toast("That is already the current asking price");
      return;
    }
    setSaving(true);
    try {
      await update({ data: { propertyId, price: value, reason: reason.trim() || null } });
      toast.success("Price updated — a price history record was created");
      setReason("");
      qc.invalidateQueries({ queryKey: ["price-history", propertyId] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update the price");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-primary" /> Price history
        </h2>
        {summary.changeCount > 0 ? <PriceChangeBadge change={summary.lastChange} compact /> : <NoPriceChangeBadge />}
      </div>

      <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4 text-sm">
        <Cell label="Current price" value={formatKsh(summary.currentPrice)} />
        <Cell label="Original price" value={formatKsh(summary.originalPrice)} />
        <Cell label="Price changes" value={String(summary.changeCount)} />
        <Cell
          label="Days since last update"
          value={summary.daysSinceLastChange == null ? "—" : `${summary.daysSinceLastChange}`}
        />
      </div>

      <div className="mt-3 grid gap-2 grid-cols-2 lg:grid-cols-5 text-xs">
        <Metric icon={<Eye className="h-3.5 w-3.5" />} label="Views" value={perf?.views ?? 0} />
        <Metric icon={<Heart className="h-3.5 w-3.5" />} label="Saved" value={perf?.saves ?? 0} />
        <Metric icon={<MessageSquare className="h-3.5 w-3.5" />} label="Enquiries" value={perf?.inquiries ?? 0} />
        <Metric icon={<CalendarCheck className="h-3.5 w-3.5" />} label="Viewings" value={perf?.viewings ?? 0} />
        <Metric icon={<HandCoins className="h-3.5 w-3.5" />} label="Offers" value={perf?.offers ?? 0} />
      </div>

      {(history?.length ?? 0) > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Previous</th>
                <th className="px-2 py-2 font-medium">New</th>
                <th className="px-2 py-2 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {[...(history ?? [])].reverse().slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-2 py-2 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.previous_price == null ? "—" : formatKsh(r.previous_price)}</td>
                  <td className="px-2 py-2 font-semibold">{formatKsh(r.new_price)}</td>
                  <td className={"px-2 py-2 " + ((r.amount_changed ?? 0) < 0 ? "text-primary" : (r.amount_changed ?? 0) > 0 ? "text-secondary" : "text-muted-foreground")}>
                    {r.is_initial ? "Initial listing" : formatDelta(r.amount_changed, r.percent_changed)}
                    {r.reason && <div className="text-[11px] text-muted-foreground">{r.reason}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr_auto] items-end">
          <label className="text-xs font-semibold">
            New asking price (KSh)
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Reason for change (optional)
            <input
              type="text"
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Motivated seller, market adjustment"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" disabled={saving} className="btn-primary btn-primary-hover inline-flex items-center gap-2 justify-center">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update price
          </button>
        </form>
      )}
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-2 font-semibold">
      {icon} {value} <span className="font-normal text-muted-foreground">{label}</span>
    </div>
  );
}
