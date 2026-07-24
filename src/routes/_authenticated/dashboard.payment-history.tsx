import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyPayments } from "@/lib/subscriptions.functions";
import { Receipt, Download, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/payment-history")({
  component: PaymentHistory,
  head: () => ({ meta: [{ title: "Payment history — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

const PURPOSE_LABEL: Record<string, string> = {
  upgrade_tier: "Agent subscription",
  listing_package: "Listing package",
  blog_submission: "Blog submission",
  advertisement: "Advertisement",
  feature_listing: "Featured listing",
  verification_fee: "Verification fee",
};

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

function PaymentHistory() {
  const listFn = useServerFn(listMyPayments);
  const { data = [], isLoading } = useQuery({ queryKey: ["my-payments"], queryFn: () => listFn() });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-sm text-muted-foreground mt-1">All your M-Pesa transactions on Foxwood.</p>
        </div>
        <Link to="/dashboard/subscription" className="btn-ghost text-sm inline-flex items-center gap-1.5"><ArrowLeft className="h-4 w-4" /> Back to subscription</Link>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && data.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-60" />
                  No payments yet.
                </td></tr>
              )}
              {data.map((t: any) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{fmt(t.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{PURPOSE_LABEL[t.purpose] ?? t.purpose}</span>
                    {t.tier && <div className="text-xs text-muted-foreground capitalize">{t.tier} plan</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold">KES {Number(t.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">M-Pesa · {t.phone_number}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.mpesa_receipt || t.checkout_request_id || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                      t.status === "success" ? "bg-primary-soft text-primary" :
                      t.status === "failed" ? "bg-destructive/10 text-destructive" :
                      t.status === "cancelled" ? "bg-muted text-muted-foreground" :
                      "bg-secondary/10 text-secondary"
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.status === "success" ? (
                      <Link to="/dashboard/invoice/$id" params={{ id: t.id }} className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                        <Download className="h-3.5 w-3.5" /> Invoice
                      </Link>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
