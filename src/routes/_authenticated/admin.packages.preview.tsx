import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { adminListPackages } from "@/lib/packages.functions";
import { PageHero } from "@/components/site/PageHero";
import { PricingGrid, type PricingPackage } from "@/components/site/PricingGrid";
import { ShieldCheck, Crown, Eye, ArrowLeft } from "lucide-react";
import heroTools from "@/assets/hero-tools.jpg";

export const Route = createFileRoute("/_authenticated/admin/packages.preview")({
  component: AdminPricingPreview,
  head: () => ({ meta: [{ title: "Pricing page preview — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

function AdminPricingPreview() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const [showInactive, setShowInactive] = useState(false);

  const listFn = useServerFn(adminListPackages);
  const { data: all, isLoading } = useQuery({
    queryKey: ["admin-packages"],
    enabled: isAdmin,
    queryFn: () => listFn(),
  });

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-xl font-bold mt-3">Admins only</h1>
        <button onClick={() => nav({ to: "/dashboard/account" })} className="btn-primary btn-primary-hover mt-4">Back</button>
      </div>
    );
  }

  const packages: PricingPackage[] = ((all ?? []) as PricingPackage[])
    .filter((p) => (showInactive ? true : p.active));

  return (
    <div>
      {/* Admin toolbar */}
      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Pricing page preview</div>
            <p className="text-xs text-muted-foreground">
              This mirrors the public <code>/pricing</code> page. Only <b>Active</b> packages appear publicly — toggle below to preview
              inactive ones before publishing.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium bg-background rounded-full px-3 py-1.5 border border-border">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Include inactive
          </label>
          <Link to="/admin/packages" className="btn-ghost text-sm inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to editor
          </Link>
          <Link to="/pricing" target="_blank" className="btn-primary btn-primary-hover text-sm">
            Open live page
          </Link>
        </div>
      </div>

      {/* Preview rendered exactly like the public page */}
      <div className="rounded-2xl border border-border overflow-hidden bg-background">
        <PageHero
          image={heroTools}
          size="sm"
          eyebrow={<><Crown className="h-3.5 w-3.5" /> Listing packages</>}
          title="Choose the right package"
          subtitle="Simple, transparent pricing. Pay with M-Pesa. Upgrade any time."
        />
        <div className="container-page py-10">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Loading preview…</div>
          ) : (
            <>
              {showInactive && packages.some((p) => !p.active) && (
                <div className="text-center text-xs text-muted-foreground mb-4">
                  Inactive packages are shown with a dashed outline for preview only. They will <b>not</b> appear on the live pricing page.
                </div>
              )}
              <div className="relative">
                {/* Overlay dashed styles onto inactive cards */}
                <style>{`
                  .preview-wrap [data-inactive="1"] { outline: 2px dashed hsl(var(--muted-foreground)); outline-offset: -2px; opacity: .75; }
                `}</style>
                <div className="preview-wrap">
                  <PricingGrid packages={packages} preview />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
