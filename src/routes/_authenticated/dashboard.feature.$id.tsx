import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { FEATURED_PLANS } from "@/lib/pricing";
import { startFeaturedPayment } from "@/lib/payments.functions";
import { MpesaModal } from "@/components/site/MpesaModal";
import { Star, ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/feature/$id")({
  component: FeatureListing,
  head: () => ({ meta: [{ title: "Feature listing — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function FeatureListing() {
  const { id } = useParams({ from: "/_authenticated/dashboard/feature/$id" });
  const nav = useNavigate();
  const [selected, setSelected] = useState(FEATURED_PLANS[1]);
  const [pay, setPay] = useState(false);
  const startFn = useServerFn(startFeaturedPayment);

  const { data: prop } = useQuery({
    queryKey: ["prop-min", id],
    queryFn: async () => (await supabase.from("properties").select("id,title,is_featured,featured_until").eq("id", id).maybeSingle()).data,
  });

  return (
    <div className="container-page py-10 max-w-2xl">
      <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
      <div className="mt-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary bg-secondary/15 rounded-full px-3 py-1"><Star className="h-3.5 w-3.5" /> Featured listing</div>
        <h1 className="text-2xl font-bold mt-2">Boost visibility</h1>
        <p className="text-sm text-muted-foreground mt-1 truncate">{prop?.title ?? "Loading…"}</p>
        {prop?.is_featured && prop.featured_until && (
          <p className="text-xs text-primary mt-2">Already featured until {new Date(prop.featured_until).toLocaleDateString()}</p>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {FEATURED_PLANS.map((p) => (
          <label key={p.id} className={`rounded-2xl border-2 p-5 cursor-pointer transition ${selected.id === p.id ? "border-primary shadow-glow" : "border-border hover:border-primary/40"} bg-card`}>
            <input type="radio" checked={selected.id === p.id} onChange={() => setSelected(p)} className="sr-only" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.label}</span>
              {p.highlight && <span className="text-[10px] font-semibold uppercase text-primary bg-primary-soft px-2 py-0.5 rounded-full">Best value</span>}
            </div>
            <div className="mt-1 text-2xl font-extrabold">KES {p.price.toLocaleString()}</div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Top of search results</li>
              <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Featured badge on card</li>
              <li className="flex gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Shown on home page</li>
            </ul>
          </label>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={() => nav({ to: "/dashboard" })} className="btn-ghost">Cancel</button>
        <button onClick={() => setPay(true)} className="btn-primary btn-primary-hover">Pay with M-Pesa</button>
      </div>

      <MpesaModal
        open={pay}
        onClose={() => setPay(false)}
        title={selected.label}
        amountKes={selected.price}
        initiate={async (phone) => startFn({ data: { propertyId: id, planId: selected.id, phone } })}
        onSuccess={() => { setPay(false); nav({ to: "/dashboard" }); }}
      />
    </div>
  );
}
