// Central admin/customer support contact for Foxwood Properties.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_PHONE_DISPLAY = "+254 759 556 026";
export const SUPPORT_PHONE_TEL = "+254759556026";
export const SUPPORT_WHATSAPP_INTL = "254759556026";
export const SUPPORT_DEFAULT_MESSAGE = "Hello Foxwood Properties, I need assistance.";

export type SupportContext =
  | "generic"
  | "property"
  | "dashboard"
  | "pricing"
  | "listing_packages"
  | "advertising_packages"
  | "blog_packages"
  | "agent_subscription"
  | "auth"
  | "blog"
  | "faq"
  | "contact"
  | "payment"
  | "floating";

const CONTEXT_MESSAGES: Record<SupportContext, string> = {
  generic: SUPPORT_DEFAULT_MESSAGE,
  property: "Hello Foxwood Properties, I'd like more information about a property I'm viewing.",
  dashboard: "Hello Foxwood Properties, I need help with my dashboard.",
  pricing: "Hello Foxwood Properties, I have a question about your pricing.",
  listing_packages: "Hello Foxwood Properties, I need help choosing a listing package.",
  advertising_packages: "Hello Foxwood Properties, I'd like advice on advertising packages.",
  blog_packages: "Hello Foxwood Properties, I need help with a blog submission package.",
  agent_subscription: "Hello Foxwood Properties, I'd like help becoming an agent.",
  auth: "Hello Foxwood Properties, I'm having trouble signing in or creating an account.",
  blog: "Hello Foxwood Properties, I have a question about a blog article.",
  faq: "Hello Foxwood Properties, I couldn't find my answer in the FAQ.",
  contact: SUPPORT_DEFAULT_MESSAGE,
  payment: "Hello Foxwood Properties, I need help completing a payment.",
  floating: SUPPORT_DEFAULT_MESSAGE,
};

export function supportMessageFor(context: SupportContext, extra?: string): string {
  const base = CONTEXT_MESSAGES[context] ?? SUPPORT_DEFAULT_MESSAGE;
  return extra ? `${base} (${extra})` : base;
}

export function whatsappUrl(message: string = SUPPORT_DEFAULT_MESSAGE): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_INTL}?text=${encodeURIComponent(message)}`;
}

/** Infer a support context from the current pathname (client-side use). */
export function inferContextFromPath(pathname: string): SupportContext {
  if (!pathname) return "generic";
  if (pathname.startsWith("/properties/")) return "property";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/admin")) return "dashboard";
  if (pathname.startsWith("/listing-packages")) return "listing_packages";
  if (pathname.startsWith("/advertising-packages")) return "advertising_packages";
  if (pathname.startsWith("/blog-submission-packages")) return "blog_packages";
  if (pathname.startsWith("/agent-developer-subscriptions") || pathname.startsWith("/agents/become")) return "agent_subscription";
  if (pathname === "/pricing" || pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/auth")) return "auth";
  if (pathname.startsWith("/blog")) return "blog";
  if (pathname.startsWith("/faq") || pathname.startsWith("/help")) return "faq";
  if (pathname.startsWith("/contact")) return "contact";
  return "generic";
}

/** Fire-and-forget analytics tap for Call / WhatsApp support buttons. */
export function trackSupportClick(action: "call" | "whatsapp", context: SupportContext = "generic") {
  try {
    const pagePath =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : null;
    void supabase
      .from("support_click_events")
      .insert({ action, context, page_path: pagePath?.slice(0, 512) ?? null });
  } catch {
    /* noop */
  }
}

// ---- FAQ analytics ----
type FaqEvent = {
  event_type: "chip_select" | "answer_link_click" | "search";
  category?: string | null;
  question_id?: string | null;
  link_href?: string | null;
  search_term?: string | null;
};
export function trackFaqEvent(evt: FaqEvent) {
  try {
    const path = typeof window !== "undefined" ? window.location.pathname : null;
    void supabase.from("faq_analytics_events").insert({
      event_type: evt.event_type,
      category: evt.category ?? null,
      question_id: evt.question_id ?? null,
      link_href: evt.link_href?.slice(0, 512) ?? null,
      search_term: evt.search_term?.slice(0, 200) ?? null,
      path,
    });
  } catch {
    /* noop */
  }
}

// ---- Per-page support context override (used by FloatingWhatsApp) ----
type SupportOverride = { context?: SupportContext; extra?: string } | null;
let overrideState: SupportOverride = null;
const overrideListeners = new Set<() => void>();
export function setSupportOverride(next: SupportOverride) {
  overrideState = next;
  overrideListeners.forEach((l) => l());
}
function subOverride(l: () => void) {
  overrideListeners.add(l);
  return () => overrideListeners.delete(l);
}
function getOverride() { return overrideState; }
export function useSupportOverride(): SupportOverride {
  return useSyncExternalStore(subOverride, getOverride, () => null);
}

// ---- Support availability (based on platform_settings) ----
export type Availability = { online: boolean; reason: string };

export async function fetchSupportAvailability(): Promise<Availability> {
  try {
    const { data } = await supabase
      .from("platform_settings")
      .select("key,value")
      .in("key", ["support_hours", "support_online_override"]);
    const overrideRow = data?.find((d) => d.key === "support_online_override");
    const hoursRow = data?.find((d) => d.key === "support_hours");
    const override = overrideRow?.value as { mode?: "auto" | "online" | "offline" } | undefined;
    if (override?.mode === "online") return { online: true, reason: "Live chat available" };
    if (override?.mode === "offline") return { online: false, reason: "Live chat is offline" };
    const hours = (hoursRow?.value as {
      timezone?: string; days?: number[]; start?: string; end?: string;
    } | undefined) ?? { timezone: "Africa/Nairobi", days: [1,2,3,4,5,6], start: "08:00", end: "18:00" };
    const now = new Date();
    // Convert to EAT (UTC+3) – Kenya has no DST so a fixed offset is safe.
    const eat = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
    const day = eat.getDay(); // 0=Sun..6=Sat
    const mins = eat.getHours() * 60 + eat.getMinutes();
    const [sh, sm] = (hours.start ?? "08:00").split(":").map(Number);
    const [eh, em] = (hours.end ?? "18:00").split(":").map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    const inDay = (hours.days ?? [1,2,3,4,5,6]).includes(day);
    const inRange = mins >= startM && mins <= endM;
    const online = inDay && inRange;
    return {
      online,
      reason: online
        ? "Agents online now"
        : `Offline — hours ${hours.start}–${hours.end} EAT`,
    };
  } catch {
    return { online: false, reason: "Live chat unavailable" };
  }
}
