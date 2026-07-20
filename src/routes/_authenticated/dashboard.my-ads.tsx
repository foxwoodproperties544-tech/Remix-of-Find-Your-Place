import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listMyCampaigns,
  pauseCampaign,
  resumeCampaign,
  updateCampaignSchedule,
} from "@/lib/ads.functions";
import { Megaphone, Eye, MousePointerClick, ExternalLink, Plus, Pause, Play, CalendarDays, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/my-ads")({
  component: MyAds,
  head: () => ({ meta: [{ title: "My ad campaigns — Foxwood" }, { name: "robots", content: "noindex" }] }),
});

function statusStyle(s: string) {
  if (s === "active") return "bg-primary text-primary-foreground";
  if (s === "paused") return "bg-muted-foreground text-white";
  if (s === "pending_review") return "bg-secondary text-white";
  if (s === "rejected") return "bg-destructive text-destructive-foreground";
  if (s === "pending_payment") return "bg-yellow-500 text-white";
  return "bg-muted text-muted-foreground";
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MyAds() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyCampaigns);
  const pauseFn = useServerFn(pauseCampaign);
  const resumeFn = useServerFn(resumeCampaign);
  const scheduleFn = useServerFn(updateCampaignSchedule);

  const { data, isLoading } = useQuery({
    queryKey: ["my-ad-campaigns"],
    queryFn: () => listFn(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["my-ad-campaigns"] });

  const pause = useMutation({
    mutationFn: (id: string) => pauseFn({ data: { id } }),
    onSuccess: () => { toast.success("Campaign paused"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const resume = useMutation({
    mutationFn: (id: string) => resumeFn({ data: { id } }),
    onSuccess: () => { toast.success("Campaign resumed"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [scheduleFor, setScheduleFor] = useState<any | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const save = useMutation({
    mutationFn: () => scheduleFn({
      data: {
        id: scheduleFor!.id,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
    }),
    onSuccess: () => { toast.success("Schedule updated"); invalidate(); setScheduleFor(null); },
    onError: (e: any) => toast.error(e.message),
  });

  function openSchedule(c: any) {
    setScheduleFor(c);
    setStartsAt(toLocalInput(c.starts_at));
    setExpiresAt(toLocalInput(c.expires_at));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-secondary bg-secondary/10 rounded-full px-3 py-1">
            <Megaphone className="h-3.5 w-3.5" /> Advertising
          </div>
          <h1 className="text-3xl font-bold mt-2">My ad campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Pause, reschedule, and track performance.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/ad-analytics" className="btn-ghost text-sm inline-flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Analytics
          </Link>
          <Link to="/dashboard/advertise" className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> New ad
          </Link>
        </div>
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
          const canPause = c.status === "active" || c.status === "pending_review";
          const canResume = c.status === "paused";
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
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.starts_at && <>Starts {new Date(c.starts_at).toLocaleString()} · </>}
                  {c.expires_at ? <>Ends {new Date(c.expires_at).toLocaleString()}</> : "No end date"}
                </div>
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
                <div className="mt-3 flex gap-2 flex-wrap">
                  {canPause && (
                    <button onClick={() => pause.mutate(c.id)} className="btn-ghost text-xs inline-flex items-center gap-1">
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                  )}
                  {canResume && (
                    <button onClick={() => resume.mutate(c.id)} className="btn-primary btn-primary-hover text-xs inline-flex items-center gap-1">
                      <Play className="h-3.5 w-3.5" /> Resume
                    </button>
                  )}
                  <button onClick={() => openSchedule(c)} className="btn-ghost text-xs inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Schedule
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {scheduleFor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl">
            <div className="p-4 border-b border-border font-semibold">Schedule "{scheduleFor.title}"</div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold">Start</label>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold">End</label>
                <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">The ad only renders publicly between Start and End (in addition to its status).</p>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setScheduleFor(null)} className="btn-ghost text-sm">Cancel</button>
              <button disabled={save.isPending} onClick={() => save.mutate()} className="btn-primary btn-primary-hover text-sm">
                {save.isPending ? "Saving…" : "Save schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
