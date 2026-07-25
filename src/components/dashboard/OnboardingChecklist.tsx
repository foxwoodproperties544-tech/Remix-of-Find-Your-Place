import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";

type Step = {
  key: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
};

export function OnboardingChecklist() {
  const { user } = useAuth();
  const { isAgent } = useRoles();

  const { data } = useQuery({
    queryKey: ["onboarding", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [prof, listings, subs, kyc] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, phone_verified, avatar_url, bio, company_name, tier, kyc_status").eq("id", user!.id).maybeSingle(),
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("owner_id", user!.id),
        supabase.from("property_package_purchases").select("id", { count: "exact", head: true }).eq("owner_id", user!.id).eq("status", "active"),
        supabase.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return {
        profile: prof.data,
        listingsCount: listings.count ?? 0,
        hasSubscription: (subs.count ?? 0) > 0,
        hasKyc: (kyc.count ?? 0) > 0,
      };
    },
  });

  if (!user || !data || !isAgent) return null;

  const p = data.profile;
  const steps: Step[] = [
    {
      key: "profile",
      label: "Complete your agent profile",
      done: !!(p?.full_name && p?.bio && p?.company_name),
      href: "/dashboard/profile",
      cta: "Edit profile",
    },
    {
      key: "phone",
      label: "Verify your phone number",
      done: !!p?.phone_verified,
      href: "/dashboard/account",
      cta: "Verify phone",
    },
    {
      key: "kyc",
      label: "Submit KYC documents",
      done: p?.kyc_status === "approved" || p?.kyc_status === "pending" || data.hasKyc,
      href: "/dashboard/kyc",
      cta: "Start KYC",
    },
    {
      key: "listing",
      label: "Publish your first listing",
      done: data.listingsCount > 0,
      href: "/dashboard/new",
      cta: "Add listing",
    },
    {
      key: "subscription",
      label: "Choose an agent plan",
      done: (p?.tier && p.tier !== "free") || data.hasSubscription,
      href: "/dashboard/upgrade",
      cta: "See plans",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  if (doneCount === steps.length) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft to-background p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Getting started</span>
          </div>
          <h2 className="mt-1 text-lg font-bold">Set up your agent account</h2>
          <p className="text-sm text-muted-foreground">Finish these steps so buyers can find and trust you.</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-primary">{pct}%</div>
          <div className="text-[11px] text-muted-foreground">{doneCount} of {steps.length}</div>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-5 space-y-2">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              {s.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <span className={`text-sm ${s.done ? "text-muted-foreground line-through" : "font-medium"}`}>{s.label}</span>
            </div>
            {!s.done && (
              <Link to={s.href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0">
                {s.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
