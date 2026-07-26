import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Heart, Bell, User } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { to: "/properties", label: "Search", icon: Search, match: (p: string) => p.startsWith("/properties") || p.startsWith("/locations") },
  { to: "/favorites", label: "Saved", icon: Heart, match: (p: string) => p.startsWith("/favorites") || p.startsWith("/compare") },
  { to: "/saved-searches", label: "Alerts", icon: Bell, match: (p: string) => p.startsWith("/saved-searches") },
  { to: "/dashboard", label: "Account", icon: User, match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/auth") },
] as const;

/** Mobile-only bottom navigation for one-tap access to the core journeys. */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
