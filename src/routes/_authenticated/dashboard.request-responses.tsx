import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare } from "lucide-react";
import type { PropertyRequest, RequestResponse } from "@/lib/property-requests";

export const Route = createFileRoute("/_authenticated/dashboard/request-responses")({
  component: MyResponses,
});

type Row = RequestResponse & { request?: PropertyRequest | null };

function MyResponses() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-request-responses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("property_request_responses" as any)
        .select("*, request:property_requests(*)")
        .eq("responder_id", user!.id)
        .order("created_at", { ascending: false });
      return (rows ?? []) as unknown as Row[];
    },
  });

  const rows = data ?? [];
  const counts = {
    total: rows.length,
    accepted: rows.filter((r) => r.status === "accepted").length,
    pending: rows.filter((r) => r.status === "pending").length,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">My responses to buyer requests</h1>
      <p className="text-sm text-muted-foreground">Every property you've proposed to a buyer request, and where each conversation stands.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Responses sent" value={counts.total} />
        <Stat label="Pending" value={counts.pending} />
        <Stat label="Accepted" value={counts.accepted} />
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-semibold">No responses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse buyer requests and propose a matching property.</p>
            <Link to="/property-requests" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Browse requests</Link>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <p className="font-semibold">{r.request?.title ?? "Request"}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{r.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${r.status === "accepted" ? "bg-primary text-primary-foreground" : r.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                {r.status}
              </span>
              {r.request?.slug && (
                <Link to="/property-requests/$slug" params={{ slug: r.request.slug }} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  <MessageSquare className="h-3.5 w-3.5" /> Open thread
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
