/** Reusable CRM message templates: channels + placeholder interpolation. */

export const TEMPLATE_CHANNELS = ["whatsapp", "email", "sms", "note"] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

export interface CrmTemplateRow {
  id: string;
  owner_id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVars {
  contact_name?: string | null;
  agent_name?: string | null;
  property_title?: string | null;
  property_url?: string | null;
  property_price?: string | null;
  town?: string | null;
}

export const TEMPLATE_PLACEHOLDERS = [
  "{{contact_name}}",
  "{{agent_name}}",
  "{{property_title}}",
  "{{property_url}}",
  "{{property_price}}",
  "{{town}}",
] as const;

/** Replace {{placeholders}} with values; unknown or empty vars collapse to a neutral word. */
export function fillTemplate(body: string, vars: TemplateVars): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const v = (vars as Record<string, string | null | undefined>)[key];
    return v && String(v).trim() ? String(v) : "";
  }).replace(/[ \t]{2,}/g, " ").trim();
}

/** Starter templates offered to agents with no saved templates yet. */
export const STARTER_TEMPLATES: Array<{ name: string; channel: TemplateChannel; subject?: string; body: string }> = [
  {
    name: "First response",
    channel: "whatsapp",
    body: "Hi {{contact_name}}, this is {{agent_name}} from Foxwood Properties. Thanks for your interest in {{property_title}}. When would be a good time for a quick call or a viewing?",
  },
  {
    name: "Viewing confirmation",
    channel: "whatsapp",
    body: "Hi {{contact_name}}, confirming your viewing for {{property_title}} in {{town}}. I'll meet you on site — reply here if anything changes.",
  },
  {
    name: "Follow-up after viewing",
    channel: "email",
    subject: "Following up on {{property_title}}",
    body: "Hi {{contact_name}},\n\nThank you for viewing {{property_title}}. Do you have any questions about the price, documents or next steps?\n\n{{property_url}}\n\nRegards,\n{{agent_name}}\nFoxwood Properties",
  },
  {
    name: "Price / offer nudge",
    channel: "whatsapp",
    body: "Hi {{contact_name}}, the owner of {{property_title}} is open to serious offers this week. Asking price is {{property_price}}. Shall I put your offer forward?",
  },
];
