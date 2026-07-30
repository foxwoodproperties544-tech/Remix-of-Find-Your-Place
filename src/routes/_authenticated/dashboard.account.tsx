import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";
import { Heart, Search, CalendarDays, Bell, User, Home, ShieldCheck } from "lucide-react";
import { PhoneVerifyCard } from "@/components/site/PhoneVerifyCard";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { PrivacyDataCard } from "@/components/dashboard/PrivacyDataCard";

export const Route = createFileRoute("/_authenticated/dashboard/account")({
  component: Account,
  head: () => ({ meta: [{ title: "My account — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function Account() {
  const { user } = useAuth();
  const { isAgent, isAdmin } = useRoles();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const stats = useQuery({
    queryKey: ["account-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [favs, searches, viewings, notifs] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("viewings").select("id", { count: "exact", head: true }).eq("requester_id", user!.id),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("read", false),
      ]);
      return {
        favorites: favs.count ?? 0,
        searches: searches.count ?? 0,
        viewings: viewings.count ?? 0,
        unread: notifs.count ?? 0,
      };
    },
  });

  const notifs = useQuery({
    queryKey: ["notifications-recent", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data;
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name ?? "");
      setPhone(profile.data.phone ?? "");
      setWhatsapp(profile.data.whatsapp ?? "");
      setCompany(profile.data.company_name ?? "");
      setBio(profile.data.bio ?? "");
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName, phone, whatsapp, company_name: company, bio,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications-recent"] }); qc.invalidateQueries({ queryKey: ["account-stats"] }); qc.invalidateQueries({ queryKey: ["notif-unread"] }); },
  });

  const s = stats.data;
  const cards = [
    { label: "Saved favorites", value: s?.favorites ?? "—", icon: Heart, to: "/favorites" },
    { label: "Saved searches", value: s?.searches ?? "—", icon: Search, to: "/saved-searches" },
    { label: "Booked viewings", value: s?.viewings ?? "—", icon: CalendarDays, to: "/dashboard/my-appointments" },
    { label: "Unread alerts", value: s?.unread ?? "—", icon: Bell, to: "/dashboard/account" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""}</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, favorites and property activity.</p>
        </div>
        {(isAgent || isAdmin) && (
          <Link to="/dashboard" className="btn-primary btn-primary-hover !py-2 !px-4 text-sm">
            <Home className="h-4 w-4" /> Go to agent dashboard
          </Link>
        )}
      </header>


      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors">
            <div className="flex items-center justify-between">
              <c.icon className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{c.value}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">{c.label}</div>
          </Link>
        ))}
      </section>
      <OnboardingChecklist />

      <KycCallout />

      <PhoneVerifyCard />



      {!isAgent && !isAdmin && (
        <section className="rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 p-5 flex items-start gap-4 flex-wrap">
          <Home className="h-6 w-6 text-primary mt-1" />
          <div className="flex-1 min-w-[240px]">
            <h3 className="font-semibold">List your own property</h3>
            <p className="text-sm text-muted-foreground mt-1">Pick a listing package, add your property details, and reach thousands of buyers and renters on Foxwood.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/listing-packages" className="btn-primary btn-primary-hover">Get started</Link>
            <Link to="/dashboard/upgrade" className="btn-ghost">Become an agent</Link>
          </div>
        </section>
      )}

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Profile details</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="+2547…" />
            <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+2547…" />
            <Field label="Company (optional)" value={company} onChange={setCompany} />
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">About you</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button disabled={save.isPending} onClick={() => save.mutate()} className="btn-primary btn-primary-hover">
              {save.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Notifications</h2></div>
            {(s?.unread ?? 0) > 0 && (
              <button onClick={() => markAllRead.mutate()} className="text-xs text-primary font-semibold">Mark all read</button>
            )}
          </div>
          {notifs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (notifs.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="space-y-3">
              {notifs.data!.map((n: any) => (
                <li key={n.id} className={`text-sm border-l-2 pl-3 ${n.read ? "border-border" : "border-secondary"}`}>
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <PrivacyDataCard />
    </div>
  );
}

function KycCallout() {
  const { user } = useAuth();
  const { data: kyc } = useQuery({
    queryKey: ["my-kyc-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("kyc_submissions").select("status, created_at, reviewed_at, reviewer_notes").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const status = kyc?.status ?? "none";

  const config: Record<string, { tone: string; title: string; body: string; cta: string }> = {
    none: { tone: "border-primary/40 bg-primary-soft/40 text-primary", title: "Get your Verified badge", body: "Verify your identity to build trust with buyers and unlock premium listing features.", cta: "Verify identity" },
    pending: { tone: "border-secondary/30 bg-secondary/10 text-foreground", title: "Verification in progress", body: "Your KYC submission is under review. We typically respond within 24–48 hours.", cta: "View details" },
    approved: { tone: "border-primary/30 bg-primary-soft text-primary", title: "You are verified", body: "Your identity is verified. Buyers will see the Verified badge on your profile and listings.", cta: "Manage verification" },
    rejected: { tone: "border-destructive/30 bg-destructive/10 text-foreground", title: "Verification rejected", body: kyc?.reviewer_notes ? `Reason: ${kyc.reviewer_notes}` : "Please re-submit with clearer documents.", cta: "Re-submit" },
  };

  const c = config[status] ?? config.none;

  return (
    <section className={`rounded-2xl border p-5 flex items-start gap-4 flex-wrap ${c.tone}`}>
      <ShieldCheck className="h-6 w-6 mt-1 shrink-0" />
      <div className="flex-1 min-w-[240px]">
        <h3 className="font-semibold">{c.title}</h3>
        <p className="text-sm opacity-90 mt-1">{c.body}</p>
      </div>
      <Link to="/dashboard/kyc" className="btn-primary btn-primary-hover">{c.cta}</Link>
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
