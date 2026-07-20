import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-role";
import { decideVerification } from "@/lib/verification.functions";
import { ShieldCheck, ExternalLink, Check, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  component: Verifications,
  head: () => ({ meta: [{ title: "Verifications — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

function Verifications() {
  const { isAdmin, loading } = useRoles();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const qc = useQueryClient();
  const decideFn = useServerFn(decideVerification);

  const { data } = useQuery({
    queryKey: ["verifications", tab],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*, properties(id,slug,title,county,town), profiles(full_name)")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve, notes }: { id: string; approve: boolean; notes?: string }) =>
      decideFn({ data: { requestId: id, approve, reviewerNotes: notes } }),
    onSuccess: (_r, v) => { toast.success(v.approve ? "Verified" : "Rejected"); qc.invalidateQueries({ queryKey: ["verifications"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (loading) return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="container-page py-16 text-sm">Admins only.</div>;

  return (
    <div className="container-page py-10">
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1"><ShieldCheck className="h-3.5 w-3.5" /> Admin</div>
      <h1 className="text-3xl font-bold mt-2">Verification queue</h1>
      <p className="text-sm text-muted-foreground mt-1">Review submitted documents and approve or reject verifications.</p>

      <div className="mt-6 flex gap-2 border-b border-border">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${tab === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        {!data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No {tab} requests.</div>
        ) : data.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{r.properties?.title ?? r.property_id}</h3>
                  <span className="text-xs text-muted-foreground">by {r.profiles?.full_name ?? "unknown"}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.properties?.town}, {r.properties?.county} · Submitted {new Date(r.created_at).toLocaleDateString()}</div>
                {r.notes && <p className="text-sm mt-2">{r.notes}</p>}
                <div className="mt-3 flex gap-3 flex-wrap">
                  {r.id_document_url && <a href={r.id_document_url} target="_blank" rel="noopener" className="text-xs inline-flex items-center gap-1 text-primary hover:underline"><FileText className="h-3.5 w-3.5" /> ID document</a>}
                  {r.title_deed_url && <a href={r.title_deed_url} target="_blank" rel="noopener" className="text-xs inline-flex items-center gap-1 text-primary hover:underline"><FileText className="h-3.5 w-3.5" /> Title deed</a>}
                  <a href={`/properties/${(r.properties as any)?.slug ?? r.property_id}`} target="_blank" rel="noopener" className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /> View listing</a>
                </div>
                {r.reviewer_notes && <p className="text-xs mt-2 text-muted-foreground italic">Reviewer: {r.reviewer_notes}</p>}
              </div>
              {tab === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { const n = prompt("Reject reason (optional)") ?? undefined; decide.mutate({ id: r.id, approve: false, notes: n }); }}
                    className="btn-ghost !px-3 !py-2 text-destructive" title="Reject"><X className="h-4 w-4" /></button>
                  <button onClick={() => decide.mutate({ id: r.id, approve: true })}
                    className="btn-primary btn-primary-hover !px-3 !py-2" title="Approve"><Check className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
