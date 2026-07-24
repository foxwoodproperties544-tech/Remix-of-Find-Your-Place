import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyInvoice } from "@/lib/subscriptions.functions";
import { ArrowLeft, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/invoice/$id")({
  component: InvoicePage,
  head: () => ({ meta: [{ title: "Invoice — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
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
  return d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function InvoicePage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getMyInvoice);
  const { data, isLoading, error } = useQuery({ queryKey: ["invoice", id], queryFn: () => fn({ data: { id } }) });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error || !data) return <div className="text-sm text-destructive">Invoice not found.</div>;

  const { tx, profile, planName } = data;
  const purposeLabel = PURPOSE_LABEL[tx.purpose] ?? tx.purpose;
  const item = planName ?? purposeLabel;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/dashboard/payment-history" className="btn-ghost text-sm inline-flex items-center gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <button onClick={() => window.print()} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-1.5"><Printer className="h-4 w-4" /> Print / Save PDF</button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <div className="text-2xl font-extrabold text-primary">Foxwood Properties</div>
            <div className="text-xs text-muted-foreground mt-1">Your gateway to prime deals</div>
            <div className="text-xs text-muted-foreground">support@foxwoodproperties.co.ke</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Invoice</div>
            <div className="font-mono text-sm mt-1">#{String(tx.id).slice(0, 8).toUpperCase()}</div>
            <div className="text-xs text-muted-foreground mt-2">Date: {fmt(tx.created_at)}</div>
            <div className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${tx.status === "success" ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive"}`}>
              {tx.status === "success" ? "PAID" : String(tx.status).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 py-6 border-b border-border">
          <div>
            <div className="text-xs uppercase text-muted-foreground font-semibold">Billed to</div>
            <div className="mt-2 font-semibold">{profile?.full_name || "—"}</div>
            {profile?.company_name && <div className="text-sm text-muted-foreground">{profile.company_name}</div>}
            <div className="text-sm text-muted-foreground">{profile?.phone || tx.phone_number}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground font-semibold">Payment details</div>
            <div className="mt-2 text-sm">Method: <b>M-Pesa</b></div>
            <div className="text-sm">Phone: {tx.phone_number}</div>
            {tx.mpesa_receipt && <div className="text-sm">Receipt: <b className="font-mono">{tx.mpesa_receipt}</b></div>}
            {tx.checkout_request_id && <div className="text-xs text-muted-foreground mt-1">Ref: {tx.checkout_request_id}</div>}
          </div>
        </div>

        <table className="w-full mt-6 text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2">Duration</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3">
                <div className="font-medium">{item}</div>
                <div className="text-xs text-muted-foreground">{purposeLabel}</div>
              </td>
              <td className="py-3 text-right">{tx.duration_days ? `${tx.duration_days} days` : "—"}</td>
              <td className="py-3 text-right font-semibold">KES {Number(tx.amount).toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-4 text-right font-semibold">Total</td>
              <td className="pt-4 text-right text-lg font-extrabold">KES {Number(tx.amount).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
          Thank you for your business. This is an auto-generated receipt for a completed M-Pesa transaction.
        </div>
      </div>
    </div>
  );
}
