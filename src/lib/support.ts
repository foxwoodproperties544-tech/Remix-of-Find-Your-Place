// Central admin/customer support contact for Foxwood Properties.
export const SUPPORT_PHONE_DISPLAY = "+254 759 556 026";
export const SUPPORT_PHONE_TEL = "+254759556026";
export const SUPPORT_WHATSAPP_INTL = "254759556026";
export const SUPPORT_DEFAULT_MESSAGE = "Hello Foxwood Properties, I need assistance.";

export function whatsappUrl(message: string = SUPPORT_DEFAULT_MESSAGE): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_INTL}?text=${encodeURIComponent(message)}`;
}
