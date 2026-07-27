/**
 * Shared, browser-safe helpers for the property viewing booking system.
 * Server functions live in `viewings.functions.ts`.
 */

export type ViewingType = "in_person" | "virtual" | "open_house";

export const VIEWING_TYPES: { value: ViewingType; label: string; blurb: string }[] = [
  {
    value: "in_person",
    label: "In-person viewing",
    blurb: "Meet the agent at the property and walk through it in person.",
  },
  {
    value: "virtual",
    label: "Virtual viewing",
    blurb: "A live video walkthrough. A meeting link is shared once confirmed.",
  },
  {
    value: "open_house",
    label: "Open house",
    blurb: "Join the scheduled open house together with other interested buyers.",
  },
];

export const VIEWING_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  VIEWING_TYPES.map((t) => [t.value, t.label]),
);

export type ViewingStatus =
  | "pending"
  | "approved"
  | "confirmed"
  | "rescheduled"
  | "declined"
  | "cancelled"
  | "completed"
  | "no_show";

export const VIEWING_STATUSES: ViewingStatus[] = [
  "pending", "approved", "confirmed", "rescheduled", "declined", "cancelled", "completed", "no_show",
];

export const VIEWING_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  confirmed: "Confirmed",
  rescheduled: "Reschedule proposed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No show",
};

export const VIEWING_STATUS_CLASS: Record<string, string> = {
  pending: "bg-secondary/15 text-secondary",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  rescheduled: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
  completed: "bg-primary-soft text-primary",
  no_show: "bg-destructive/10 text-destructive",
};

/** Statuses that still occupy a calendar slot. */
export const ACTIVE_VIEWING_STATUSES: ViewingStatus[] = ["pending", "approved", "confirmed", "rescheduled"];

export type Availability = {
  owner_id: string;
  working_days: number[];
  start_time: string;
  end_time: string;
  slot_minutes: number;
  buffer_minutes: number;
  max_per_day: number;
  lead_time_hours: number;
  horizon_days: number;
  blocked_dates: string[];
  block_public_holidays: boolean;
  allow_virtual: boolean;
  allow_in_person: boolean;
  default_location: string | null;
};

