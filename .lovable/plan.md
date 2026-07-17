
## Foxwood CRM — Build Plan

Turn every inquiry into a trackable lead with pipeline management, assignment, notes, follow-ups, communication history, and performance dashboards for agents/admins.

### 1. Database (single migration)

New enum + tables (all with GRANTs + RLS):

- `lead_status` enum: `new`, `contacted`, `qualified`, `viewing_scheduled`, `negotiation`, `won`, `lost`
- `lead_source` enum: `inquiry`, `viewing_request`, `whatsapp`, `phone`, `manual`, `other`
- `activity_type` enum: `note`, `call`, `whatsapp`, `email`, `status_change`, `assignment`, `viewing`, `follow_up`

Tables:

- **`leads`** — `id`, `property_id`, `owner_id` (listing owner), `assigned_to` (agent uuid, nullable), `contact_name`, `contact_email`, `contact_phone`, `contact_whatsapp`, `source lead_source`, `status lead_status default 'new'`, `priority` (low/med/high), `budget_min`, `budget_max`, `message`, `inquiry_id` fk, `viewing_id` fk, `deal_value` numeric, `won_at`, `lost_reason`, `last_contacted_at`, `next_follow_up_at`, `created_at`, `updated_at`
- **`lead_activities`** — `id`, `lead_id`, `actor_id`, `type activity_type`, `body`, `metadata jsonb`, `created_at`
- **`lead_follow_ups`** — `id`, `lead_id`, `assigned_to`, `due_at`, `title`, `notes`, `completed_at`, `created_at`

Triggers/functions:
- `handle_inquiry_to_lead()` — AFTER INSERT on `inquiries` → create matching lead + activity
- `handle_viewing_to_lead()` — AFTER INSERT on `viewings` → create/attach lead + activity
- `handle_lead_status_change()` — BEFORE UPDATE on leads → append status_change activity, stamp `won_at` / `last_contacted_at`
- `set_updated_at` on leads

RLS (using existing `has_role`):
- Listing owner, assigned agent, and admin can SELECT/UPDATE their leads
- Only admin/agent can INSERT manual leads
- Activities & follow-ups: same visibility as parent lead

### 2. Server functions (`src/lib/crm.functions.ts`)

All use `requireSupabaseAuth`:
- `listLeads({ status?, assigned_to?, mine?, from?, to? })`
- `getLead({ id })` — lead + activities + follow-ups + property + assignee profile
- `updateLeadStatus({ id, status, deal_value?, lost_reason? })`
- `assignLead({ id, agent_id })`
- `addLeadNote({ id, body })`
- `logCommunication({ id, type, body })` (call/whatsapp/email)
- `scheduleFollowUp({ lead_id, due_at, title, notes? })`
- `completeFollowUp({ id })`
- `createManualLead({ ...contact, property_id?, source: 'manual' })`
- `leadStats({ from?, to? })` — counts by status, conversion rate, avg time-to-close, top agents

### 3. UI routes (all under `_authenticated`)

- **`/dashboard/leads`** — Kanban + list toggle. Columns per status. Filters: mine/all, assigned agent, date range, source, property. Bulk actions.
- **`/dashboard/leads/$id`** — Detail: contact card, property card, status controls, assign dropdown, activity timeline (notes/calls/status changes), follow-ups panel, WhatsApp/Call quick actions (logs automatically), "Mark won" / "Mark lost" with deal value & reason.
- **`/dashboard/leads/new`** — Manual lead form.
- **`/dashboard/crm`** — Analytics dashboard: KPI cards (new / active / won / lost / conversion %), leads-over-time chart, funnel, agent leaderboard, upcoming follow-ups list, stale leads (>7d no contact).

Nav additions in Header dropdown: "Leads (CRM)" and "CRM Insights".

### 4. Inquiries integration

- Existing `/dashboard/inquiries` gets a "View lead" link on each row (leads auto-created by trigger).
- Existing property detail "Request viewing" continues to work — trigger creates a lead automatically.
- Backfill migration inserts leads for existing inquiries & viewings (idempotent via unique `inquiry_id`/`viewing_id`).

### 5. Components

- `LeadCard.tsx` — kanban card
- `LeadStatusBadge.tsx`
- `LeadActivityTimeline.tsx`
- `FollowUpList.tsx`
- `AssignAgentPopover.tsx`
- `LeadKpiCards.tsx`
- `LeadFunnelChart.tsx` + `LeadTrendChart.tsx` (recharts, already used elsewhere)

### 6. Notifications

Reuse existing `notifications` table:
- On assignment → notify agent
- On follow-up due (cron `pg_cron` daily 8am) → notify assignee
- On status → won/lost → notify listing owner

### Out of scope (future)

Email sync, SMS gateway, WhatsApp Business API auto-logging, deal pipelines beyond single-stage, custom fields, imports/exports.

---

Approve to proceed — I'll ship the migration first, then server functions, then UI.
