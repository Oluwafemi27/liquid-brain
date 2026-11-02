import "@tanstack/react-start/server-only";

// ADUF's OWN Paystack account (PAYSTACK_SECRET_KEY) — what users pay for plans and top-ups.
// Unrelated to the "Paystack" connector, which reads a customer's own store transactions.

const BASE = "https://api.paystack.co";

export class PaystackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackError";
  }
}

export const paystackConfigured = (): boolean => Boolean(process.env["PAYSTACK_SECRET_KEY"]);

async function call<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const key = process.env["PAYSTACK_SECRET_KEY"];
  if (!key) throw new PaystackError("Payments aren't set up yet (PAYSTACK_SECRET_KEY is missing).");
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${key}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const json = (await res.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: T;
  } | null;
  if (!res.ok || !json?.status)
    throw new PaystackError(json?.message ?? `Paystack returned ${res.status}.`);
  return json.data as T;
}

export interface InitializedTransaction {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/** amountKobo is NGN × 100. When `plan` is set Paystack subscribes the customer and bills the plan's own amount. */
export const initializeTransaction = (a: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
  plan?: string | undefined;
}) =>
  call<InitializedTransaction>("/transaction/initialize", {
    method: "POST",
    body: {
      email: a.email,
      amount: a.amountKobo,
      currency: "NGN",
      reference: a.reference,
      callback_url: a.callbackUrl,
      metadata: a.metadata,
      ...(a.plan ? { plan: a.plan } : {}),
    },
  });

export interface PaystackTransaction {
  id: number;
  status: "success" | "failed" | "abandoned" | "pending" | string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  customer?: { id?: number; customer_code?: string; email?: string } | null;
  plan?: { plan_code?: string } | string | null;
  metadata?: Record<string, unknown> | null;
}

/** Never trust the browser's word that a payment happened — ask Paystack. */
export const verifyTransaction = (reference: string) =>
  call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);

export const createPaystackPlan = (a: {
  name: string;
  amountKobo: number;
  interval: "monthly" | "annually";
}) =>
  call<{ plan_code: string }>("/plan", {
    method: "POST",
    body: { name: a.name, amount: a.amountKobo, interval: a.interval, currency: "NGN" },
  });

export const disablePaystackSubscription = (code: string, token: string) =>
  call<unknown>("/subscription/disable", { method: "POST", body: { code, token } });
export const enablePaystackSubscription = (code: string, token: string) =>
  call<unknown>("/subscription/enable", { method: "POST", body: { code, token } });

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Paystack signs the RAW body with HMAC-SHA512 using your secret key (header x-paystack-signature). */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret = process.env["PAYSTACK_SECRET_KEY"],
): Promise<boolean> {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  if (expected.length !== signature.length) return false;
  let diff = 0; // constant-time compare
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i);
  return diff === 0;
}
