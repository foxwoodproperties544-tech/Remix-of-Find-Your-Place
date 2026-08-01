import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { listPropertyReports, resolvePropertyReport } from "@/lib/reports.functions";
import { escalateReport } from "@/lib/ops.functions";
import { formatKsh } from "@/lib/mock-data";
import { Flag, ExternalLink, CheckCircle2, EyeOff, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsQueue,
  head: () => ({
    meta: [{ title: "Flagged listings — Admin" }, { name: "robots", content: "noindex" }],
  }),
});

const TABS = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
] as const;

function ReportsQueue() {
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const listFn = useServerFn(listPropertyReports);
  const resolveFn = useServerFn(resolvePropertyReport);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", tab],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { status: tab } }),
  });

  const act = useMutation({
    mutationFn: (v: { reportId: string; action: "dismiss" | "resolve" | "unpublish" | "remove"; resolution?: string }) =>
      resolveFn({ data: v }),
    onSuccess: () => {
      toast.success("Report updated");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["published-properties"] });
      setNoteFor(null);
      setNote("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Admins only.</div>;

  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <header>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
          <Flag className="h-3.5 w-3.5" /> Reports
        </div>
        <h1 className="text-2xl font-bold mt-2">Flagged listings & spam</h1>
        <p className="text-sm text-muted-foreground">
          Review listings reported by visitors. Unpublishing sends a listing back to draft; removing archives it.
        </p>
      </header>

      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <ShieldCheck className="h-8 w-8 mx-auto text-primary" />
          <h3 className="font-semibold mt-2">Nothing flagged</h3>
          <p className="text-sm text-muted-foreground mt-1">No reports in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex flex-wrap gap-4 p-4">
                <img
                  src={r.property?.images?.[0] ?? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200"}
                  alt=""
                  className="h-24 w-32 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{r.property?.title ?? "Deleted listing"}</h3>
                    {r.property?.status && (
                      <span className="rounded-full bg-muted text-xs px-2 py-0.5 uppercase">{r.property.status}</span>
                    )}
                    <span className="rounded-full bg-destructive/10 text-destructive text-xs px-2 py-0.5 font-semibold">
                      {r.status}
                    </span>
                    {r.severity && r.severity !== "normal" && (
                      <span className="rounded-full bg-secondary text-secondary-foreground text-xs px-2 py-0.5 font-semibold uppercase">
                        {r.severity}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.property ? `${r.property.town}, ${r.property.county} · ${formatKsh(Number(r.property.price))}` : "—"}
                    {" · "}Reported {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
                    <div className="font-semibold">{r.reason}</div>
                    {r.details && <p className="text-muted-foreground text-xs mt-1 whitespace-pre-wrap">{r.details}</p>}
                  </div>
                  {r.resolution && (
                    <p className="text-xs text-muted-foreground mt-2">Resolution: {r.resolution}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {r.property && (
                    <Link
                      to="/properties/$id"
                      params={{ id: r.property.slug ?? r.property.id }}
                      target="_blank"
                      className="btn-ghost text-xs !py-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Preview
                    </Link>
                  )}
                  {r.status === "open" && (
                    <>
                      <button
                        onClick={() => setNoteFor(noteFor === r.id ? null : r.id)}
                        className="btn-ghost text-xs !py-1.5"
                      >
                        Add note & act
                      </button>
                      <button
                        onClick={() => act.mutate({ reportId: r.id, action: "dismiss" })}
                        disabled={act.isPending}
                        className="btn-ghost text-xs !py-1.5"
                      >
                        {act.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>

              {noteFor === r.id && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-2">
                  <label className="text-xs font-semibold">Moderator note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="e.g. Confirmed duplicate spam listing."
                  />
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button onClick={() => setNoteFor(null)} className="btn-ghost text-xs">Cancel</button>
                    <button
                      onClick={() => act.mutate({ reportId: r.id, action: "resolve", resolution: note || undefined })}
                      disabled={act.isPending}
                      className="btn-ghost text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolve only
                    </button>
                    <button
                      onClick={() => act.mutate({ reportId: r.id, action: "unpublish", resolution: note || undefined })}
                      disabled={act.isPending}
                      className="btn-ghost text-xs text-secondary"
                    >
                      <EyeOff className="h-3.5 w-3.5" /> Unpublish listing
                    </button>
                    <button
                      onClick={() => act.mutate({ reportId: r.id, action: "remove", resolution: note || undefined })}
                      disabled={act.isPending}
                      className="btn-primary btn-primary-hover text-xs bg-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove as spam
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
