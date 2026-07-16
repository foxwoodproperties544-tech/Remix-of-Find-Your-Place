// Server-only M-Pesa Daraja helpers. Never import from client code.
// Uses STK Push (Lipa Na M-Pesa Online).

const SANDBOX = "https://sandbox.safaricom.co.ke";
const PROD = "https://api.safaricom.co.ke";

function baseUrl() {
  return (process.env.MPESA_ENV ?? "sandbox").toLowerCase() === "production" ? PROD : SANDBOX;
}

/** Kenyan phone → 2547XXXXXXXX */
export function normalizeKePhone(input: string): string {
  const s = input.replace(/\D/g, "");
  if (s.startsWith("254")) return s;
  if (s.startsWith("0") && s.length === 10) return "254" + s.slice(1);
  if (s.startsWith("7") || s.startsWith("1")) return "254" + s;
  return s;
}

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa consumer credentials not configured");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export type StkPushInput = {
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
  callbackUrl: string;
};

export type StkPushResponse = {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
};

export async function initiateStkPush(input: StkPushInput): Promise<StkPushResponse> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) throw new Error("M-Pesa shortcode / passkey not configured");
  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
  const token = await getAccessToken();
  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(input.amount),
    PartyA: normalizeKePhone(input.phone),
    PartyB: shortcode,
    PhoneNumber: normalizeKePhone(input.phone),
    CallBackURL: input.callbackUrl,
    AccountReference: input.accountReference.slice(0, 12),
    TransactionDesc: input.description.slice(0, 40),
  };
  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as StkPushResponse & { errorMessage?: string };
  if (!res.ok || json.ResponseCode !== "0") {
    throw new Error(json.errorMessage ?? json.ResponseDescription ?? "STK Push failed");
  }
  return json;
}
