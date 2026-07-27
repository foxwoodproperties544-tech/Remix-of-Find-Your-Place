import { useEffect, useState } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { OPEN_STATUSES, type OfferStatus } from "@/lib/offers";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function formatRemaining(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return "Expired";
  const { d, h, m, s } = parts(ms);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

/** Live countdown + expiry status indicator for an offer. */
export function OfferExpiry({
  expiresAt,
  status,
  className,
  compact,
}: {
  expiresAt: string | null | undefined;
  status: OfferStatus | string;
  className?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const open = OPEN_STATUSES.includes(status as OfferStatus);
  if (!open) {
    if (status === "expired") {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground ${className ?? ""}`}>
          <Clock className="h-3.5 w-3.5" /> Expired{expiresAt ? ` on ${new Date(expiresAt).toLocaleDateString()}` : ""}
        </span>
      );
    }
    return null;
  }
  if (!expiresAt) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground ${className ?? ""}`}>
        <CheckCircle2 className="h-3.5 w-3.5" /> No expiry set
      </span>
    );
  }

  const ms = new Date(expiresAt).getTime() - now;
  const expired = ms <= 0;
  const urgent = !expired && ms < 24 * 3600_000;
  const soon = !expired && !urgent && ms < 3 * 24 * 3600_000;
  const label = expired ? "Expired — awaiting close" : formatRemaining(expiresAt, now);

  const tone = expired
    ? "bg-destructive/10 text-destructive"
    : urgent
      ? "bg-destructive/10 text-destructive"
      : soon
        ? "bg-secondary/15 text-secondary"
        : "bg-primary-soft text-primary";

  const Icon = expired || urgent ? AlertTriangle : Clock;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tone} ${className ?? ""}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
      {!compact && !expired && (
        <span className="font-normal opacity-80">· expires {new Date(expiresAt).toLocaleString()}</span>
      )}
    </span>
  );
}
