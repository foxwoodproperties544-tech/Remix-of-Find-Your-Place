import { formatKsh } from "./mock-data";

export type OfferStatus =
  | "pending"
  | "under_review"
  | "counter_offered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export type OfferEventType =
  | "offer"
  | "counter"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired"
  | "info_request"
  | "message"
  | "status";

export interface Offer {
  id: string;
  offer_ref: string;
  property_id: string;
  buyer_id: string;
  owner_id: string | null;
  agent_id: string | null;
  asking_price: number;
  amount: number;
  current_amount: number | null;
  currency: string;
  message: string | null;
  timeline: string;
  needs_mortgage: boolean;
  has_viewed: boolean;
  cash_buyer: boolean;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  status: OfferStatus;
  last_actor: string | null;
  expires_at: string | null;
  first_response_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    slug: string | null;
    price: number;
    images: string[];
    county: string | null;
    town: string | null;
    category: string | null;
  } | null;
}

export interface OfferEvent {
  id: string;
  offer_id: string;
  actor_id: string | null;
  actor_role: string | null;
  type: OfferEventType;
  amount: number | null;
  body: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface OfferMessage {
  id: string;
  offer_id: string;
  sender_id: string;
  body: string | null;
  attachments: string[];
  read_at: string | null;
  created_at: string;
}

export const TIMELINES = [
  { value: "immediately", label: "Immediately" },
  { value: "within_30", label: "Within 30 days" },
  { value: "within_60", label: "Within 60 days" },
  { value: "within_90", label: "Within 90 days" },
] as const;

export const TIMELINE_LABEL: Record<string, string> = Object.fromEntries(
  TIMELINES.map((t) => [t.value, t.label]),
);

export const STATUS_LABEL: Record<OfferStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  counter_offered: "Counter offered",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

export const STATUS_CLASS: Record<OfferStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  under_review: "bg-primary-soft text-primary",
  counter_offered: "bg-secondary/15 text-secondary",
  accepted: "bg-emerald-500/15 text-emerald-600",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export const OPEN_STATUSES: OfferStatus[] = ["pending", "under_review", "counter_offered"];

export const SALE_STATES = [
  { value: "", label: "No change" },
  { value: "offer_accepted", label: "Offer accepted" },
  { value: "sale_in_progress", label: "Sale in progress" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
] as const;

export const SALE_STATE_LABEL: Record<string, string> = Object.fromEntries(
  SALE_STATES.filter((s) => s.value).map((s) => [s.value, s.label]),
);

export function offerAmount(o: Offer): number {
  return Number(o.current_amount ?? o.amount);
}

export function priceDiff(asking: number, amount: number) {
  const diff = amount - asking;
  const pct = asking > 0 ? (diff / asking) * 100 : 0;
  return {
    diff,
    pct,
    label: `${diff === 0 ? "" : diff > 0 ? "+" : "−"}${formatKsh(Math.abs(diff))} (${diff > 0 ? "+" : diff < 0 ? "−" : ""}${Math.abs(pct).toFixed(1)}%)`,
    tone: diff >= 0 ? "text-emerald-600" : "text-destructive",
  };
}

export function eventLabel(e: OfferEvent): string {
  switch (e.type) {
    case "offer": return "Offer submitted";
    case "counter": return "Counter offer";
    case "accepted": return "Offer accepted";
    case "rejected": return "Offer rejected";
    case "withdrawn": return "Offer withdrawn";
    case "expired": return "Offer expired";
    case "info_request": return "More information requested";
    case "message": return "Message";
    default: return "Update";
  }
}

export function offerSummaryText(o: Offer): string {
  const lines = [
    `Foxwood Properties — Offer summary`,
    `Offer ID: ${o.offer_ref}`,
    `Property: ${o.property?.title ?? o.property_id}`,
    `Asking price: ${formatKsh(Number(o.asking_price))}`,
    `Offer amount: ${formatKsh(offerAmount(o))} ${o.currency}`,
    `Difference: ${priceDiff(Number(o.asking_price), offerAmount(o)).label}`,
    `Status: ${STATUS_LABEL[o.status]}`,
    `Completion timeline: ${TIMELINE_LABEL[o.timeline] ?? o.timeline}`,
    `Cash buyer: ${o.cash_buyer ? "Yes" : "No"}`,
    `Needs mortgage: ${o.needs_mortgage ? "Yes" : "No"}`,
    `Viewed property: ${o.has_viewed ? "Yes" : "No"}`,
    `Buyer: ${o.buyer_name ?? "—"} · ${o.buyer_email ?? "—"} · ${o.buyer_phone ?? "—"}`,
    `Submitted: ${new Date(o.created_at).toLocaleString()}`,
    `Last updated: ${new Date(o.updated_at).toLocaleString()}`,
    ``,
    `Message to seller:`,
    o.message ?? "—",
  ];
  return lines.join("\n");
}

export function downloadOfferSummary(o: Offer) {
  const blob = new Blob([offerSummaryText(o)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${o.offer_ref}-summary.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
