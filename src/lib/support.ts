// Central admin/customer support contact for Foxwood Properties.
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
    // Fire-and-forget; ignore any error so we never block the outbound link.
    void supabase
      .from("support_click_events")
      .insert({ action, context, page_path: pagePath?.slice(0, 512) ?? null });
  } catch {
    /* noop */
  }
}
