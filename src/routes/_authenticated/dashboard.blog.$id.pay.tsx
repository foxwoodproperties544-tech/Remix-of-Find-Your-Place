import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listBlogPackages, startBlogSubmissionPayment, getMyBlogPost } from "@/lib/blog-submission.functions";
import { getPaymentStatus } from "@/lib/payments.functions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Check, Loader2, Star, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { SupportBanner } from "@/components/site/SupportBanner";

export const Route = createFileRoute("/_authenticated/dashboard/blog/$id/pay")({
  component: PayForBlog,
  head: () => ({ meta: [{ title: "Choose a package — Foxwood Blog" }, { name: "robots", content: "noindex" }] }),
});

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? "text-foreground" : "text-muted-foreground/50 line-through"}`}>
      <Check className={`h-4 w-4 ${ok ? "text-primary" : "text-muted-foreground/40"}`} /> {label}
    </div>
  );
}

function PayForBlog() {
  const { id } = useParams({ from: "/_authenticated/dashboard/blog/$id/pay" });
  const nav = useNavigate();
  const start = useServerFn(startBlogSubmissionPayment);
  const check = useServerFn(getPaymentStatus);
  const load = useServerFn(getMyBlogPost);
  const packagesFn = useServerFn(listBlogPackages);

  const [selected, setSelected] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const { data: post } = useQuery({ queryKey: ["my-blog-post", id], queryFn: () => load({ data: { id } }) });
  const { data: pkgs, isLoading } = useQuery({ queryKey: ["blog-packages"], queryFn: () => packagesFn() });

  const activePkg = pkgs?.find((p: any) => p.id === selected);

  async function pay() {
    if (!activePkg) return toast.error("Pick a package");
    if (!phone && Number(activePkg.price) > 0) return toast.error("Enter your M-Pesa phone");
    try {
      const res: any = await start({ data: { postId: id, packageId: activePkg.id, phone: phone || "0700000000" } });
      if (res.free) {
        toast.success("Submitted for admin review");
        nav({ to: "/dashboard/blog" });
        return;
      }
      toast.success(res.customerMessage ?? "Check your phone to authorize payment");
      setPending(res.checkoutRequestId); setPolling(true);
      const iv = setInterval(async () => {
        const st: any = await check({ data: { checkoutRequestId: res.checkoutRequestId } });
        if (!st) return;
        if (st.status === "success") {
          clearInterval(iv); setPolling(false);
          toast.success("Payment received — your post is now awaiting admin review");
          nav({ to: "/dashboard/blog" });
        } else if (st.status === "failed" || st.status === "cancelled") {
          clearInterval(iv); setPolling(false);
          toast.error(st.result_desc ?? "Payment failed");
        }
      }, 4000);
      setTimeout(() => { clearInterval(iv); setPolling(false); }, 120_000);
    } catch (e: any) { toast.error(e.message ?? "Payment failed"); }
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <SupportBanner context="payment" whatsappMessage="Hello Foxwood Properties, I need help completing a blog package payment." />
      </div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" /> Submit your blog post
          </div>
          <h1 className="text-2xl font-bold mt-2">Choose a blog package</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {post?.title && <>For <span className="font-medium text-foreground">{post.title}</span>. </>}
            Payment unlocks admin review — once approved, your article is published.
          </p>
        </div>
        <Link to="/dashboard/blog" className="btn-ghost text-sm self-start">Back to my blogs</Link>
      </div>

      {isLoading && <div className="mt-8 text-sm text-muted-foreground">Loading packages…</div>}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {pkgs?.map((p: any) => {
          const chosen = selected === p.id;
          const features: string[] = Array.isArray(p.features) ? p.features : [];
          return (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`text-left rounded-2xl border-2 p-5 bg-card transition-all ${chosen ? "border-primary shadow-lg scale-[1.01]" : "border-border hover:border-primary/40"}`}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">{p.name}</div>
                {p.is_sponsored && <span className="text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">Sponsored</span>}
                {p.is_featured && !p.is_sponsored && <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Featured</span>}
              </div>
              <div className="mt-2 text-3xl font-black">
                {Number(p.price) === 0 ? "Free" : `KSh ${Number(p.price).toLocaleString()}`}
              </div>
              <div className="text-xs text-muted-foreground">{p.duration_days} days publication</div>
              {p.description && <p className="text-xs text-muted-foreground mt-3">{p.description}</p>}
              <div className="mt-4 space-y-1.5">
                <Row ok={true} label={`${p.duration_days}-day publication`} />
                <Row ok={p.is_featured} label="Featured on blog homepage" />
                <Row ok={p.homepage_placement} label="Site homepage exposure" />
                <Row ok={p.priority_placement} label="Priority in listings" />
                <Row ok={p.is_sponsored} label={`Sponsored badge`} />
                {features.map((f, i) => <Row key={i} ok={true} label={f} />)}
              </div>
            </button>
          );
        })}
      </div>

      {activePkg && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 max-w-2xl">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" /> {activePkg.name} · {Number(activePkg.price) === 0 ? "Free" : `KSh ${Number(activePkg.price).toLocaleString()}`}
          </div>
          {Number(activePkg.price) > 0 && (
            <>
              <label className="mt-4 block text-xs font-semibold">M-Pesa phone</label>
              <div className="mt-1 flex gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" /> +254
                </div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678"
                  className="flex-1 rounded-lg border border-border bg-field px-3 py-2 text-sm" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">You'll get an STK push to authorize KSh {Number(activePkg.price).toLocaleString()}.</p>
            </>
          )}
          <button onClick={pay} disabled={polling}
            className="mt-4 btn-primary btn-primary-hover inline-flex items-center gap-2">
            {polling ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for payment…</>
              : <><ShieldCheck className="h-4 w-4" /> {Number(activePkg.price) === 0 ? "Submit for review" : "Pay & submit for review"}</>}
          </button>
          {pending && <div className="mt-2 text-xs text-muted-foreground">Ref: {pending}</div>}
        </div>
      )}
    </DashboardShell>
  );
}
