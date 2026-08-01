import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Gavel } from "lucide-react";
import { submitAppeal, listMyAppeals } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/dashboard/appeal")({
  component: AppealPage,
  head: () => ({
    meta: [
      { title: "Appeal a suspension — Foxwood Properties" },
      { name: "description", content: "Submit an appeal if your Foxwood account has been suspended." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function AppealPage() {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitAppeal);
  const listFn = useServerFn(listMyAppeals);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const appeals = useQuery({ queryKey: ["my-appeals"], queryFn: () => listFn({}) });

  const send = async () => {
    if (body.trim().length < 20) { toast.error("Please describe your appeal in at least 20 characters"); return; }
    setBusy(true);
    try {
      await submitFn({ data: { body: body.trim() } });
      toast.success("Appeal submitted — our team will review it");
      setBody("");
      qc.invalidateQueries({ queryKey: ["my-appeals"] });
    } catch (e: any) { toast.error(e?.message ?? "Could not submit appeal"); }
    setBusy(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Appeal a suspension</h1>
        <p className="text-sm text-muted-foreground">Tell us why your account should be reinstated. A Foxwood admin reviews every appeal.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <label htmlFor="appeal-body" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your appeal</label>
        <textarea id="appeal-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm"
          placeholder="Explain the situation and any evidence that supports your case…" />
        <button onClick={send} disabled={busy} className="btn-primary btn-primary-hover !py-2 !px-4 text-sm inline-flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Submit appeal
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="p-4 border-b border-border font-semibold text-sm">Your appeals</div>
        {appeals.isLoading ? (
          <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (appeals.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">You have not submitted an appeal.</div>
        ) : (
          <ul className="divide-y divide-border">
            {(appeals.data ?? []).map((a: any) => (
              <li key={a.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{fmt(a.created_at)}</span>
                  <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a.status}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{a.body}</p>
                {a.decision_note && <p className="text-xs text-muted-foreground">Admin note: {a.decision_note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
