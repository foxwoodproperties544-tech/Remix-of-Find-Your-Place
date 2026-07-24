import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import {
  adminListSubscriptions, adminExtendSubscription, adminSetExpiry,
  adminSuspendSubscription, adminCancelSubscription, adminSendReminder,
  adminGetRevenue, adminListExpiring, adminGetGracePeriods, adminSetGracePeriods,
} from "@/lib/subscriptions.functions";
import { lookupPayment } from "@/lib/admin.functions";
import { ShieldCheck, Search, Star, CalendarCheck, Receipt, Bell, Ban, Trash2, Clock, Settings2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: AdminSubscriptions,
  head: () => ({ meta: [{ title: "Subscriptions — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

function statusOf(expires: string | null, suspended: boolean): { label: string; tone: string } {
  if (suspended) return { label: "Suspended", tone: "bg-destructive/10 text-destructive" };
  if (!expires) return { label: "No expiry", tone: "bg-muted text-foreground" };
  const d = new Date(expires).getTime();
  const now = Date.now();
  if (d < now) return { label: "Expired", tone: "bg-destructive/10 text-destructive" };
  if (d - now < 7 * 864e5) return { label: "Expiring soon", tone: "bg-secondary/15 text-secondary" };
  return { label: "Active", tone: "bg-primary-soft text-primary" };
}

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function AdminSubscriptions() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expiring" | "expired" | "suspended">("all");
  const [lookup, setLookup] = useState("");

  const listFn = useServerFn(adminListSubscriptions);
  const lookupFn = useServerFn(lookupPayment);
  const extendFn = useServerFn(adminExtendSubscription);
  const setExpiryFn = useServerFn(adminSetExpiry);
  const suspendFn = useServerFn(adminSuspendSubscription);
  const cancelFn = useServerFn(adminCancelSubscription);
  const remindFn = useServerFn(adminSendReminder);
  const revenueFn = useServerFn(adminGetRevenue);
  const expiringFn = useServerFn(adminListExpiring);
  const graceGetFn = useServerFn(adminGetGracePeriods);
  const graceSetFn = useServerFn(adminSetGracePeriods);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-subs", q, statusFilter],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { q, status: statusFilter } }),
  });
  const { data: revenue } = useQuery({ queryKey: ["admin-revenue"], enabled: isAdmin, queryFn: () => revenueFn() });
  const { data: expiring = [] } = useQuery({ queryKey: ["admin-expiring"], enabled: isAdmin, queryFn: () => expiringFn({ data: { withinDays: 14 } }) });
  const { data: grace, refetch: refetchGrace } = useQuery({ queryKey: ["admin-grace"], enabled: isAdmin, queryFn: () => graceGetFn() });
  const { data: txs, refetch: doLookup, isFetching: looking } = useQuery({
    queryKey: ["admin-payment-lookup", lookup], enabled: false, queryFn: () => lookupFn({ data: { q: lookup } }),
  });

  async function extend(userId: string) {
    const raw = prompt("Extend subscription by how many days?", "30");
    const days = Number(raw);
    if (!Number.isFinite(days) || days <= 0) return;
    try { await extendFn({ data: { userId, days } }); toast.success(`Extended by ${days} days`); refetch(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function changeExpiry(userId: string, current: string | null) {
    const raw = prompt("New expiry date (YYYY-MM-DD):", current ? new Date(current).toISOString().slice(0, 10) : "");
    if (!raw) return;
    try { await setExpiryFn({ data: { userId, expiresAt: raw } }); toast.success("Expiry updated"); refetch(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function toggleSuspend(userId: string, currently: boolean) {
    if (!confirm(currently ? "Reactivate this subscription?" : "Suspend this subscription?")) return;
    try { await suspendFn({ data: { userId, suspended: !currently } }); toast.success(currently ? "Reactivated" : "Suspended"); refetch(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function cancel(userId: string) {
    if (!confirm("Cancel this subscription and revert to Free? This cannot be undone.")) return;
    try { await cancelFn({ data: { userId } }); toast.success("Cancelled"); refetch(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function remind(userId: string) {
    try { await remindFn({ data: { userId } }); toast.success("Reminder sent"); }
    catch (e: any) { toast.error(e.message); }
  }

  async function saveGrace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await graceSetFn({ data: {
        tier: Number(f.get("tier") || 3), listing: Number(f.get("listing") || 3),
        blog: Number(f.get("blog") || 3), ad: Number(f.get("ad") || 3),
      }});
      toast.success("Grace periods updated");
      refetchGrace();
    } catch (err: any) { toast.error(err.message); }
  }

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
          <p className="text-sm text-muted-foreground mt-1">Manage all active tier subscriptions, revenue, and renewals.</p>
        </div>
        <Link to="/admin/analytics" className="btn-ghost text-sm">Analytics</Link>
      </div>

      {/* Revenue + expiring summary */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase font-semibold text-muted-foreground">Revenue (last 30 days)</div>
          <div className="mt-2 text-2xl font-extrabold">KES {Number(revenue?.total30 ?? 0).toLocaleString()}</div>
          {revenue?.byPurpose && (
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              {Object.entries(revenue.byPurpose).map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="capitalize">{k.replace(/_/g, " ")}</span><span>KES {Number(v as number).toLocaleString()}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase font-semibold text-muted-foreground">Expiring in 14 days</div>
          <div className="mt-2 text-2xl font-extrabold">{expiring.length}</div>
          <ul className="mt-2 text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
            {expiring.slice(0, 6).map((r: any) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span className="truncate">{r.full_name || r.company_name || r.id.slice(0, 8)}</span>
                <span className="shrink-0">{fmt(r.tier_expires_at)}</span>
              </li>
            ))}
            {expiring.length === 0 && <li>No subscriptions expiring soon.</li>}
          </ul>
        </div>
        <form onSubmit={saveGrace} className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Grace period (days)</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {(["tier", "listing", "blog", "ad"] as const).map((k) => (
              <label key={k} className="flex items-center justify-between gap-2">
                <span className="capitalize text-muted-foreground">{k}</span>
                <input name={k} type="number" min={0} max={60} defaultValue={(grace as any)?.[k] ?? 3} className="w-16 rounded border border-border bg-background px-2 py-1 text-right" />
              </label>
            ))}
          </div>
          <button type="submit" className="btn-primary btn-primary-hover text-xs mt-3 w-full">Save</button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative max-w-md flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, phone…" className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Subscriber</th>
                    <th className="text-left px-4 py-3">Tier</th>
                    <th className="text-left px-4 py-3">Expires</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
                  {!isLoading && (data?.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No subscriptions match.</td></tr>
                  )}
                  {data?.map((r: any) => {
                    const s = statusOf(r.tier_expires_at, r.subscription_suspended);
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
                          {r.pending_tier && <div className="text-[10px] text-secondary mt-1">↓ {r.pending_tier} (scheduled)</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" /> {fmt(r.tier_expires_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${s.tone}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <button onClick={() => extend(r.id)} title="Extend" className="p-1.5 rounded hover:bg-muted"><Clock className="h-3.5 w-3.5" /></button>
                            <button onClick={() => changeExpiry(r.id, r.tier_expires_at)} title="Change expiry" className="p-1.5 rounded hover:bg-muted"><CalendarCheck className="h-3.5 w-3.5" /></button>
                            <button onClick={() => remind(r.id)} title="Send reminder" className="p-1.5 rounded hover:bg-muted"><Bell className="h-3.5 w-3.5" /></button>
                            <button onClick={() => toggleSuspend(r.id, r.subscription_suspended)} title={r.subscription_suspended ? "Reactivate" : "Suspend"} className="p-1.5 rounded hover:bg-muted"><Ban className="h-3.5 w-3.5" /></button>
                            <button onClick={() => cancel(r.id)} title="Cancel" className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
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
          <form onSubmit={(e) => { e.preventDefault(); if (lookup.trim().length >= 3) doLookup(); }} className="mt-3 flex gap-2">
            <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="e.g. QK123ABC or 2547…" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
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
