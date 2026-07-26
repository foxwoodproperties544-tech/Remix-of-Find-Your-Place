import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ShieldAlert } from "lucide-react";
import { exportMyData, myDeletionRequest, requestAccountDeletion } from "@/lib/compliance.functions";

/** Data portability + erasure controls for the signed-in user. */
export function PrivacyDataCard() {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const request = useQuery({ queryKey: ["my-deletion-request"], queryFn: () => myDeletionRequest() });

  const exporting = useMutation({
    mutationFn: async () => {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `foxwood-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("Your data download has started"),
    onError: (e: any) => toast.error(e.message ?? "Export failed"),
  });

  const requestDeletion = useMutation({
    mutationFn: () => requestAccountDeletion({ data: { reason: reason.trim() || undefined } }),
    onSuccess: (r: any) => {
      setConfirming(false);
      setReason("");
      request.refetch();
      toast.success(r?.alreadyPending ? "You already have a request pending" : "Deletion request submitted");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not submit request"),
  });

  const pending = request.data && ["pending", "reviewing"].includes(request.data.status);

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Privacy &amp; your data</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Download everything Foxwood holds about you, or ask us to erase your account.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => exporting.mutate()}
          disabled={exporting.isPending}
          className="btn-primary btn-primary-hover inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {exporting.isPending ? "Preparing…" : "Download my data"}
        </button>
        {!pending && !confirming && (
          <button onClick={() => setConfirming(true)} className="btn-ghost inline-flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Request account deletion
          </button>
        )}
      </div>

      {pending && (
        <p className="mt-4 rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm">
          Deletion request received on {new Date(request.data!.created_at).toLocaleDateString()} — status:{" "}
          <strong className="capitalize">{request.data!.status}</strong>. Our team will contact you to confirm.
        </p>
      )}

      {request.data?.status === "rejected" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Your previous deletion request was declined{request.data.admin_notes ? `: ${request.data.admin_notes}` : "."}
        </p>
      )}

      {confirming && !pending && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm">
            This permanently removes your profile, listings, saved searches and messages. Active paid packages are not
            refunded. Tell us why (optional):
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={1000}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Reason for leaving"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={() => setConfirming(false)} className="btn-ghost text-sm">
              Cancel
            </button>
            <button
              onClick={() => requestDeletion.mutate()}
              disabled={requestDeletion.isPending}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
            >
              {requestDeletion.isPending ? "Submitting…" : "Confirm deletion request"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
