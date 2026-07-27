import { VIEWING_STATUS_CLASS, VIEWING_STATUS_LABEL } from "@/lib/viewings";

export function ViewingStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${VIEWING_STATUS_CLASS[status] ?? "bg-muted text-muted-foreground"} ${className ?? ""}`}>
      {VIEWING_STATUS_LABEL[status] ?? status}
    </span>
  );
}
