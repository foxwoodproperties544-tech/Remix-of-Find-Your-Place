import { APPOINTMENT_STATUS_COLOR, APPOINTMENT_STATUS_LABEL, type AppointmentStatus } from "@/lib/appointments";

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus | string }) {
  const s = (status as AppointmentStatus);
  const cls = APPOINTMENT_STATUS_COLOR[s] ?? "bg-muted text-muted-foreground";
  const label = APPOINTMENT_STATUS_LABEL[s] ?? status;
  return <span className={`inline-flex items-center rounded-full text-xs px-2.5 py-0.5 font-semibold ${cls}`}>{label}</span>;
}
