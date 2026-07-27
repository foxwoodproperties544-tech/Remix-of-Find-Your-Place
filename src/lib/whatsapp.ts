/**
 * Foxwood Properties — centralized WhatsApp messaging standard.
 *
 * Every WhatsApp button on the platform (existing or future) MUST build its
 * link through `whatsappLink` / `buildWhatsAppMessage` so that:
 *  - the message always opens with the Foxwood brand line,
 *  - the rest of the message adapts to the page/feature context,
 *  - only the placeholders available on that page are included,
 *  - the text is URL-encoded and works on WhatsApp Web and mobile.
 */

export const FOXWOOD_BRAND = "Foxwood Properties Ltd";

/** Support/company WhatsApp line (digits only, international format). */
export const FOXWOOD_WHATSAPP = "254759556026";

export type WhatsAppContext =
  | "property"          // Property details page (sale / generic)
  | "rental"            // Rental listings
  | "lease"             // Lease listings
  | "land"              // Land & plot listings
  | "airbnb"            // Airbnb / short-stay listings
  | "request_response"  // Property request marketplace response
  | "request_owner"     // Reaching the buyer who posted a request
  | "company"           // Company profile page
  | "agent"             // Agent profile
  | "viewing"           // Book a viewing / confirm appointment
  | "offer"             // Make an offer
  | "blog"              // Blog articles
  | "contact"           // Contact Foxwood
  | "support"           // Generic help/support
  | "dashboard"         // Dashboard help
  | "pricing"           // Packages / plans / payments
  | "generic";

/** Every placeholder the generator understands. Only supplied ones are used. */
export interface WhatsAppDetails {
  propertyTitle?: string | null;
  reference?: string | null;
  companyName?: string | null;
  agentName?: string | null;
  county?: string | null;
  town?: string | null;
  propertyType?: string | null;
  viewingDate?: string | null;
  viewingTime?: string | null;
  offerAmount?: string | number | null;
  requestTitle?: string | null;
  bookingId?: string | null;
  /** Free-form extra line appended before the sign-off. */
  extra?: string | null;
}

const OPENING: Record<WhatsAppContext, string[]> = {
  property: [
    `Hello, I saw this on ${FOXWOOD_BRAND}.`,
    "I would like to enquire about this property.",
  ],
  rental: [
    `Hello, I saw this rental property on ${FOXWOOD_BRAND}.`,
    "I would like to know if it is still available for rent.",
  ],
  lease: [
    `Hello, I saw this property on ${FOXWOOD_BRAND}.`,
    "I would like more information about the lease terms and availability.",
  ],
  land: [
    `Hello, I saw this land listing on ${FOXWOOD_BRAND}.`,
    "I would like more information about the property, including title status, location, and availability.",
  ],
  airbnb: [
    `Hello, I saw this Airbnb listing on ${FOXWOOD_BRAND}.`,
    "I would like to know if it is available for my preferred dates.",
  ],
  request_response: [
    `Hello, I saw your response on ${FOXWOOD_BRAND} regarding my property request.`,
    "I would like more information about the property you recommended.",
  ],
  request_owner: [
    `Hello, I saw your property request on ${FOXWOOD_BRAND}.`,
    "I have a property that may match what you are looking for.",
  ],
  company: [
    `Hello, I saw your company on ${FOXWOOD_BRAND}.`,
    "I would like to know more about the services and properties you offer.",
  ],
  agent: [
    `Hello, I found your profile on ${FOXWOOD_BRAND}.`,
    "I am interested in working with you to find a suitable property.",
    "Please let me know how we can proceed.",
  ],
  viewing: [
    `Hello, I saw this property on ${FOXWOOD_BRAND}.`,
    "I would like to confirm my viewing appointment for:",
  ],
  offer: [
    `Hello, I saw this property on ${FOXWOOD_BRAND}.`,
    "I have submitted an offer for:",
  ],
  blog: [
    `Hello, I read this article on ${FOXWOOD_BRAND}.`,
    "I would like more information regarding this topic.",
  ],
  contact: [
    `Hello, I am contacting you through ${FOXWOOD_BRAND}.`,
    "I would like assistance with finding the right property.",
  ],
  support: [
    `Hello, I am contacting you through ${FOXWOOD_BRAND}.`,
    "I would like some assistance.",
  ],
  dashboard: [
    `Hello, I am contacting you through ${FOXWOOD_BRAND}.`,
    "I need help with my Foxwood dashboard.",
  ],
  pricing: [
    `Hello, I am contacting you through ${FOXWOOD_BRAND}.`,
    "I would like help choosing the right package or plan.",
  ],
  generic: [
    `Hello, I saw this on ${FOXWOOD_BRAND}.`,
    "I would like some assistance.",
  ],
};

