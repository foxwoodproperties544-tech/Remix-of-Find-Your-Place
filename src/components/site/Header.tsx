import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Phone, User as UserIcon, LogOut, LayoutDashboard, Heart, PlusCircle, ShieldCheck, Inbox, Bell, Users as UsersIcon, TrendingUp, CalendarClock, ChevronDown, Home, Megaphone, PenSquare, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const nav = [
  { to: "/properties", label: "Buy", search: { category: "For Sale" } as const },
  { to: "/properties", label: "Rent", search: { category: "For Rent" } as const },
  { to: "/properties", label: "Lease", search: { category: "For Lease" } as const },
  { to: "/properties", label: "Airbnbs", search: { type: "Airbnbs" } as const },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
];

const moreItems = [
  { to: "/listing-packages", label: "Listing Packages", icon: Home, desc: "Post a property with the right visibility" },
  { to: "/advertising-packages", label: "Advertising Packages", icon: Megaphone, desc: "Homepage, sidebar, search & blog banners" },
  { to: "/blog-submission-packages", label: "Blog Submission Packages", icon: PenSquare, desc: "Publish articles to Kenya's property audience" },
  { to: "/agent-developer-subscriptions", label: "Agent & Developer Subscriptions", icon: Building2, desc: "Grow your agency with monthly plans" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const moreActive = moreItems.some((m) => pathname === m.to);

  // Close on outside click / Esc
  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="min-w-0 flex-shrink rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Foxwood Properties — go to homepage"
        ><Logo /></Link>
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {nav.map((n, i) => (
            <Link key={i} to={n.to as any} search={(n as any).search}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/75 hover:text-primary hover:bg-primary-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              activeOptions={{ exact: false, includeSearch: !!(n as any).search }}
              activeProps={{ className: "text-primary bg-primary-soft" }}
            >{n.label}</Link>
          ))}
          {/* More dropdown */}
          <div
            ref={moreRef}
            className="relative"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${moreActive || moreOpen ? "text-primary bg-primary-soft" : "text-foreground/75 hover:text-primary hover:bg-primary-soft"}`}
            >
              More <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full pt-2 w-[22rem]"
              >
                <div className="rounded-2xl border border-border bg-card shadow-glow p-2">
                  {moreItems.map((m) => {
                    const Icon = m.icon;
                    const active = pathname === m.to;
                    return (
                      <Link
                        key={m.to}
                        to={m.to}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-start gap-3 rounded-xl p-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active ? "bg-primary-soft/60" : ""}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className={`block font-semibold ${active ? "text-primary" : ""}`}>{m.label}</span>
                          <span className="block text-xs text-muted-foreground">{m.desc}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <a href="tel:+254700000000" className="btn-ghost !py-2 !px-4 text-sm"><Phone className="h-4 w-4" /> Call</a>
          {user ? (
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                {(user.email ?? "?").slice(0, 1).toUpperCase()}
              </button>
              {menu && (
                <div onMouseLeave={() => setMenu(false)} className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-glow p-1.5 text-sm">
                  <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
                  <Link to="/dashboard" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><LayoutDashboard className="h-4 w-4" /> My listings</Link>
                  <Link to="/dashboard/new" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><PlusCircle className="h-4 w-4" /> Post listing</Link>
                  <Link to="/dashboard/inquiries" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><Inbox className="h-4 w-4" /> Inquiries</Link>
                  <Link to="/dashboard/appointments" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><CalendarClock className="h-4 w-4" /> Appointments</Link>
                  <Link to="/dashboard/my-appointments" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><CalendarClock className="h-4 w-4" /> My viewings</Link>
                  <Link to="/dashboard/leads" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><UsersIcon className="h-4 w-4" /> Leads (CRM)</Link>
                  <Link to="/dashboard/crm" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><TrendingUp className="h-4 w-4" /> CRM Insights</Link>
                  <Link to="/favorites" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><Heart className="h-4 w-4" /> Favorites</Link>
                  <Link to="/saved-searches" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"><Bell className="h-4 w-4" /> Saved searches</Link>
                  {isAdmin && <Link to="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted text-primary"><ShieldCheck className="h-4 w-4" /> Admin</Link>}
                  <button onClick={signOut} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted text-left"><LogOut className="h-4 w-4" /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="btn-ghost !py-2 !px-4 text-sm"><UserIcon className="h-4 w-4" /> Sign in</Link>
          )}
          <Link to={user ? "/dashboard/new" : "/auth"} className="btn-primary btn-primary-hover !py-2 !px-5 text-sm">List Property</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="lg:hidden grid h-10 w-10 place-items-center rounded-full border border-border" aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-page flex flex-col py-3">
            {nav.map((n, i) => (
              <Link key={i} to={n.to as any} search={(n as any).search} onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">{n.label}</Link>
            ))}
            {/* Mobile More accordion */}
            <button
              type="button"
              aria-expanded={mobileMoreOpen}
              onClick={() => setMobileMoreOpen((v) => !v)}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted ${moreActive ? "text-primary" : ""}`}
            >
              <span>More</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileMoreOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileMoreOpen && (
              <div className="pl-3 border-l border-border ml-3 my-1 flex flex-col">
                {moreItems.map((m) => (
                  <Link key={m.to} to={m.to} onClick={() => { setOpen(false); setMobileMoreOpen(false); }}
                    className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                    activeProps={{ className: "text-primary bg-primary-soft" }}>
                    {m.label}
                  </Link>
                ))}
              </div>
            )}
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">My listings</Link>
                <Link to="/favorites" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">Favorites</Link>
                {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted text-primary">Admin</Link>}
                <button onClick={() => { setOpen(false); signOut(); }} className="text-left rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">Sign out</button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted">Sign in</Link>
            )}
            <Link to={user ? "/dashboard/new" : "/auth"} onClick={() => setOpen(false)} className="btn-primary btn-primary-hover mt-2">List Property</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
