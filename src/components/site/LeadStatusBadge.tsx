import { LEAD_STATUS_COLOR, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-semibold ${LEAD_STATUS_COLOR[status]}`}>
      {LEAD_STATUS_LABEL[status]}
    </span>
  );
}
