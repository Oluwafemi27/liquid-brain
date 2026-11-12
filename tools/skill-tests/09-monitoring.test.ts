import { redactText, scrubEvent, stripUrl } from "@/lib/monitoring/scrub";
import { ddLog, flushDatadog, datadogEnabled, sentryEnabled } from "@/lib/server/monitoring";
import { MODEL_PROVIDERS, callProviderChat, azureEndpoint, providerAvailable } from "@/lib/server/model-providers";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const g = globalThis as any;
let calls: { url: string; init: any }[] = [];
const mockFetch = (res: { status?: number; body?: unknown; text?: string }) => {
  calls = [];
  g.fetch = (url: string, init: any) => {
    calls.push({ url, init });
    const status = res.status ?? 200;
    return Promise.resolve({ ok: status < 400, status, json: async () => res.body, text: async () => res.text ?? "" });
  };
};

(async () => {
  // ---- scrubbing
  const t = redactText("fail for bob@shop.com with Bearer abc.def-123 and sk_live_ABC123xyz, token=hunter2 jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig123456");
  ok(!/bob@|abc\.def|sk_live|hunter2|eyJhbGci/.test(t), "emails, bearer tokens, secret keys, credentials and JWTs are redacted");
  ok(redactText("TypeError: x is not a function") === "TypeError: x is not a function", "plain error text is left alone");
  ok(stripUrl("https://a.app/orders?email=x@y.z#top") === "https://a.app/orders", "URLs lose query string and fragment");
  const ev: any = scrubEvent({
    user: { id: "u1", email: "a@b.c", ip_address: "1.2.3.4" },
    request: { method: "POST", url: "https://a.app/x?token=1", headers: { cookie: "s=1" }, data: "card", cookies: { a: "b" } },
    message: "hi a@b.c",
    exception: { values: [{ value: "boom for a@b.c" }] },
    breadcrumbs: [{ category: "fetch", data: { url: "https://a.app/api?k=v", method: "POST", status_code: 500, body: "secret" } }],
    extra: { note: "Bearer zzz", n: 3 },
    contexts: { os: { name: "Linux" }, custom: { secret: "x" } },
  });
  ok(ev.user === undefined, "event drops the user entirely");
  ok(JSON.stringify(ev.request) === JSON.stringify({ method: "POST", url: "https://a.app/x" }), "request keeps only method and path (no headers, cookies, body, query)");
  ok(!/a@b\.c/.test(JSON.stringify(ev)) && !/Bearer zzz/.test(JSON.stringify(ev)), "no email or token survives anywhere in the event");
  ok(ev.breadcrumbs[0].data.url === "https://a.app/api" && ev.breadcrumbs[0].data.status_code === 500 && ev.breadcrumbs[0].data.body === undefined, "breadcrumbs keep where/whether, never request bodies");
  ok(ev.contexts.os && !ev.contexts.custom, "custom contexts dropped, runtime info kept");

  // ---- off by default
  delete process.env.SENTRY_DSN; delete process.env.DD_API_KEY;
  ok(!sentryEnabled() && !datadogEnabled(), "Sentry and Datadog are off until keys are set");
  mockFetch({});
  ddLog("info", "x"); await flushDatadog();
  ok(calls.length === 0, "nothing is sent when Datadog isn't configured");

  // ---- Datadog logs
  process.env.DD_API_KEY = "ddkey"; process.env.DD_SITE = "datadoghq.eu";
  mockFetch({});
  ddLog("warn", "model_call_failed for a@b.c", { provider: "openai", duration_ms: 120, "bad key!": "x", message: "override", note: "mail z@y.xx" });
  await flushDatadog();
  const sent = JSON.parse(calls[0]!.init.body)[0];
  ok(calls[0]!.url === "https://http-intake.logs.datadoghq.eu/api/v2/logs" && calls[0]!.init.headers["DD-API-KEY"] === "ddkey", "logs go to the configured Datadog site with the API key header");
  ok(sent.provider === "openai" && sent.duration_ms === 120 && sent.status === "warn" && sent.service === "aduf-api", "attributes and service are set");
  ok(sent["bad key!"] === undefined && sent.message === "model_call_failed for [email]", "bad attribute names dropped, reserved names can't be overridden, message redacted");
  ok(sent.note === "mail [email]", "string attributes are redacted too");

  // ---- Azure OpenAI
  delete process.env.AZURE_OPENAI_ENDPOINT;
  const az = MODEL_PROVIDERS["azure_openai"]!;
  ok(azureEndpoint() === null && !providerAvailable(az) && providerAvailable(MODEL_PROVIDERS["openai"]!), "Azure is hidden until an endpoint is set");
  process.env.AZURE_OPENAI_ENDPOINT = "https://my-res.openai.azure.com/";
  process.env.AZURE_OPENAI_DEPLOYMENT = "gpt-prod";
  ok(azureEndpoint() === "https://my-res.openai.azure.com" && providerAvailable(az), "endpoint is normalised and enables Azure");
  process.env.AZURE_OPENAI_ENDPOINT = "http://evil.example.com";
  ok(azureEndpoint() === null, "non-https endpoint is rejected");
  process.env.AZURE_OPENAI_ENDPOINT = "https://my-res.openai.azure.com";
  mockFetch({ body: { choices: [{ message: { content: "hello" } }], usage: { total_tokens: 42 } } });
  const r = await callProviderChat(az, "azkey", { system: "sys", messages: [{ role: "user", content: "hi" }] });
  const body = JSON.parse(calls[0]!.init.body);
  ok(calls[0]!.url === "https://my-res.openai.azure.com/openai/v1/chat/completions", "Azure call goes to the v1 chat endpoint");
  ok(calls[0]!.init.headers["api-key"] === "azkey" && body.model === "gpt-prod" && body.messages[0].role === "system", "api-key header, deployment name as model, system message first");
  ok(r.text === "hello" && r.tokens === 42, "reply text and token count are returned");
  await flushDatadog();
  const log = calls.find((c) => c.url.includes("http-intake.logs"));
  const line = log ? JSON.parse(log.init.body).find((l: any) => l.message === "model_call") : null;
  ok(line && line.provider === "azure_openai" && line.tokens === 42 && line.ok === true && !JSON.stringify(line).includes("hello"), "model call log has timing and tokens but never the prompt or reply");
  delete process.env.AZURE_OPENAI_DEPLOYMENT;
  let msg = ""; try { await callProviderChat(az, "k", { system: "s", messages: [] }); } catch (e: any) { msg = e.message; }
  ok(/AZURE_OPENAI_DEPLOYMENT/.test(msg), "missing deployment name gives a clear error");
  mockFetch({ status: 401, text: "bad key" });
  let msg2 = ""; try { await callProviderChat(az, "k", { system: "s", messages: [], model: "dep" }); } catch (e: any) { msg2 = e.message; }
  ok(/azure_openai API error 401/.test(msg2), "Azure errors surface with status");
  console.log("done");
})();
