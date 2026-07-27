import { createHmac, timingSafeEqual } from "crypto";

/** Simple signed arithmetic captcha — no third-party service or extra secret needed. */

function secret() {
  return (
    process.env.OFFER_CAPTCHA_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.LOVABLE_API_KEY ||
    "foxwood-dev-captcha"
  );
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

const TTL_MS = 10 * 60 * 1000;

export function issueCaptcha(): { question: string; token: string } {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 8);
  const plus = Math.random() > 0.4;
  const answer = plus ? a + b : Math.max(a, b) - Math.min(a, b);
  const question = plus ? `What is ${a} + ${b}?` : `What is ${Math.max(a, b)} − ${Math.min(a, b)}?`;
  const payload = `${answer}.${Date.now()}`;
  return { question, token: `${Buffer.from(payload).toString("base64url")}.${sign(payload)}` };
}

export function verifyCaptcha(token: string | undefined, answer: string | undefined): boolean {
  if (!token || !answer) return false;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return false;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const [expectedAnswer, issuedAt] = payload.split(".");
  if (!issuedAt || Date.now() - Number(issuedAt) > TTL_MS) return false;
  return String(answer).trim() === expectedAnswer;
}
