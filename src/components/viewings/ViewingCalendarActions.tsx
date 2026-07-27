import { CalendarPlus, Download } from "lucide-react";
import { downloadIcs, googleCalendarUrl } from "@/lib/viewings";

export type CalendarViewing = {
  booking_ref: string;
  requested_at: string;
  duration_minutes?: number | null;
  viewing_type: string;
  meeting_location?: string | null;
  virtual_link?: string | null;
  propertyTitle?: string | null;
};

/** One-click Google Calendar + .ics download for a viewing. */
export function ViewingCalendarActions({
  viewing,
  compact,
  className = "",
}: {
  viewing: CalendarViewing;
  compact?: boolean;
  className?: string;
}) {
  const payload = { ...viewing, duration_minutes: viewing.duration_minutes ?? 30 };
  const size = compact ? "px-2.5 py-1 text-xs" : "w-full justify-center";

  return (
    <div className={`flex ${compact ? "flex-wrap gap-2" : "flex-col gap-2"} ${className}`}>
      <a
        href={googleCalendarUrl(payload)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`btn-ghost ${size}`}
      >
        <CalendarPlus className="h-4 w-4" /> Google Calendar
      </a>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadIcs(payload); }}
        className={`btn-ghost ${size}`}
      >
        <Download className="h-4 w-4" /> Download .ics
      </button>
    </div>
  );
}
