export type AppointmentStatus =
  | "pending"
  | "approved"
  | "rescheduled"
  | "confirmed"
  | "cancelled"
  | "completed";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending", "approved", "rescheduled", "confirmed", "cancelled", "completed",
];

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rescheduled: "Reschedule proposed",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const APPOINTMENT_STATUS_COLOR: Record<AppointmentStatus, string> = {
  pending: "bg-secondary/15 text-secondary",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  rescheduled: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground line-through",
  completed: "bg-primary-soft text-primary",
};

/** Normalize a phone number to digits only (no +), suitable for wa.me links. */
export function toWaNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  // Kenyan numbers starting with 0 → +254
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  return digits;
}

export function waLink(phone: string | null | undefined, message: string): string | null {
  const num = toWaNumber(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
