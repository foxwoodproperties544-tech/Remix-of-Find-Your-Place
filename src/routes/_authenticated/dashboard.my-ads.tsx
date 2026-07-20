import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyCampaigns } from "@/lib/ads.functions";
import { Megaphone, Eye, MousePointerClick, ExternalLink, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/my-ads")({
  component: MyAds,
  head: () => ({ meta: [{ title: "My ad campaigns — Foxwood" }, { name: "robots", content: "noindex" }] }),
});

function statusStyle(s: string) {
  if (s === "active") return "bg-primary text-primary-foreground";
  if (s === "pending_review") return "bg-secondary text-white";
  if (s === "rejected") return "bg-destructive text-destructive-foreground";
  if (s === "pending_payment") return "bg-yellow-500 text-white";
  return "bg-muted text-muted-foreground";
}

function MyAds() {
  const listFn = useServerFn(listMyCampaigns);
  const { data, isLoading } = useQuery({
    queryKey: ["my-ad-campaigns"],
    queryFn: () => listFn(),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-secondary bg-secondary/10 rounded-full px-3 py-1">
            <Megaphone className="h-3.5 w-3.5" /> Advertising
          </div>
          <h1 className="text-3xl font-bold mt-2">My ad campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Track performance, renew, or create new campaigns.</p>
        </div>
        <Link to="/dashboard/advertise" className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> New ad
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="col-span-full text-sm text-muted-foreground border border-dashed border-border rounded-2xl p-8 text-center">
            No campaigns yet. <Link to="/dashboard/advertise" className="text-primary font-semibold hover:underline">Create your first ad</Link>.
          </div>
        )}
        {data?.map((c: any) => {
          const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="aspect-[16/6] bg-muted overflow-hidden">
                <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold truncate">{c.title}</div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${statusStyle(c.status)}`}>{c.status.replace("_", " ")}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.ad_packages?.name} · {c.placement.replace("_", " ")}
                </div>
                {c.expires_at && <div className="mt-1 text-xs text-muted-foreground">Runs until {new Date(c.expires_at).toLocaleDateString()}</div>}
                {c.admin_notes && <div className="mt-2 text-xs text-destructive">Admin note: {c.admin_notes}</div>}
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <div className="inline-flex items-center gap-1 text-muted-foreground"><Eye className="h-3 w-3" /> Impr.</div>
                    <div className="font-bold text-sm">{c.impressions.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <div className="inline-flex items-center gap-1 text-muted-foreground"><MousePointerClick className="h-3 w-3" /> Clicks</div>
                    <div className="font-bold text-sm">{c.clicks.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg bg-muted p-2 text-center">
                    <div className="text-muted-foreground">CTR</div>
                    <div className="font-bold text-sm">{ctr}%</div>
                  </div>
                </div>
                <a href={c.target_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> {c.target_url}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
