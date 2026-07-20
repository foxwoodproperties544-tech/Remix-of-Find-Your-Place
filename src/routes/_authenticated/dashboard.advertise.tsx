import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listActiveAdPackages, startAdPayment } from "@/lib/ads.functions";
import { getPaymentStatus } from "@/lib/payments.functions";
import { toast } from "sonner";
import { Megaphone, Loader2, Phone, ShieldCheck, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/advertise")({
  component: Advertise,
  head: () => ({ meta: [{ title: "Advertise on Foxwood" }, { name: "robots", content: "noindex" }] }),
});

const PLACEMENT_LABEL: Record<string, string> = {
  homepage_hero: "Homepage hero",
  homepage_banner: "Homepage banner",
  properties_top: "Properties top",
  sidebar: "Sidebar",
  blog_inline: "Blog inline",
};

function Advertise() {
  const nav = useNavigate();
  const listFn = useServerFn(listActiveAdPackages);
  const start = useServerFn(startAdPayment);
  const check = useServerFn(getPaymentStatus);

  const [selected, setSelected] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [polling, setPolling] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const { data: pkgs, isLoading } = useQuery({
    queryKey: ["active-ad-packages"],
    queryFn: () => listFn(),
  });

  async function pay() {
    if (!selected) return toast.error("Pick an ad package");
    if (!title.trim()) return toast.error("Add a headline");
    try { new URL(imageUrl); } catch { return toast.error("Valid image URL required"); }
    try { new URL(targetUrl); } catch { return toast.error("Valid destination URL required"); }
    if (Number(selected.price) > 0 && !phone) return toast.error("Enter your M-Pesa phone");
    try {
      const res: any = await start({ data: {
        packageId: selected.id, title, image_url: imageUrl, target_url: targetUrl,
        phone: phone || "0700000000",
      }});
      if (res.free) {
        toast.success("Submitted for admin review");
        nav({ to: "/dashboard/my-ads" });
        return;
      }
      toast.success(res.customerMessage ?? "Check your phone to authorize");
      setPending(res.checkoutRequestId);
      setPolling(true);
      const iv = setInterval(async () => {
        const st: any = await check({ data: { checkoutRequestId: res.checkoutRequestId } });
        if (!st) return;
        if (st.status === "success") {
          clearInterval(iv); setPolling(false);
          toast.success("Payment received — ad awaiting admin review");
          nav({ to: "/dashboard/my-ads" });
        } else if (st.status === "failed" || st.status === "cancelled") {
          clearInterval(iv); setPolling(false);
          toast.error(st.result_desc ?? "Payment failed");
        }
      }, 4000);
      setTimeout(() => { clearInterval(iv); setPolling(false); }, 120_000);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-secondary bg-secondary/10 rounded-full px-3 py-1">
            <Megaphone className="h-3.5 w-3.5" /> Advertise
          </div>
          <h1 className="text-3xl font-bold mt-2">Promote your brand on Foxwood</h1>
          <p className="text-sm text-muted-foreground mt-1">Buy a banner slot, upload your creative, pay via M-Pesa, and our team activates it after quick review.</p>
        </div>
        <Link to="/dashboard/my-ads" className="btn-ghost text-sm">My campaigns</Link>
      </div>

      {isLoading && <div className="mt-8 text-sm text-muted-foreground">Loading packages…</div>}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {pkgs?.map((p: any) => {
          const chosen = selected?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`text-left rounded-2xl border-2 p-5 bg-card transition-all ${chosen ? "border-secondary shadow-lg scale-[1.01]" : "border-border hover:border-secondary/40"}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">{p.name}</div>
                <span className="text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                  {PLACEMENT_LABEL[p.placement] ?? p.placement}
                </span>
              </div>
              <div className="mt-2 text-3xl font-black">
                {Number(p.price) === 0 ? "Free" : `KSh ${Number(p.price).toLocaleString()}`}
              </div>
              <div className="text-xs text-muted-foreground">{p.duration_days} days · {p.width_px}×{p.height_px}px</div>
              {p.description && <p className="text-xs text-muted-foreground mt-3">{p.description}</p>}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 max-w-2xl space-y-4">
          <div className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-secondary" /> {selected.name} · KSh {Number(selected.price).toLocaleString()}
          </div>

          <div>
            <label className="text-xs font-semibold">Ad headline</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Off-plan apartments in Kilimani" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold">Creative image URL <span className="text-muted-foreground">({selected.width_px}×{selected.height_px})</span></label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            {imageUrl && (
              <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted aspect-[16/5]">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold">Destination URL (where clicks go)</label>
            <input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>

          {Number(selected.price) > 0 && (
            <div>
              <label className="text-xs font-semibold">M-Pesa phone</label>
              <div className="mt-1 flex gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" /> +254</div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          <button onClick={pay} disabled={polling} className="btn-primary btn-primary-hover inline-flex items-center gap-2">
            {polling ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for payment…</> :
              <><ShieldCheck className="h-4 w-4" /> {Number(selected.price) === 0 ? "Submit for review" : `Pay KSh ${Number(selected.price).toLocaleString()}`}</>}
          </button>
          {pending && <div className="text-xs text-muted-foreground">Ref: {pending}</div>}
        </div>
      )}
    </div>
  );
}
