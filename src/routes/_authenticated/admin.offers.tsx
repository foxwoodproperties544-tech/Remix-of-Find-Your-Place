import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, RefreshCw, Search, Loader2 } from "lucide-react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { formatKsh } from "@/lib/mock-data";
import { adminListOffers, expireStaleOffers, getOfferSettings, updateOfferSettings } from "@/lib/offers.functions";
import { STATUS_CLASS, STATUS_LABEL, offerAmount, priceDiff, toCsv, type Offer, type OfferStatus } from "@/lib/offers";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  head: () => ({
    meta: [
      { title: "Offer management & analytics | Foxwood Admin" },
      { name: "description", content: "Admin console for all property offers: search, filter, analytics, exports, expiry settings and future monetization switches." },
      { property: "og:title", content: "Offer management | Foxwood Admin" },
      { property: "og:description", content: "Monitor and moderate every negotiation on Foxwood Properties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOffers,
});

const STATUSES = ["all", "pending", "under_review", "counter_offered", "accepted", "rejected", "withdrawn", "expired"];

function AdminOffers() {
  const { ready, isAdmin } = useAdminGuard();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const list = useServerFn(adminListOffers);
  const expire = useServerFn(expireStaleOffers);
  const loadSettings = useServerFn(getOfferSettings);
  const saveSettings = useServerFn(updateOfferSettings);

  const offersQ = useQuery({
    queryKey: ["admin-offers", q, status],
    enabled: ready && isAdmin,
    queryFn: () => list({ data: { q: q || undefined, status } }) as Promise<{ offers: Offer[]; stats: any }>,
  });

  const settingsQ = useQuery({
    queryKey: ["admin-offer-settings"],
    enabled: ready && isAdmin,
    queryFn: () => loadSettings({}) as Promise<any>,
  });

  const saveMut = useMutation({
    mutationFn: (v: any) => saveSettings({ data: v }),
    onSuccess: () => { toast.success("Offer settings saved"); qc.invalidateQueries({ queryKey: ["admin-offer-settings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const expireMut = useMutation({
    mutationFn: () => expire({}),
    onSuccess: (r: any) => { toast.success(`${r.expired} offer(s) expired`); qc.invalidateQueries({ queryKey: ["admin-offers"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not run expiry"),
  });

  if (!ready) return <div className="p-8"><div className="h-24 animate-pulse rounded-2xl bg-muted" /></div>;
  if (!isAdmin) return <div className="p-8 text-sm text-muted-foreground">Admins only.</div>;

  const offers = offersQ.data?.offers ?? [];
  const stats = offersQ.data?.stats;
  const s = settingsQ.data;

  function exportCsv() {
    const rows = offers.map((o) => ({
      offer_id: o.offer_ref,
      property: o.property?.title ?? o.property_id,
      buyer: o.buyer_name,
      buyer_email: o.buyer_email,
      buyer_phone: o.buyer_phone,
      asking_price: o.asking_price,
      offer_amount: offerAmount(o),
      difference: offerAmount(o) - Number(o.asking_price),
      status: o.status,
      submitted: o.created_at,
      last_updated: o.updated_at,
      first_response: o.first_response_at ?? "",
    }));
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "foxwood-offer-report.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const mostNegotiated = Object.entries(
    offers.reduce<Record<string, { title: string; n: number }>>((acc, o) => {
      const key = o.property_id;
      acc[key] = { title: o.property?.title ?? key, n: (acc[key]?.n ?? 0) + 1 };
      return acc;
    }, {}),
  ).sort((a, b) => b[1].n - a[1].n).slice(0, 5);

  const highest = [...offers].sort((a, b) => offerAmount(b) - offerAmount(a)).slice(0, 5);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Offer management</h1>
          <p className="text-sm text-muted-foreground">All negotiations across the marketplace, with analytics and platform settings.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => expireMut.mutate()} className="btn-ghost">{expireMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Run expiry</button>
          <button onClick={exportCsv} className="btn-ghost"><Download className="h-4 w-4" /> Export CSV / Excel</button>
        </div>
      </header>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total offers" value={String(stats.total)} />
          <Stat label="Accepted / Rejected" value={`${stats.accepted} / ${stats.rejected}`} />
          <Stat label="Average offer value" value={formatKsh(Math.round(stats.avgValue))} />
          <Stat label="Avg. vs asking price" value={formatKsh(Math.round(stats.avgDiff))} />
          <Stat label="Avg response time" value={stats.avgResponseHours == null ? "—" : `${stats.avgResponseHours.toFixed(1)}h`} />
          <Stat label="Conversion rate" value={`${stats.conversionRate.toFixed(1)}%`} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search offer ID, buyer or property" className="input-base pl-9" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-base w-48">
          {STATUSES.map((st) => <option key={st} value={st}>{st === "all" ? "All statuses" : STATUS_LABEL[st as OfferStatus]}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Offer</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Amount</th><th className="px-4 py-3">Diff</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => {
              const d = priceDiff(Number(o.asking_price), offerAmount(o));
              return (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link to="/dashboard/offers/$id" params={{ id: o.id }} className="text-primary hover:underline">{o.offer_ref}</Link>
                  </td>
                  <td className="px-4 py-3 max-w-56 truncate">{o.property?.title ?? "—"}</td>
                  <td className="px-4 py-3">{o.buyer_name ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">{formatKsh(offerAmount(o))}</td>
                  <td className={`px-4 py-3 ${d.tone}`}>{d.label}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[o.status as OfferStatus]}`}>{STATUS_LABEL[o.status as OfferStatus]}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {offersQ.isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!offersQ.isLoading && offers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No offers match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Most negotiated properties</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {mostNegotiated.map(([id, v]) => <li key={id} className="flex justify-between gap-3"><span className="truncate">{v.title}</span><span className="font-semibold">{v.n}</span></li>)}
            {!mostNegotiated.length && <li className="text-muted-foreground">No data yet.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Highest value offers</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {highest.map((o) => <li key={o.id} className="flex justify-between gap-3"><span className="truncate">{o.property?.title ?? o.offer_ref}</span><span className="font-semibold">{formatKsh(offerAmount(o))}</span></li>)}
            {!highest.length && <li className="text-muted-foreground">No data yet.</li>}
          </ul>
        </div>
      </div>

      {s && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Offer settings</h2>
          <p className="text-xs text-muted-foreground">Control availability, expiry and future monetization features without code changes.</p>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget as HTMLFormElement);
              saveMut.mutate({
                enabled: f.get("enabled") === "on",
                allow_rentals: f.get("allow_rentals") === "on",
                default_expiry_days: Number(f.get("default_expiry_days")),
                max_offers_per_day: Number(f.get("max_offers_per_day")),
                featured_offers: f.get("featured_offers") === "on",
                premium_buyers: f.get("premium_buyers") === "on",
                priority_for_premium: f.get("priority_for_premium") === "on",
                agent_analytics: f.get("agent_analytics") === "on",
                concierge: f.get("concierge") === "on",
              });
            }}
          >
            <Num name="default_expiry_days" label="Default expiry (days)" defaultValue={s.default_expiry_days} />
            <Num name="max_offers_per_day" label="Max offers per buyer / day" defaultValue={s.max_offers_per_day} />
            <Check2 name="enabled" label="Make an Offer enabled" defaultChecked={s.enabled} />
            <Check2 name="allow_rentals" label="Allow offers on rentals & leases" defaultChecked={s.allow_rentals} />
            <Check2 name="featured_offers" label="Featured offers (monetization)" defaultChecked={s.featured_offers} />
            <Check2 name="premium_buyers" label="Premium buyer accounts" defaultChecked={s.premium_buyers} />
            <Check2 name="priority_for_premium" label="Offer priority for premium members" defaultChecked={s.priority_for_premium} />
            <Check2 name="agent_analytics" label="Offer analytics for agents" defaultChecked={s.agent_analytics} />
            <Check2 name="concierge" label="Concierge negotiation service" defaultChecked={s.concierge} />
            <div className="sm:col-span-2">
              <button className="btn-primary" disabled={saveMut.isPending}>{saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save settings</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Num({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input name={name} type="number" min={1} defaultValue={defaultValue} className="input-base" />
    </label>
  );
}

function Check2({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
    </label>
  );
}
