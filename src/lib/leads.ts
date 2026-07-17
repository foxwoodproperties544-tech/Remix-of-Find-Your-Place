import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadSource = Database["public"]["Enums"]["lead_source"];
export type LeadPriority = Database["public"]["Enums"]["lead_priority"];
export type LeadActivityType = Database["public"]["Enums"]["lead_activity_type"];

export const LEAD_STATUSES: LeadStatus[] = [
  "new", "contacted", "qualified", "viewing_scheduled", "negotiation", "won", "lost",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  viewing_scheduled: "Viewing scheduled",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new: "bg-secondary/15 text-secondary",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  qualified: "bg-primary-soft text-primary",
  viewing_scheduled: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  negotiation: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  lost: "bg-muted text-muted-foreground",
};

export const LEAD_SOURCES: LeadSource[] = [
  "inquiry", "viewing_request", "whatsapp", "phone", "manual", "other",
];

export const ACTIVE_STATUSES: LeadStatus[] = [
  "new", "contacted", "qualified", "viewing_scheduled", "negotiation",
];

export function isActive(status: LeadStatus) {
  return ACTIVE_STATUSES.includes(status);
}
