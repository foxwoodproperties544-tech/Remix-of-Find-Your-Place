import { useEffect, useRef, useState } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PwaEvent = "impression" | "install_click" | "dismiss" | "installed" | "ios_hint_shown";

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows/.test(ua)) return "windows";
  if (/Mac/.test(ua)) return "macos";
  if (/Linux/.test(ua)) return "linux";
  return "other";
}

async function trackPwaEvent(event_type: PwaEvent) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    await supabase.from("pwa_install_events").insert({
      event_type,
      platform: detectPlatform(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      user_id: sess.session?.user.id ?? null,
    });
  } catch {
    /* analytics is best-effort */
  }
}

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "foxwood_pwa_install_dismissed_at";
const DISMISS_DAYS = 14;

function recentlyDismissed() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const then = Number(raw);
    if (!Number.isFinite(then)) return false;
    return Date.now() - then < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(mm || iosStandalone);
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS: no beforeinstallprompt — show a hint banner after a small delay
    let iosTimer: number | undefined;
    if (isIos()) {
      iosTimer = window.setTimeout(() => setVisible(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
    setShowIosHint(false);
  };

  const install = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {
        /* ignore */
      }
      setDeferred(null);
      setVisible(false);
      return;
    }
    if (isIos()) setShowIosHint(true);
  };

  if (!visible && !showIosHint) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Foxwood Properties app"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>

      {!showIosHint ? (
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Install the Foxwood app</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Faster access to listings, saved searches and alerts — right from your home screen.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={install}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </button>
              <button
                onClick={dismiss}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pr-6 text-sm">
          <p className="font-semibold">Add Foxwood to your Home Screen</p>
          <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <li>
              1. Tap the <Share className="mx-1 inline h-3.5 w-3.5" /> Share button in Safari.
            </li>
            <li>2. Scroll and choose <span className="font-medium">Add to Home Screen</span>.</li>
            <li>3. Tap <span className="font-medium">Add</span> to finish.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
