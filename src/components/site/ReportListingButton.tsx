import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const REASONS = [
  "Spam or duplicate listing",
  "Scam or fraudulent offer",
  "Wrong or misleading details",
  "Property already sold/rented",
  "Offensive or inappropriate content",
  "Other",
];

export function ReportListingButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (details.length > 1000) {
      toast.error("Details must be under 1000 characters");
      return;
    }
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id ?? null;
      const allowed = await checkRateLimit("property_report", rateLimitKey(userId), 5, 3600);
      if (!allowed) {
        toast.error("Too many reports submitted. Please try again later.");
        return;
      }
      const { error } = await supabase.from("property_reports").insert({
        property_id: propertyId,
        reporter_id: userId,
        reason,
        details: details.trim() ? details.trim() : null,
      });
      if (error) throw error;
      toast.success("Thanks — our moderators will review this listing.");
      setOpen(false);
      setDetails("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
        >
          <Flag className="h-3.5 w-3.5" /> Report this listing
        </button>
      ) : (
        <div className="space-y-2">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" /> Report this listing
          </div>
          <label className="block text-xs font-semibold text-muted-foreground">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Add any details that help us investigate (optional)"
            className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-ghost text-xs">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="btn-primary btn-primary-hover text-xs disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
