import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Home, PlusCircle, Inbox, Users2, CalendarDays, CalendarCheck,
  Star, Search, Heart, ShieldCheck, FileText, Settings, LogOut, Menu, X, Bell, UserCog,
} from "lucide-react";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: any; end?: boolean };

function useNav(): { section: string; items: NavItem[] }[] {
  const { isAdmin, isAgent } = useRoles();
  const sections: { section: string; items: NavItem[] }[] = [];

  sections.push({
    section: "Account",
    items: [
      { to: "/dashboard/account", label: "Overview", icon: LayoutDashboard },
      { to: "/dashboard/profile", label: "My profile", icon: UserCog },
      { to: "/dashboard/kyc", label: "Verify identity", icon: ShieldCheck },
      { to: "/favorites", label: "Favorites", icon: Heart },
      { to: "/saved-searches", label: "Saved searches", icon: Search },
      { to: "/dashboard/my-appointments", label: "My viewings", icon: CalendarDays },
      { to: "/dashboard/blog", label: "Write a blog", icon: FileText },

    ],
  });


  if (isAgent || isAdmin) {
    sections.push({
      section: "Listings",
      items: [
        { to: "/dashboard", label: "My listings", icon: Home, end: true },
        { to: "/dashboard/new", label: "New listing", icon: PlusCircle },
        { to: "/dashboard/inquiries", label: "Inquiries", icon: Inbox },
        { to: "/dashboard/leads", label: "CRM · Leads", icon: Users2 },
        { to: "/dashboard/crm", label: "CRM board", icon: LayoutDashboard },
        { to: "/dashboard/appointments", label: "Appointments", icon: CalendarCheck },
        { to: "/dashboard/upgrade", label: "Upgrade", icon: Star },
        { to: "/dashboard/advertise", label: "Advertise", icon: PlusCircle },
        { to: "/dashboard/my-ads", label: "My ads", icon: Star },
        { to: "/dashboard/ad-analytics", label: "Ad analytics", icon: LayoutDashboard },

      ],
    });
  }

  if (isAdmin) {
    sections.push({
      section: "Admin",
      items: [
        { to: "/admin", label: "Moderation", icon: ShieldCheck, end: true },
        { to: "/admin/analytics", label: "Analytics", icon: LayoutDashboard },
        { to: "/admin/users", label: "Users & roles", icon: UserCog },
        { to: "/admin/verifications", label: "Listing verifications", icon: ShieldCheck },
        { to: "/admin/kyc", label: "Agent KYC", icon: UserCog },

        { to: "/admin/packages", label: "Listing packages", icon: PlusCircle },
        { to: "/admin/ads", label: "Ad packages", icon: PlusCircle },
        { to: "/admin/ad-campaigns", label: "Ad campaigns", icon: ShieldCheck },
        { to: "/admin/subscriptions", label: "Subscriptions", icon: Star },
        { to: "/admin/notifications", label: "Notifications", icon: Bell },
        { to: "/admin/blog", label: "Blog submissions", icon: FileText },
        { to: "/admin/blog-packages", label: "Blog packages", icon: PlusCircle },
      ],
    });
  }

  return sections;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin, isAgent } = useRoles();
  const sections = useNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const roleLabel = isAdmin ? "Admin" : isAgent ? "Agent" : "Customer";

  const { data: unread } = useQuery({
    queryKey: ["notif-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("read", false);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    window.location.href = "/";
  }

  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="mx-auto max-w-[1400px] flex">
        {/* Sidebar */}
        <aside
          className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-72 transform bg-primary text-primary-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
        >
          <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
            <Link to="/" className="font-bold text-lg tracking-tight">Foxwood</Link>
            <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>

          <nav className="px-3 py-4 space-y-6 overflow-y-auto h-[calc(100%-4rem)]">
            {sections.map((s) => (
              <div key={s.section}>
                <div className="px-3 text-[10px] uppercase tracking-wider text-primary-foreground/60 font-semibold mb-2">{s.section}</div>
                <ul className="space-y-1">
                  {s.items.map((it) => {
                    const active = isActive(it.to, it.end);
                    return (
                      <li key={it.to}>
                        <Link
                          to={it.to}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-white/15 text-white" : "text-primary-foreground/80 hover:bg-white/10 hover:text-white"}`}
                        >
                          <it.icon className="h-4 w-4" /> {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <div className="pt-4 border-t border-white/10">
              <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </nav>
        </aside>

        {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <div className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Signed in as</div>
                <div className="text-sm font-semibold truncate max-w-[220px] sm:max-w-none">{user?.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary-soft text-primary text-xs font-semibold px-2.5 py-1">
                <ShieldCheck className="h-3 w-3" /> {roleLabel}
              </span>
              <Link to="/dashboard/account" className="relative rounded-full p-2 hover:bg-muted" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {(unread ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white px-1">{unread}</span>
                )}
              </Link>
              <Link to="/dashboard/account" className="rounded-full p-2 hover:bg-muted" aria-label="Account settings"><Settings className="h-5 w-5" /></Link>
            </div>
          </div>

          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
