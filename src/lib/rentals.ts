export const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "shortlisted",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const APPLICATION_STATUS_CLASS: Record<ApplicationStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  under_review: "bg-primary-soft text-primary",
  shortlisted: "bg-secondary/15 text-secondary",
  approved: "bg-emerald-500/15 text-emerald-600",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

/** Statuses an agent can move an application to. */
export const AGENT_ACTIONS: ApplicationStatus[] = [
  "under_review",
  "shortlisted",
  "approved",
  "rejected",
];

export interface RentalApplication {
  id: string;
  property_id: string;
  applicant_id: string;
  agent_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  occupation: string | null;
  employer: string | null;
  monthly_income: number | null;
  move_in_date: string | null;
  occupants: number;
  pets: boolean;
  notes: string | null;
  documents: { name: string; url: string }[];
  status: ApplicationStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  property?: { id: string; title: string; slug: string | null; price: number; town: string | null } | null;
}

export interface Conversation {
  id: string;
  property_id: string | null;
  buyer_id: string;
  agent_id: string;
  subject: string | null;
  last_message_at: string;
  created_at: string;
  property?: { id: string; title: string; slug: string | null; images: string[] | null } | null;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachments: string[];
  read_at: string | null;
  created_at: string;
}
