import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X, Check, Loader2 } from "lucide-react";
import { MpesaModal } from "./MpesaModal";
import {
  renewOrUpgradeListing,
  scheduleListingDowngrade,
  cancelListingDowngrade,
  renewOrUpgradeBlog,
  scheduleBlogDowngrade,
  cancelBlogDowngrade,
  renewOrUpgradeAd,
  scheduleAdDowngrade,
  cancelAdDowngrade,
} from "@/lib/renewals.functions";
import { listActivePackages } from "@/lib/packages.functions";
import { listBlogPackages } from "@/lib/blog-submission.functions";
import { listActiveAdPackages } from "@/lib/ads.functions";

type Kind = "listing" | "blog" | "ad";

type Props = {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  /** For "listing" pass property_package_purchases.id; for "blog" pass blog_posts.id; for "ad" pass ad_campaigns.id. */
  entityId: string;
  currentPackageId?: string | null;
  currentPrice?: number;
  pendingPackageName?: string | null;
  onSuccess?: () => void;
};

const LABEL: Record<Kind, string> = {
  listing: "Listing plan",
  blog: "Blog plan",
  ad: "Ad plan",
};

export function RenewPackageDialog({
  open, onClose, kind, entityId, currentPackageId, currentPrice = 0, pendingPackageName, onSuccess,
}: Props) {
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState<{ price: number; mode: "renew" | "upgrade"; pkgId: string; pkgName: string } | null>(null);

  const listFn =
    kind === "listing" ? listActivePackages :
    kind === "blog"    ? listBlogPackages :
                          listActiveAdPackages;

  const { data: packages = [], isLoading } = useQuery<any[]>({
    queryKey: ["renew-pkgs", kind, open],
    enabled: open,
    queryFn: () => (listFn as any)(),
  });

  const renewFn = useServerFn(
    kind === "listing" ? renewOrUpgradeListing :
    kind === "blog"    ? renewOrUpgradeBlog :
                          renewOrUpgradeAd
  );
  const downgradeFn = useServerFn(
    kind === "listing" ? scheduleListingDowngrade :
    kind === "blog"    ? scheduleBlogDowngrade :
                          scheduleAdDowngrade
  );
  const cancelFn = useServerFn(
    kind === "listing" ? cancelListingDowngrade :
    kind === "blog"    ? cancelBlogDowngrade :
                          cancelAdDowngrade
  );

  const cheaper = useMemo(() => packages.filter((p) => Number(p.price) > 0 && Number(p.price) < Number(currentPrice)), [packages, currentPrice]);

  async function handleChoose(pkg: any) {
    const isCurrent = pkg.id === currentPackageId;
    const mode: "renew" | "upgrade" = isCurrent ? "renew" : Number(pkg.price) >= Number(currentPrice) ? "upgrade" : "renew";

    if (Number(pkg.price) === 0) {
      try {
        await callRenew(pkg.id, mode, "0700000000");
        toast.success(`${LABEL[kind]} ${mode === "renew" ? "renewed" : "switched"}`);
        onSuccess?.();
        onClose();
      } catch (e: any) { toast.error(e.message ?? "Failed"); }
      return;
    }
    setPaying({ price: Number(pkg.price), mode, pkgId: pkg.id, pkgName: pkg.name });
  }

  async function handleDowngrade(pkg: any) {
    try {
      await scheduleFn(pkg.id);
      toast.success(`Downgrade to ${pkg.name} scheduled`);
      onSuccess?.();
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  async function scheduleFn(pkgId: string) {
    if (kind === "listing") return (downgradeFn as any)({ data: { purchaseId: entityId, packageId: pkgId } });
    if (kind === "blog")    return (downgradeFn as any)({ data: { postId: entityId, packageId: pkgId } });
    return (downgradeFn as any)({ data: { campaignId: entityId, packageId: pkgId } });
  }

  async function cancelPending() {
    try {
      if (kind === "listing") await (cancelFn as any)({ data: { purchaseId: entityId } });
      else if (kind === "blog") await (cancelFn as any)({ data: { postId: entityId } });
      else await (cancelFn as any)({ data: { campaignId: entityId } });
      toast.success("Pending downgrade cancelled");
      onSuccess?.();
    } catch (e: any) { toast.error(e.message); }
  }

  async function callRenew(pkgId: string, mode: "renew" | "upgrade", tel: string) {
    if (kind === "listing") return (renewFn as any)({ data: { purchaseId: entityId, packageId: pkgId, mode, phone: tel } });
    if (kind === "blog")    return (renewFn as any)({ data: { postId: entityId, packageId: pkgId, mode, phone: tel } });
    return (renewFn as any)({ data: { campaignId: entityId, packageId: pkgId, mode, phone: tel } });
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
        <div className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-glow overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between p-4 border-b border-border">
            <div>
              <h3 className="font-bold text-lg">Manage your {LABEL[kind].toLowerCase()}</h3>
              <p className="text-xs text-muted-foreground mt-1">Renew the same plan, upgrade for more perks, or schedule a downgrade for the end of the cycle.</p>
              {pendingPackageName && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs bg-secondary/10 text-secondary rounded-full px-2 py-1">
                  Downgrade scheduled → <b>{pendingPackageName}</b>
                  <button onClick={cancelPending} className="underline">Cancel</button>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>
          </div>

          <div className="p-4 max-h-[65vh] overflow-y-auto">
            {isLoading ? (
              <div className="text-sm text-muted-foreground p-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading plans…</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {packages.map((p) => {
                  const isCurrent = p.id === currentPackageId;
                  const price = Number(p.price);
                  const higher = price > Number(currentPrice);
                  const lower = price < Number(currentPrice) && price > 0;
                  return (
                    <div key={p.id} className={`rounded-xl border-2 p-4 ${isCurrent ? "border-primary bg-primary-soft/30" : "border-border"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold">{p.name}</h4>
                        {isCurrent && <span className="text-[10px] font-bold uppercase text-primary">Current</span>}
                      </div>
                      <div className="mt-1 text-lg font-extrabold">KES {price.toLocaleString()}<span className="text-xs text-muted-foreground font-medium">/{p.duration_days}d</span></div>
                      {p.perks && Array.isArray(p.perks) && (
                        <ul className="mt-2 space-y-1 text-xs">
                          {p.perks.slice(0, 4).map((k: string, i: number) => (
                            <li key={i} className="flex gap-1.5"><Check className="h-3 w-3 text-primary shrink-0 mt-0.5" /> {k}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-col gap-1.5">
                        {isCurrent && (
                          <button onClick={() => handleChoose(p)} className="btn-primary btn-primary-hover text-xs w-full justify-center">Renew</button>
                        )}
                        {higher && (
                          <button onClick={() => handleChoose(p)} className="btn-primary btn-primary-hover text-xs w-full justify-center">Upgrade</button>
                        )}
                        {lower && (
                          <button onClick={() => handleDowngrade(p)} className="btn-ghost text-xs w-full justify-center">Schedule downgrade</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!isLoading && cheaper.length === 0 && Number(currentPrice) > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">No cheaper plan available to downgrade to.</p>
            )}
          </div>
        </div>
      </div>

      <MpesaModal
        open={!!paying}
        onClose={() => setPaying(null)}
        title={`${paying?.mode === "renew" ? "Renew" : "Upgrade"} — ${paying?.pkgName ?? ""}`}
        amountKes={paying?.price ?? 0}
        initiate={async (tel) => {
          setPhone(tel);
          const r: any = await callRenew(paying!.pkgId, paying!.mode, tel);
          return { checkoutRequestId: r.checkoutRequestId, customerMessage: r.customerMessage ?? "Check your phone" };
        }}
        onSuccess={() => { setPaying(null); onSuccess?.(); onClose(); }}
      />
      {phone /* keep phone in scope */ && null}
    </>
  );
}
