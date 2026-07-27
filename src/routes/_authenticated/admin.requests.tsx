import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { toast } from "sonner";
import { budgetLabel, KIND_LABEL, REQUEST_STATUSES, type PropertyRequest } from "@/lib/property-requests";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  component: AdminRequests,
});

function AdminRequests() {
  const { isAdmin, loading } = useAdminGuard();
  const ready = isAdmin && !loading;
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data: rows } = useQuery({
    queryKey: ["admin-requests", status],
    enabled: ready,
    queryFn: async () => {
      let query = supabase.from("property_requests" as any).select("*").order("created_at", { ascending: false }).limit(300);
      if (status !== "all") query = query.eq("status", status);
      const { data } = await query;
      return (data ?? []) as unknown as PropertyRequest[];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["admin-request-reports"],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("property_request_reports" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as any[];
    },
  });

  async function patch(id: string, patchData: Record<string, any>) {
    const { error } = await supabase.from("property_requests" as any).update(patchData).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Request updated");
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
  }

  const needle = q.trim().toLowerCase();
  const list = (rows ?? []).filter((r) => !needle || [r.title, r.county, r.town, r.property_type].some((v) => (v ?? "").toLowerCase().includes(needle)));

  if (!ready) return <p className="text-sm text-muted-foreground">Checking access…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Property requests</h1>
      <p className="text-sm text-muted-foreground">Moderate buyer requests, feature them, or close abusive posts.</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <input className="input-base max-w-xs" placeholder="Search requests…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input-base max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Responses</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <Link to="/property-requests/$slug" params={{ slug: r.slug ?? r.id }} className="font-semibold hover:text-primary">{r.title}</Link>
                  <p className="text-xs text-muted-foreground">{KIND_LABEL[r.kind] ?? r.kind} · {r.property_type} · {[r.town, r.county].filter(Boolean).join(", ")}</p>
                </td>
                <td className="px-4 py-3">{budgetLabel(r)}</td>
                <td className="px-4 py-3 capitalize">{r.status}</td>
                <td className="px-4 py-3">{r.response_count}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button onClick={() => patch(r.id, { is_featured: !r.is_featured })} className="rounded-full border border-border px-2.5 py-1 hover:bg-muted">{r.is_featured ? "Unfeature" : "Feature"}</button>
                    <button onClick={() => patch(r.id, { is_urgent: !r.is_urgent })} className="rounded-full border border-border px-2.5 py-1 hover:bg-muted">{r.is_urgent ? "Clear urgent" : "Mark urgent"}</button>
                    {r.status !== "active" && <button onClick={() => patch(r.id, { status: "active" })} className="rounded-full border border-border px-2.5 py-1 hover:bg-muted">Approve</button>}
                    {r.status !== "closed" && <button onClick={() => patch(r.id, { status: "closed" })} className="rounded-full border border-destructive/40 px-2.5 py-1 text-destructive hover:bg-destructive/10">Close</button>}
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No requests found.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-bold">Recent abuse reports</h2>
      <div className="mt-3 space-y-2">
        {(reports ?? []).length === 0 && <p className="text-sm text-muted-foreground">No reports.</p>}
        {(reports ?? []).map((rep) => (
          <div key={rep.id} className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-medium">{rep.reason}</p>
            <p className="text-xs text-muted-foreground">Request {rep.request_id} · {new Date(rep.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
