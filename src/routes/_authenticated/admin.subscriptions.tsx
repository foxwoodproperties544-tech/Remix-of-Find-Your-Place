import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { listSubscriptions, lookupPayment } from "@/lib/admin.functions";
import { ShieldCheck, Search, Star, CalendarCheck, Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: AdminSubscriptions,
  head: () => ({ meta: [{ title: "Subscriptions — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

function statusOf(expires: string | null): { label: string; tone: string } {
  if (!expires) return { label: "No expiry", tone: "bg-muted text-foreground" };
  const d = new Date(expires).getTime();
  const now = Date.now();
  if (d < now) return { label: "Expired", tone: "bg-destructive/10 text-destructive" };
  if (d - now < 7 * 864e5) return { label: "Renews soon", tone: "bg-secondary/15 text-secondary" };
  return { label: "Active", tone: "bg-primary-soft text-primary" };
}

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function AdminSubscriptions() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [lookup, setLookup] = useState("");

  const listFn = useServerFn(listSubscriptions);
  const lookupFn = useServerFn(lookupPayment);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subs", q],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { q } }),
  });

  const { data: txs, refetch: doLookup, isFetching: looking } = useQuery({
    queryKey: ["admin-payment-lookup", lookup],
    enabled: false,
    queryFn: () => lookupFn({ data: { q: lookup } }),
  });

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-xl font-bold mt-3">Admins only</h1>
        <button onClick={() => nav({ to: "/dashboard/account" })} className="btn-primary btn-primary-hover mt-4">Back</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </div>
          <h1 className="text-3xl font-bold mt-2">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Paid tiers, renewals, and M-Pesa payment lookup.</p>
        </div>
        <Link to="/admin/analytics" className="btn-ghost text-sm">Analytics</Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, company, phone, receipt…"
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Subscriber</th>
                    <th className="text-left px-4 py-3">Tier</th>
                    <th className="text-left px-4 py-3">Renews / expires</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Last payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
                  {!isLoading && (data?.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No paid subscriptions yet.</td></tr>
                  )}
                  {data?.map((r: any) => {
                    const s = statusOf(r.tier_expires_at);
                    return (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{r.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.company_name || r.phone || r.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft text-primary text-xs px-2 py-0.5 font-semibold capitalize">
                            <Star className="h-3 w-3" /> {r.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" /> {fmt(r.tier_expires_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${s.tone}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.last_payment ? (
                            <div>
                              <div className="font-medium">KES {Number(r.last_payment.amount).toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">{r.last_payment.mpesa_receipt || r.last_payment.status} · {fmt(r.last_payment.created_at)}</div>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5 h-fit">
          <div className="flex items-center gap-2 text-sm font-semibold"><Receipt className="h-4 w-4 text-primary" /> Payment lookup</div>
          <p className="text-xs text-muted-foreground mt-1">Search by M-Pesa receipt, phone, or request ID.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); if (lookup.trim().length >= 3) doLookup(); }}
            className="mt-3 flex gap-2"
          >
            <input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              placeholder="e.g. QK123ABC or 2547…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button type="submit" className="btn-primary btn-primary-hover text-sm">Find</button>
          </form>

          <div className="mt-4 max-h-[420px] overflow-y-auto space-y-2">
            {looking && <div className="text-sm text-muted-foreground">Searching…</div>}
            {txs?.map((t: any) => (
              <div key={t.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>KES {Number(t.amount).toLocaleString()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "success" ? "bg-primary-soft text-primary" : t.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}>{t.status}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t.mpesa_receipt || t.checkout_request_id}</div>
                <div className="text-xs text-muted-foreground">{t.phone_number} · {t.purpose}{t.tier ? " · " + t.tier : ""}</div>
                <div className="text-xs text-muted-foreground">{fmt(t.created_at)}</div>
              </div>
            ))}
            {txs && txs.length === 0 && <div className="text-xs text-muted-foreground">No matching transactions.</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
