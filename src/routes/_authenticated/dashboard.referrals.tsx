import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Users2, Copy, Share2, Gift, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/referrals")({
  component: ReferralsPage,
  head: () => ({ meta: [{ title: "Refer & earn — Foxwood Properties" }] }),
});

function ReferralsPage() {
  const [code, setCode] = useState<string | null>(null);
  const [referred, setReferred] = useState<{ id: string; full_name: string | null; created_at: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: me } = await supabase.from("profiles").select("referral_code").eq("id", uid).maybeSingle();
      setCode((me as any)?.referral_code ?? null);
      const { data: refs } = await supabase
        .from("profiles").select("id, full_name, created_at")
        .eq("referred_by", uid).order("created_at", { ascending: false });
      setReferred((refs as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const shareLink = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${code}` : "";

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 1600);
  }

  async function share() {
    if (!shareLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Foxwood Properties",
          text: "Find your next home on Foxwood Properties — Kenya's trusted property marketplace.",
          url: shareLink,
        });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <Gift className="h-3.5 w-3.5" /> Referral program
          </div>
          <h1 className="text-3xl font-bold mt-2">Refer & earn</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share your unique link. Everyone who signs up through it is credited to you — earn rewards as they grow with Foxwood.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Your referral code</div>
          <div className="mt-2 text-3xl font-black tracking-widest text-primary">{code ?? "—"}</div>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <input
              readOnly value={shareLink}
              className="flex-1 min-w-[240px] rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            />
            <button onClick={copyLink} className="btn-ghost text-sm">
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
            <button onClick={share} className="btn-primary text-sm"><Share2 className="h-4 w-4" /> Share</button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">People you referred</h2>
            <span className="ml-auto text-2xl font-bold">{referred.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground mt-4">Loading…</p>
          ) : referred.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">No one yet. Share your link on WhatsApp, Twitter, or with friends.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {referred.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-medium">{r.full_name ?? "New member"}</span>
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
