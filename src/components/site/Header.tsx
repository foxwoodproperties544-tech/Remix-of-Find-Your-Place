import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useState } from "react";
import { Menu, X, Phone, User as UserIcon, LogOut, LayoutDashboard, Heart, PlusCircle, ShieldCheck, Inbox, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const nav = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Properties" },
  { to: "/properties", label: "For Sale", search: { category: "For Sale" } as const },
  { to: "/properties", label: "For Rent", search: { category: "For Rent" } as const },
  { to: "/properties", label: "For Lease", search: { category: "For Lease" } as const },
  { to: "/mortgage", label: "Mortgage" },
  { to: "/compare", label: "Compare" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="min-w-0 flex-shrink" aria-label="Foxwood Properties — home"><Logo /></Link>
        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n, i) => (
            <Link key={i} to={n.to as any} search={(n as any).search}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/75 hover:text-foreground hover:bg-muted transition-colors"
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "text-primary bg-primary-soft" }}
            >{n.label}</Link>
          ))}
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