/** Closing lines placed after the placeholder block, before "Thank you." */
const CLOSING: Partial<Record<WhatsAppContext, string>> = {
  property: "Is it still available? Please share more details.",
  rental: "Please provide more information.",
  land: "",
  airbnb: "Please provide more information.",
  request_response: "",
  offer: "I would like to discuss the next steps.",
};

const LABELS: Array<[keyof WhatsAppDetails, string]> = [
  ["propertyTitle", "Property"],
  ["requestTitle", "Request"],
  ["reference", "Reference Number"],
  ["bookingId", "Booking ID"],
  ["propertyType", "Property Type"],
  ["town", "Town"],
  ["county", "County"],
  ["viewingDate", "Viewing Date"],
  ["viewingTime", "Viewing Time"],
  ["offerAmount", "Offer Amount"],
  ["companyName", "Company"],
  ["agentName", "Agent"],
];

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/** Build the standard Foxwood WhatsApp message for a context + available data. */
export function buildWhatsAppMessage(context: WhatsAppContext = "generic", details: WhatsAppDetails = {}): string {
  const lines: string[] = [...(OPENING[context] ?? OPENING.generic)];

  const fields = LABELS
    .map(([key, label]) => {
      const value = clean(details[key]);
      return value ? `${label}: ${value}` : null;
    })
    .filter(Boolean) as string[];

  if (fields.length) lines.push("", ...fields);

  const closing = clean(CLOSING[context]);
  if (closing) lines.push("", closing);

  const extra = clean(details.extra);
  if (extra) lines.push("", extra);

  lines.push("", "Thank you.");
  return lines.join("\n");
}

/** Normalize any phone input to a wa.me-compatible international digit string. */
export function toWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `254${digits.replace(/^0+/, "")}`;
  else if (digits.length === 9) digits = `254${digits}`;
  return digits;
}

/** Low-level: wa.me URL for an already-composed message. */
export function whatsappHref(phone: string | null | undefined, message: string): string | null {
  const num = toWhatsAppNumber(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/**
 * The single entry point every WhatsApp button should use.
 * Falls back to the Foxwood support line when no recipient number is available.
 */
export function whatsappLink(
  phone: string | null | undefined,
  context: WhatsAppContext = "generic",
  details: WhatsAppDetails = {},
): string {
  const num = toWhatsAppNumber(phone) ?? FOXWOOD_WHATSAPP;
  return `https://wa.me/${num}?text=${encodeURIComponent(buildWhatsAppMessage(context, details))}`;
}

/** Foxwood support/company WhatsApp link. */
export function foxwoodWhatsappLink(context: WhatsAppContext = "contact", details: WhatsAppDetails = {}): string {
  return whatsappLink(FOXWOOD_WHATSAPP, context, details);
}

/** Human-friendly listing reference derived from the listing id. */
export function propertyReference(id?: string | null): string | null {
  if (!id) return null;
  const compact = String(id).replace(/-/g, "").toUpperCase();
  return `FOX-${compact.slice(0, 8)}`;
}

/** Pick the right listing context from a listing's category + type. */
export function listingContext(input: {
  category?: string | null;
  propertyType?: string | null;
  purpose?: string | null;
  listingType?: string | null;
}): WhatsAppContext {
  const type = (input.propertyType ?? "").toLowerCase();
  const cat = `${input.category ?? ""} ${input.purpose ?? ""} ${input.listingType ?? ""}`.toLowerCase();

  if (type.includes("airbnb") || type.includes("holiday") || type.includes("short")) return "airbnb";
  if (type.includes("land") || type.includes("plot") || type.includes("farm")) return "land";
  if (cat.includes("lease")) return "lease";
  if (cat.includes("rent")) return "rental";
  return "property";
}
