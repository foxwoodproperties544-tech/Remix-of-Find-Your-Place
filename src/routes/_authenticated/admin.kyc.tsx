import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-role";
import { decideKyc } from "@/lib/kyc.functions";
import { ShieldCheck, Check, X, FileText, User } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  component: AdminKyc,
  head: () => ({ meta: [{ title: "Agent KYC — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

function AdminKyc() {
  const { isAdmin, loading } = useRoles();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const qc = useQueryClient();
  const decideFn = useServerFn(decideKyc);

  const { data } = useQuery({
    queryKey: ["kyc-admin", tab],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_submissions")
        .select("*, profiles!kyc_submissions_user_id_fkey(full_name,company_name)")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve, notes }: { id: string; approve: boolean; notes?: string }) =>
      decideFn({ data: { submissionId: id, approve, reviewerNotes: notes } }),
    onSuccess: (_r, v) => { toast.success(v.approve ? "Approved" : "Rejected"); qc.invalidateQueries({ queryKey: ["kyc-admin"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (loading) return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="container-page py-16 text-sm">Admins only.</div>;

  return (
    <div className="container-page py-10">
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1"><ShieldCheck className="h-3.5 w-3.5" /> Admin</div>
      <h1 className="text-3xl font-bold mt-2">Agent & owner KYC</h1>
      <p className="text-sm text-muted-foreground mt-1">Review identity, tax, and EARB documents. Approval grants the user a Verified badge.</p>

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
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No {tab} submissions.</div>
        ) : data.map((r) => <KycRow key={r.id} r={r} tab={tab} onDecide={(approve, notes) => decide.mutate({ id: r.id, approve, notes })} />)}
      </div>
    </div>
  );
}

function KycRow({ r, tab, onDecide }: { r: any; tab: string; onDecide: (approve: boolean, notes?: string) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">{r.full_legal_name}</h3>
            {r.company_name && <span className="text-xs text-muted-foreground">· {r.company_name}</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {r.id_type?.replace("_", " ")} · {r.id_number}
            {r.kra_pin && <> · KRA: {r.kra_pin}</>}
            {r.earb_license_number && <> · EARB: {r.earb_license_number}</>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Submitted {new Date(r.created_at).toLocaleDateString()}</div>
          {r.notes && <p className="text-sm mt-2">{r.notes}</p>}

          <div className="mt-3 flex gap-3 flex-wrap">
            <DocLink label="ID document" path={r.id_document_url} />
            <DocLink label="Selfie" path={r.selfie_url} />
            <DocLink label="KRA PIN" path={r.kra_pin_certificate_url} />
            <DocLink label="Business permit" path={r.business_permit_url} />
            <DocLink label="EARB licence" path={r.earb_license_url} />
          </div>

          {r.reviewer_notes && <p className="text-xs mt-3 text-muted-foreground italic">Reviewer: {r.reviewer_notes}</p>}
        </div>

        {tab === "pending" && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { const n = prompt("Reject reason (shown to user)") ?? undefined; onDecide(false, n); }}
              className="btn-ghost !px-3 !py-2 text-destructive" title="Reject"><X className="h-4 w-4" /></button>
            <button onClick={() => onDecide(true)} className="btn-primary btn-primary-hover !px-3 !py-2" title="Approve"><Check className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function DocLink({ label, path }: { label: string; path?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    supabase.storage.from("kyc-documents").createSignedUrl(path, 60 * 15).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  if (!path) return null;
  return (
    <a href={url ?? "#"} target="_blank" rel="noopener" className="text-xs inline-flex items-center gap-1 text-primary hover:underline">
      <FileText className="h-3.5 w-3.5" /> {label}
    </a>
  );
}
