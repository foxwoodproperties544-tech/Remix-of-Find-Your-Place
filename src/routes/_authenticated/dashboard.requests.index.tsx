import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Plus, Eye, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { budgetLabel, fetchMyRequests, KIND_LABEL, type PropertyRequest } from "@/lib/property-requests";

export const Route = createFileRoute("/_authenticated/dashboard/requests/")({
  component: MyRequests,
});

function MyRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-requests", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyRequests(user!.id),
  });

  const rows = (data ?? []) as PropertyRequest[];
  const totals = {
    active: rows.filter((r) => r.status === "active").length,
    responses: rows.reduce((s, r) => s + (r.response_count ?? 0), 0),
    views: rows.reduce((s, r) => s + (r.view_count ?? 0), 0),
  };

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("property_requests" as any).update({ status }).eq("id", id);
    if (error) return toast.error("Could not update request");
    toast.success("Request updated");
    qc.invalidateQueries({ queryKey: ["my-requests"] });
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this request permanently?")) return;
    const { error } = await supabase.from("property_requests" as any).delete().eq("id", id);
    if (error) return toast.error("Could not delete request");
    toast.success("Request deleted");
    qc.invalidateQueries({ queryKey: ["my-requests"] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My property requests</h1>
          <p className="text-sm text-muted-foreground">Track responses from agents, developers and owners.</p>
        </div>
        <Link to="/dashboard/requests/new" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> New request
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active requests" value={totals.active} />
        <StatCard label="Total responses" value={totals.responses} />
        <StatCard label="Total views" value={totals.views} />
      </div>

      <div className="mt-6 space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-semibold">You haven't posted a request yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Tell agents what you're looking for and let the properties come to you.</p>
            <Link to="/dashboard/requests/new" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Post a request</Link>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 capitalize text-muted-foreground">{r.status}</span>
                  {r.is_featured && <span className="rounded-full bg-amber-500 px-2.5 py-0.5 font-semibold text-white">Featured</span>}
                </div>
                <Link to="/property-requests/$slug" params={{ slug: r.slug ?? r.id }} className="mt-2 block font-semibold hover:text-primary">{r.title}</Link>
                <p className="text-sm text-muted-foreground">{[r.town, r.county].filter(Boolean).join(", ")} · {budgetLabel(r)}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {r.response_count}</span>
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {r.view_count}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3 text-xs">
              <Link to="/property-requests/$slug" params={{ slug: r.slug ?? r.id }} className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-muted">View responses</Link>
              {r.status === "active" && <button onClick={() => setStatus(r.id, "paused")} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Pause</button>}
              {(r.status === "paused" || r.status === "draft") && <button onClick={() => setStatus(r.id, "active")} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Activate</button>}
              {r.status !== "fulfilled" && <button onClick={() => setStatus(r.id, "fulfilled")} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Mark fulfilled</button>}
              {r.status !== "closed" && <button onClick={() => setStatus(r.id, "closed")} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Close</button>}
              <button onClick={() => remove(r.id)} className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
