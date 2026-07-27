import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Handshake, Inbox, TrendingUp, Clock, Percent, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatKsh } from "@/lib/mock-data";
import { listMyOffers, listReceivedOffers } from "@/lib/offers.functions";
import {
  OPEN_STATUSES, STATUS_CLASS, STATUS_LABEL, offerAmount, priceDiff, toCsv,
  type Offer, type OfferStatus,
} from "@/lib/offers";

export const Route = createFileRoute("/_authenticated/dashboard/offers/")({
  head: () => ({
    meta: [
      { title: "Offer Center — Negotiate Property Offers | Foxwood" },
      { name: "description", content: "Track every offer you have made or received on Foxwood Properties: counter offers, acceptances, messages and negotiation history." },
      { property: "og:title", content: "Offer Center | Foxwood Properties" },
      { property: "og:description", content: "Manage buyer offers, counter offers and negotiations in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfferCenter,
});

const FILTERS: Array<{ key: string; label: string; match: (o: Offer) => boolean }> = [
  { key: "active", label: "Active", match: (o) => OPEN_STATUSES.includes(o.status) },
  { key: "counter_offered", label: "Counter offers", match: (o) => o.status === "counter_offered" },
  { key: "accepted", label: "Accepted", match: (o) => o.status === "accepted" },
  { key: "rejected", label: "Rejected", match: (o) => o.status === "rejected" },
  { key: "withdrawn", label: "Withdrawn", match: (o) => o.status === "withdrawn" },
  { key: "expired", label: "Expired", match: (o) => o.status === "expired" },
  { key: "all", label: "All", match: () => true },
];

function OfferCenter() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"buying" | "selling">("buying");
  const [filter, setFilter] = useState("active");

  const mine = useServerFn(listMyOffers);
  const received = useServerFn(listReceivedOffers);

  const buying = useQuery({ queryKey: ["my-offers", user?.id], queryFn: () => mine({}) as Promise<Offer[]>, enabled: !!user });
  const selling = useQuery({ queryKey: ["received-offers", user?.id], queryFn: () => received({}) as Promise<Offer[]>, enabled: !!user });

  const list = (tab === "buying" ? buying.data : selling.data) ?? [];
  const shown = useMemo(() => list.filter(FILTERS.find((f) => f.key === filter)!.match), [list, filter]);

  const stats = useMemo(() => {
    const src = selling.data ?? [];
    const responded = src.filter((o) => o.first_response_at);
    const accepted = src.filter((o) => o.status === "accepted");
    const closed = src.filter((o) => ["accepted", "rejected", "expired", "withdrawn"].includes(o.status));
    return {
      total: src.length,
      avgValue: src.length ? src.reduce((s, o) => s + offerAmount(o), 0) / src.length : 0,
      acceptanceRate: closed.length ? (accepted.length / closed.length) * 100 : 0,
      avgResponseHours: responded.length
        ? responded.reduce((s, o) => s + (new Date(o.first_response_at!).getTime() - new Date(o.created_at).getTime()) / 3600000, 0) / responded.length
        : null,
      negotiationSuccess: src.length ? (accepted.length / src.length) * 100 : 0,
    };
  }, [selling.data]);

  function exportCsv() {
    const rows = shown.map((o) => ({
      offer_id: o.offer_ref,
      property: o.property?.title ?? o.property_id,
      asking_price: o.asking_price,
      offer_amount: offerAmount(o),
      currency: o.currency,
      status: o.status,
      buyer: o.buyer_name,
      submitted: o.created_at,
      updated: o.updated_at,
    }));
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `foxwood-offers-${tab}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Offer Center</h1>
          <p className="text-sm text-muted-foreground">Every negotiation you are part of — offers made, offers received and their full history.</p>
        </div>
        <button onClick={exportCsv} className="btn-ghost"><Download className="h-4 w-4" /> Export CSV</button>
      </header>

      <div className="mt-5 inline-flex rounded-full border border-border bg-card p-1 text-sm">
        <button onClick={() => setTab("buying")} className={`rounded-full px-4 py-1.5 font-medium ${tab === "buying" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <Handshake className="mr-1 inline h-4 w-4" /> My offers ({buying.data?.length ?? 0})
        </button>
        <button onClick={() => setTab("selling")} className={`rounded-full px-4 py-1.5 font-medium ${tab === "selling" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <Inbox className="mr-1 inline h-4 w-4" /> Offers received ({selling.data?.length ?? 0})
        </button>
      </div>

      {tab === "selling" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat icon={Inbox} label="Total offers" value={String(stats.total)} />
          <Stat icon={TrendingUp} label="Average offer" value={formatKsh(Math.round(stats.avgValue))} />
          <Stat icon={Percent} label="Acceptance rate" value={`${stats.acceptanceRate.toFixed(0)}%`} />
          <Stat icon={Clock} label="Avg response" value={stats.avgResponseHours == null ? "—" : `${stats.avgResponseHours.toFixed(1)}h`} />
          <Stat icon={Percent} label="Negotiation success" value={`${stats.negotiationSuccess.toFixed(0)}%`} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.key ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {(buying.isLoading || selling.isLoading) && <div className="h-24 animate-pulse rounded-2xl bg-muted" />}
        {shown.map((o) => <OfferRow key={o.id} o={o} showBuyer={tab === "selling"} />)}
        {!buying.isLoading && !selling.isLoading && shown.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No offers here yet.{" "}
            {tab === "buying" && <Link to="/properties" className="text-primary underline">Browse properties for sale</Link>}
          </div>
        )}
      </div>
    </div>
  );
}

function OfferRow({ o, showBuyer }: { o: Offer; showBuyer: boolean }) {
  const d = priceDiff(Number(o.asking_price), offerAmount(o));
  return (
    <Link to="/dashboard/offers/$id" params={{ id: o.id }} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
      <img src={o.property?.images?.[0] ?? "/placeholder.svg"} alt="" loading="lazy" className="h-16 w-24 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{o.property?.title ?? "Listing"}</p>
        <p className="text-xs text-muted-foreground">
          {o.offer_ref} · {new Date(o.created_at).toLocaleDateString()}
          {showBuyer && o.buyer_name ? ` · ${o.buyer_name}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-primary">{formatKsh(offerAmount(o))}</p>
        <p className={`text-xs ${d.tone}`}>{d.label}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[o.status as OfferStatus]}`}>{STATUS_LABEL[o.status as OfferStatus]}</span>
    </Link>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" /> {label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
