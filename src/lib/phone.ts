/** Shared phone helpers used by both the client forms and server functions. */

export const PHONE_E164 = /^\+\d{9,15}$/;

/** Normalises common Kenyan input formats to E.164 (+2547...). */
export function normalizePhone(raw: string): string {
  const cleaned = (raw ?? "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+254" + cleaned.replace(/^0+/, "");
  if (cleaned.startsWith("254")) return "+" + cleaned;
  if (cleaned.length === 9) return "+254" + cleaned;
  return "+" + cleaned;
}

/** Returns an error message, or null when the number is valid. */
export function validatePhone(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "Phone number is required";
  const phone = normalizePhone(trimmed);
  if (!PHONE_E164.test(phone)) {
    return "Enter a valid phone number in international format (e.g. +254712345678)";
  }
  if (phone.startsWith("+254") && phone.length !== 13) {
    return "Kenyan numbers must be 12 digits after the country code (e.g. +254712345678)";
  }
  return null;
}

/** Digits-only comparison key, used for uniqueness checks. */
export function phoneKey(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}
