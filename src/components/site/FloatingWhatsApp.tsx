import { MessageCircle } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import {
  inferContextFromPath,
  supportMessageFor,
  trackSupportClick,
  useSupportOverride,
  whatsappUrl,
  SUPPORT_PHONE_DISPLAY,
} from "@/lib/support";

export function FloatingWhatsApp() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const override = useSupportOverride();
  const context = override?.context ?? inferContextFromPath(pathname);
  const message = supportMessageFor(context, override?.extra);

  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackSupportClick("whatsapp", context)}
      aria-label={`Chat with Foxwood Properties on WhatsApp at ${SUPPORT_PHONE_DISPLAY}`}
      className="hidden md:inline-flex fixed bottom-5 right-5 z-40 group items-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl transition-shadow px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline text-sm font-semibold">Chat with us</span>
    </a>
  );
}
