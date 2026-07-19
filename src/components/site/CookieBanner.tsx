import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";

const KEY = "foxwood_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (!v) setVisible(true);
    } catch { /* SSR / disabled storage */ }
  }, []);

  const decide = (choice: "accepted" | "essential") => {
    try { window.localStorage.setItem(KEY, choice); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md z-50">
      <div className="rounded-2xl border border-border bg-card shadow-glow p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary shrink-0">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground">We use cookies</p>
            <p className="mt-1 text-muted-foreground">
              We use essential cookies to run Foxwood and optional cookies to improve your experience. Read our{" "}
              <Link to="/cookies" className="text-primary underline hover:no-underline">Cookie Policy</Link>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => decide("accepted")} className="btn-primary btn-primary-hover !py-2 !px-4 text-xs">Accept all</button>
              <button onClick={() => decide("essential")} className="btn-ghost !py-2 !px-4 text-xs">Essential only</button>
            </div>
          </div>
          <button aria-label="Close" onClick={() => decide("essential")} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