export const DEFAULT_AVAILABILITY: Omit<Availability, "owner_id"> = {
  working_days: [1, 2, 3, 4, 5, 6],
  start_time: "09:00",
  end_time: "17:00",
  slot_minutes: 30,
  buffer_minutes: 15,
  max_per_day: 8,
  lead_time_hours: 12,
  horizon_days: 30,
  blocked_dates: [],
  block_public_holidays: true,
  allow_virtual: true,
  allow_in_person: true,
  default_location: null,
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Kenyan fixed-date public holidays (month-day). */
export const KE_PUBLIC_HOLIDAYS = [
  "01-01", "05-01", "06-01", "10-10", "10-20", "12-12", "12-25", "12-26",
];

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutesOf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isBlockedDate(a: Availability, dateKey: string): boolean {
  if (a.blocked_dates?.includes(dateKey)) return true;
  if (a.block_public_holidays && KE_PUBLIC_HOLIDAYS.includes(dateKey.slice(5))) return true;
  return false;
}

/**
 * Generate bookable slots for a single day.
 * `booked` is the list of ISO datetimes already taken (any active status).
 */
export function slotsForDay(
  availability: Availability,
  dateKey: string,
  booked: string[],
  now = new Date(),
): { iso: string; label: string; available: boolean }[] {
  const [y, m, d] = dateKey.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  if (!availability.working_days.includes(day.getDay())) return [];
  if (isBlockedDate(availability, dateKey)) return [];

  const step = Math.max(10, availability.slot_minutes + availability.buffer_minutes);
  const start = minutesOf(availability.start_time);
  const end = minutesOf(availability.end_time);
  const earliest = now.getTime() + availability.lead_time_hours * 3600_000;

  const takenKeys = new Set(
    booked.map((b) => {
      const t = new Date(b);
      return `${toDateKey(t)}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
    }),
  );
  const sameDayCount = booked.filter((b) => toDateKey(new Date(b)) === dateKey).length;
  const dayFull = sameDayCount >= availability.max_per_day;

  const out: { iso: string; label: string; available: boolean }[] = [];
  for (let mins = start; mins + availability.slot_minutes <= end; mins += step) {
    const slot = new Date(y, m - 1, d, Math.floor(mins / 60), mins % 60, 0, 0);
    const key = `${dateKey}T${String(slot.getHours()).padStart(2, "0")}:${String(slot.getMinutes()).padStart(2, "0")}`;
    const available = !dayFull && !takenKeys.has(key) && slot.getTime() >= earliest;
    out.push({
      iso: slot.toISOString(),
      label: slot.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      available,
    });
  }
  return out;
}

/** Upcoming bookable days within the availability horizon. */
export function bookableDays(availability: Availability, booked: string[], now = new Date()) {
  const days: { key: string; label: string; slots: number }[] = [];
  for (let i = 0; i <= availability.horizon_days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = toDateKey(d);
    const slots = slotsForDay(availability, key, booked, now).filter((s) => s.available).length;
    if (!slots) continue;
    days.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
      slots,
    });
  }
  return days;
}

export function nextAvailableSlot(availability: Availability, booked: string[], now = new Date()) {
  for (let i = 0; i <= availability.horizon_days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const slot = slotsForDay(availability, toDateKey(d), booked, now).find((s) => s.available);
    if (slot) return slot.iso;
  }
  return null;
}

export function formatViewingTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Build a downloadable .ics calendar entry for a confirmed viewing. */
export function buildIcs(v: {
  booking_ref: string;
  requested_at: string;
  duration_minutes: number;
  viewing_type: string;
  meeting_location?: string | null;
  virtual_link?: string | null;
  propertyTitle?: string | null;
}) {
  const start = new Date(v.requested_at);
  const end = new Date(start.getTime() + (v.duration_minutes || 30) * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const location = v.viewing_type === "virtual" ? (v.virtual_link ?? "Online") : (v.meeting_location ?? "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Foxwood Properties//Viewings//EN", "BEGIN:VEVENT",
    `UID:${v.booking_ref}@foxwood`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Property viewing — ${(v.propertyTitle ?? "Foxwood listing").replace(/[\r\n,]/g, " ")}`,
    `DESCRIPTION:Booking ${v.booking_ref} (${VIEWING_TYPE_LABEL[v.viewing_type] ?? v.viewing_type})`,
    `LOCATION:${String(location).replace(/[\r\n,]/g, " ")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(v: Parameters<typeof buildIcs>[0]) {
  const blob = new Blob([buildIcs(v)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${v.booking_ref}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** One-click "Add to Google Calendar" URL for a viewing. */
export function googleCalendarUrl(v: Parameters<typeof buildIcs>[0]): string {
  const start = new Date(v.requested_at);
  const end = new Date(start.getTime() + (v.duration_minutes || 30) * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const location = v.viewing_type === "virtual" ? (v.virtual_link ?? "Online") : (v.meeting_location ?? "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Property viewing — ${v.propertyTitle ?? "Foxwood listing"}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Foxwood Properties booking ${v.booking_ref} (${VIEWING_TYPE_LABEL[v.viewing_type] ?? v.viewing_type})${v.virtual_link ? `\nJoin: ${v.virtual_link}` : ""}`,
    location: String(location),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function xmlEscape(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Build a SpreadsheetML 2003 workbook (opens natively in Excel / Sheets / Numbers)
 * without pulling in a spreadsheet dependency.
 */
export function buildExcelXml(sheets: { name: string; rows: Record<string, unknown>[] }[]): string {
  const sheetXml = sheets
    .filter((s) => s.rows.length)
    .map((s) => {
      const cols = Object.keys(s.rows[0]);
      const header = `<Row>${cols.map((c) => `<Cell><Data ss:Type="String">${xmlEscape(c)}</Data></Cell>`).join("")}</Row>`;
      const body = s.rows
        .map((r) => `<Row>${cols.map((c) => {
          const val = r[c];
          const numeric = typeof val === "number" && Number.isFinite(val);
          return `<Cell><Data ss:Type="${numeric ? "Number" : "String"}">${xmlEscape(val)}</Data></Cell>`;
        }).join("")}</Row>`)
        .join("");
      return `<Worksheet ss:Name="${xmlEscape(s.name).slice(0, 31)}"><Table>${header}${body}</Table></Worksheet>`;
    })
    .join("");
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheetXml}</Workbook>`;
}

export function downloadExcel(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const blob = new Blob([buildExcelXml(sheets)], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
