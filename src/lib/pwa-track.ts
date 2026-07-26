import { supabase } from "@/integrations/supabase/client";

export type PwaEvent =
  | "impression"
  | "install_click"
  | "dismiss"
  | "installed"
  | "ios_hint_shown"
  | "page_view"
  | "share_click"
  | "share_whatsapp"
  | "copy_link"
  | "qr_shown";

export function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows/.test(ua)) return "windows";
  if (/Mac/.test(ua)) return "macos";
  if (/Linux/.test(ua)) return "linux";
  return "other";
}

const SOURCE_KEY = "foxwood_pwa_source";

type Attribution = { source: string; campaign: string | null; referrer: string | null };

/** Resolve (and persist) the acquisition source: ?utm_source / ?src / ?ref, else referrer host. */
export function resolveAttribution(fallback = "direct"): Attribution {
  if (typeof window === "undefined") return { source: fallback, campaign: null, referrer: null };

  const params = new URLSearchParams(window.location.search);
  const qsSource = params.get("utm_source") || params.get("src") || params.get("ref");
  const campaign = params.get("utm_campaign") || params.get("campaign");
  const referrer = document.referrer || null;

  let refHost: string | null = null;
  if (referrer) {
    try {
      const u = new URL(referrer);
      if (u.host !== window.location.host) refHost = u.host;
    } catch {
      /* ignore */
    }
  }

  let source = qsSource || refHost || null;

  try {
    if (source) {
      sessionStorage.setItem(SOURCE_KEY, source);
    } else {
      source = sessionStorage.getItem(SOURCE_KEY);
    }
  } catch {
    /* ignore */
  }

  return {
    source: (source || fallback).slice(0, 120),
    campaign: campaign ? campaign.slice(0, 120) : null,
    referrer: referrer ? referrer.slice(0, 300) : null,
  };
}

/**
 * Best-effort analytics write. `surface` identifies where the event happened
 * (e.g. "get-app" or "banner") and is combined with the acquisition source.
 */
export async function trackPwaEvent(event_type: PwaEvent, surface: string) {
  try {
    const attr = resolveAttribution();
    const { data: sess } = await supabase.auth.getSession();
    await supabase.from("pwa_install_events").insert({
      event_type,
      platform: detectPlatform(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      user_id: sess.session?.user.id ?? null,
      source: `${surface}:${attr.source}`.slice(0, 160),
      campaign: attr.campaign,
      referrer: attr.referrer,
    });
  } catch {
    /* analytics is best-effort */
  }
}
