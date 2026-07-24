import { Phone, MessageCircle } from "lucide-react";
import {
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  supportMessageFor,
  trackSupportClick,
  whatsappUrl,
  type SupportContext,
} from "@/lib/support";

type Props = {
  message?: string;
  whatsappMessage?: string;
  context?: SupportContext;
  className?: string;
  variant?: "soft" | "outline" | "inline";
};

export function SupportBanner({
  message = "Need help?",
  whatsappMessage,
  context = "generic",
  className = "",
  variant = "soft",
}: Props) {
  const base =
    variant === "outline"
      ? "border border-border bg-card"
      : variant === "inline"
        ? "bg-transparent"
        : "bg-primary-soft border border-primary/15";
  const waText = whatsappMessage ?? supportMessageFor(context);
  return (
    <div
      className={`rounded-2xl ${base} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${className}`}
    >
      <div className="text-sm text-foreground/90">
        <span className="font-semibold">{message}</span>{" "}
        <span className="text-foreground/70">
          Call or WhatsApp us on{" "}
          <span className="font-semibold text-primary">{SUPPORT_PHONE_DISPLAY}</span>.
        </span>
      </div>
      <div className="flex gap-2 sm:ml-auto shrink-0">
        <a
          href={`tel:${SUPPORT_PHONE_TEL}`}
          onClick={() => trackSupportClick("call", context)}
          className="btn-primary btn-primary-hover !py-2 !px-4 text-sm"
        >
          <Phone className="h-4 w-4" /> Call
        </a>
        <a
          href={whatsappUrl(waText)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSupportClick("whatsapp", context)}
          className="btn-secondary !py-2 !px-4 text-sm"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>
    </div>
  );
}
