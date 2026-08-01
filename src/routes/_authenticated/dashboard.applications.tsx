import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileSignature, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatKsh } from "@/lib/mock-data";
import { updateRentalApplication } from "@/lib/rentals.functions";
import {
  AGENT_ACTIONS,
  APPLICATION_STATUS_CLASS,
  APPLICATION_STATUS_LABEL,
  type ApplicationStatus,
  type RentalApplication,
} from "@/lib/rentals";

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
  component: AgentApplications,
  head: () => ({ meta: [{ title: "Rental applications — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function AgentApplications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const update = useServerFn(updateRentalApplication);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("rental_applications" as any)
        .select("*, property:properties(id, title, slug, price, town)")
        .eq("agent_id", user!.id)
        .order("created_at", { ascending: false });
      return (rows ?? []) as unknown as RentalApplication[];
    },
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; status: ApplicationStatus; reviewerNotes?: string }) =>
      update({ data: v }),
    onSuccess: () => {
      toast.success("Application updated");
      qc.invalidateQueries({ queryKey: ["agent-applications", user?.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const rows = (data ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div>
      <h1 className="text-2xl font-bold">Rental applications</h1>
      <p className="text-sm text-muted-foreground">Review and shortlist tenants who applied to your rental listings.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", ...AGENT_ACTIONS, "submitted", "withdrawn"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {s === "all" ? "All" : APPLICATION_STATUS_LABEL[s as ApplicationStatus]}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading applications…</p>}

      {!isLoading && rows.length === 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <FileSignature className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-bold">No applications here yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Applications appear as soon as a tenant applies to one of your rentals.</p>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {rows.map((a) => (
          <li key={a.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{a.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.email} · {a.phone} · applied {new Date(a.created_at).toLocaleDateString()}
                </p>
                {a.property && (
                  <Link
                    to="/properties/$id"
                    params={{ id: a.property.slug ?? a.property.id }}
                    className="text-xs text-primary underline"
                  >
                    {a.property.title}
                  </Link>
                )}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${APPLICATION_STATUS_CLASS[a.status]}`}>
                {APPLICATION_STATUS_LABEL[a.status]}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Occupation</dt><dd>{a.occupation ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Monthly income</dt><dd>{a.monthly_income ? formatKsh(Number(a.monthly_income)) : "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Move-in</dt><dd>{a.move_in_date ? new Date(a.move_in_date).toLocaleDateString() : "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Occupants / pets</dt><dd>{a.occupants} · {a.pets ? "Pets" : "No pets"}</dd></div>
            </dl>

            {a.notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{a.notes}</p>}

            {a.status !== "withdrawn" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {AGENT_ACTIONS.filter((s) => s !== a.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => mut.mutate({ id: a.id, status: s })}
                    disabled={mut.isPending}
                    className="btn-ghost text-xs disabled:opacity-50"
                  >
                    {mut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Mark {APPLICATION_STATUS_LABEL[s].toLowerCase()}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
