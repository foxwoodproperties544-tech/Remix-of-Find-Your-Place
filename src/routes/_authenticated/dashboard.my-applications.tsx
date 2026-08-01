import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatKsh } from "@/lib/mock-data";
import { updateRentalApplication } from "@/lib/rentals.functions";
import { APPLICATION_STATUS_CLASS, APPLICATION_STATUS_LABEL, type RentalApplication } from "@/lib/rentals";

export const Route = createFileRoute("/_authenticated/dashboard/my-applications")({
  component: MyApplications,
  head: () => ({ meta: [{ title: "My rental applications — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function MyApplications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const update = useServerFn(updateRentalApplication);

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("rental_applications" as any)
        .select("*, property:properties(id, title, slug, price, town)")
        .eq("applicant_id", user!.id)
        .order("created_at", { ascending: false });
      return (rows ?? []) as unknown as RentalApplication[];
    },
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => update({ data: { id, status: "withdrawn" } }),
    onSuccess: () => {
      toast.success("Application withdrawn");
      qc.invalidateQueries({ queryKey: ["my-applications", user?.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not withdraw"),
  });

  const rows = data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">My rental applications</h1>
      <p className="text-sm text-muted-foreground">Track where each of your applications stands.</p>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && rows.length === 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <FileSignature className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-bold">No applications yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Find a rental you like and use “Apply to rent”.</p>
          <Link to="/properties" className="btn-primary mt-4 inline-flex">Browse rentals</Link>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {rows.map((a) => (
          <li key={a.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {a.property ? (
                  <Link to="/properties/$id" params={{ id: a.property.slug ?? a.property.id }} className="font-bold hover:underline">
                    {a.property.title}
                  </Link>
                ) : (
                  <p className="font-bold">Listing</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {a.property?.town ? `${a.property.town} · ` : ""}
                  {a.property ? formatKsh(Number(a.property.price)) : ""} · applied {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${APPLICATION_STATUS_CLASS[a.status]}`}>
                {APPLICATION_STATUS_LABEL[a.status]}
              </span>
            </div>

            {a.reviewer_notes && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                <span className="font-semibold">Agent note: </span>{a.reviewer_notes}
              </p>
            )}

            {["submitted", "under_review", "shortlisted"].includes(a.status) && (
              <button
                onClick={() => withdraw.mutate(a.id)}
                disabled={withdraw.isPending}
                className="btn-ghost mt-4 text-xs disabled:opacity-50"
              >
                Withdraw application
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
