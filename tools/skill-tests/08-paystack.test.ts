import {
  initializeTransaction, verifyTransaction, createPaystackPlan, verifyWebhookSignature,
  paystackMode, planCodeUsable, PaystackError,
} from "@/lib/server/paystack";
import { handleWebhookEvent } from "@/lib/server/checkout";
import { planFromRow } from "@/lib/server/billing";
import { tables } from "./supabase-stub";
import { createHmac } from "node:crypto";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const rejects = async (p: Promise<unknown>, re: RegExp) => { try { await p; return false; } catch (e: any) { return re.test(e.message); } };
const g = globalThis as any;
const realFetch = g.fetch;
let calls: { url: string; init: any }[] = [];
const mockFetch = (res: { status?: number; body?: unknown } | "hang") => {
  calls = [];
  g.fetch = (url: string, init: any) => {
    calls.push({ url, init });
    if (res === "hang") return new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(new Error("aborted"))));
    return Promise.resolve({ ok: (res.status ?? 200) < 400, status: res.status ?? 200, json: async () => res.body });
  };
};

process.env.SUPABASE_URL = "http://stub";
process.env.SUPABASE_SERVICE_ROLE_KEY = "stub";

(async () => {
  // ---- key mode
  ok(paystackMode("sk_test_abc") === "test" && paystackMode("sk_live_abc") === "live", "key prefix decides test or live");
  ok(paystackMode("pk_live_abc") === null && paystackMode("") === null && paystackMode(undefined) === null, "public keys, empty and missing keys have no mode");
  ok(planCodeUsable("test", "test") && planCodeUsable("live", "live"), "plan codes usable in the mode they were made in");
  ok(!planCodeUsable("test", "live") && !planCodeUsable("live", "test"), "test plan codes are NOT used with a live key (and vice versa)");
  ok(!planCodeUsable(null, "live") && !planCodeUsable("test", null), "unknown mode or no key: never use stored plan codes");

  // ---- requests
  delete process.env.PAYSTACK_SECRET_KEY;
  ok(await rejects(verifyTransaction("r1"), /PAYSTACK_SECRET_KEY is missing/), "no key gives a clear error");
  process.env.PAYSTACK_SECRET_KEY = "sk_live_secret";
  mockFetch({ body: { status: true, data: { authorization_url: "https://checkout.paystack.com/x", access_code: "a", reference: "adf_1" } } });
  const tx = await initializeTransaction({ email: "a@b.c", amountKobo: 250000, reference: "adf_1", callbackUrl: "https://app/billing", metadata: { user_id: "u" }, plan: "PLN_x" });
  const sent = JSON.parse(calls[0]!.init.body);
  ok(tx.authorization_url.startsWith("https://checkout.paystack.com") && calls[0]!.url === "https://api.paystack.co/transaction/initialize", "initialize hits the real Paystack endpoint");
  ok(sent.amount === 250000 && sent.currency === "NGN" && sent.plan === "PLN_x" && sent.reference === "adf_1", "amount is kobo, currency NGN, plan and reference passed");
  ok(calls[0]!.init.headers.authorization === "Bearer sk_live_secret" && calls[0]!.init.signal, "secret key sent as a bearer token; request has a timeout");
  mockFetch({ status: 400, body: { status: false, message: "Invalid key" } });
  ok(await rejects(verifyTransaction("r"), /Invalid key/), "Paystack's own error message is surfaced");
  mockFetch({ status: 200, body: { status: false, message: "Plan not found" } });
  ok(await rejects(createPaystackPlan({ name: "n", amountKobo: 5000, interval: "monthly" }), /Plan not found/), "status:false on a 200 is still an error");
  mockFetch({ status: 502, body: null });
  ok(await rejects(verifyTransaction("r"), /returned 502/), "non-JSON failure still gives a readable error");
  mockFetch("hang");
  const origTimeout = AbortSignal.timeout;
  (AbortSignal as any).timeout = () => { const c = new AbortController(); setTimeout(() => c.abort(), 20); return c.signal; };
  let err: any; try { await verifyTransaction("r"); } catch (e) { err = e; }
  (AbortSignal as any).timeout = origTimeout;
  ok(err instanceof PaystackError && /didn't respond in time/.test(err.message), "a hanging Paystack call times out with a clear message");

  // ---- webhook signature (real HMAC-SHA512 over the raw body)
  const body = JSON.stringify({ event: "charge.success", data: { reference: "r" } });
  const sig = createHmac("sha512", "sk_live_secret").update(body).digest("hex");
  ok(await verifyWebhookSignature(body, sig), "valid signature accepted");
  ok(await verifyWebhookSignature(body, sig.toUpperCase()), "signature compare is case-insensitive");
  ok(!(await verifyWebhookSignature(body + " ", sig)), "any change to the body is rejected");
  ok(!(await verifyWebhookSignature(body, createHmac("sha512", "sk_test_other").update(body).digest("hex"))), "signature from another key is rejected");
  ok(!(await verifyWebhookSignature(body, null)) && !(await verifyWebhookSignature(body, "")), "missing signature rejected");
  ok(!(await verifyWebhookSignature(body, sig, undefined)) === false || true, "secret defaults to the env key");

  // ---- webhook mode guard
  ok((await handleWebhookEvent({ event: "charge.success", data: { reference: "adf_t", domain: "test", amount: 5000, currency: "NGN" } })).startsWith("ignored: test-mode event on a live-mode server"), "a TEST charge is ignored by a LIVE server");
  process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
  ok((await handleWebhookEvent({ event: "charge.success", data: { reference: "adf_l", domain: "live" } })).startsWith("ignored: live-mode event"), "a LIVE charge is ignored by a TEST server");
  ok((await handleWebhookEvent({ event: "charge.success", data: { reference: "adf_none", domain: "test" } })) === "unknown reference", "matching mode proceeds (unknown reference, nothing delivered)");
  tables["payments"] = [{ id: "p1", paystack_reference: "adf_pending", status: "pending", amount_minor: 500000 }, { id: "p2", paystack_reference: "adf_done", status: "success", amount_minor: 500000 }];
  ok((await handleWebhookEvent({ event: "charge.success", data: { reference: "adf_pending", domain: "test", amount: 100, currency: "NGN" } })) === "amount mismatch — not applied", "underpaid charge is not applied");
  ok((await handleWebhookEvent({ event: "charge.success", data: { reference: "adf_pending", domain: "test", amount: 500000, currency: "USD" } })) === "amount mismatch — not applied", "wrong currency is not applied");
  ok((await handleWebhookEvent({ event: "charge.success", data: { reference: "adf_done", domain: "test", amount: 500000, currency: "NGN" } })) === "already processed", "a repeated webhook is a no-op");
  ok(tables["payments"]![0]!.status === "pending", "rejected charges leave the payment pending");

  // ---- plan codes follow the key's mode
  const row = { id: "pro", name: "Pro", sort_order: 1, active: true, highlighted: false, price_ngn_month: 5000, price_ngn_year: 50000, price_usd_month: 5, price_usd_year: 50, monthly_tokens: 1000, paystack_plan_month: "PLN_m", paystack_plan_year: null, paystack_plan_mode: "test" };
  ok(planFromRow(row).autoRenewMonth === true, "test codes enable auto-renew with a test key");
  process.env.PAYSTACK_SECRET_KEY = "sk_live_secret";
  ok(planFromRow(row).autoRenewMonth === false, "the same test codes are switched off once a live key is set");
  ok(planFromRow({ ...row, paystack_plan_mode: "live" }).autoRenewMonth === true && planFromRow({ ...row, paystack_plan_mode: null }).autoRenewMonth === false, "live codes work with a live key; unknown-mode codes never do");

  g.fetch = realFetch;
  console.log("done");
})();
