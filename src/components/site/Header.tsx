import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Properties" },
  { to: "/properties", label: "For Sale", search: { category: "For Sale" } as const },
  { to: "/properties", label: "For Rent", search: { category: "For Rent" } as const },
  { to: "/properties", label: "For Lease", search: { category: "For Lease" } as const },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0"><Logo /></Link>
        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n, i) => (
            <Link
              key={i}
              to={n.to as any}
              search={(n as any).search}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/75 hover:text-foreground hover:bg-muted transition-colors"
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "text-primary bg-primary-soft" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <a href="tel:+254700000000" className="btn-ghost !py-2 !px-4 text-sm"><Phone className="h-4 w-4" /> Call</a>
          <Link to="/properties" className="btn-primary btn-primary-hover !py-2 !px-5 text-sm">List Property</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="lg:hidden grid h-10 w-10 place-items-center rounded-full border border-border" aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-page flex flex-col py-3">
            {nav.map((n, i) => (
              <Link
                key={i}
                to={n.to as any}
                search={(n as any).search}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
              >{n.label}</Link>
            ))}
            <Link to="/properties" onClick={() => setOpen(false)} className="btn-primary btn-primary-hover mt-2">List Property</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
