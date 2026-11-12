import {
  datadogSite, loadDatadog, loadSentry, overallTone, parseDatadogLogs, parseDatadogMonitors, parseDatadogStatusCounts,
  parseDatadogTimeseries, parseSentryIssues, parseSentryStats, sentryConfig,
} from "@/lib/server/monitoring-vendors";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

(async () => {
  // ---- configuration ----
  ok(datadogSite(undefined) === "datadoghq.com" && datadogSite("us3.datadoghq.com") === "us3.datadoghq.com" && datadogSite("datadoghq.eu") === "datadoghq.eu", "real Datadog regions are accepted");
  ok(datadogSite("evil.example.com") === null && datadogSite("datadoghq.com.evil.io") === null && datadogSite("a.com/x") === null, "a non-Datadog host never receives the API key");
  ok(sentryConfig({ SENTRY_AUTH_TOKEN: "t", SENTRY_ORG: "acme", SENTRY_PROJECT: "web" } as never)?.base === "https://sentry.io", "Sentry defaults to sentry.io");
  ok(sentryConfig({ SENTRY_AUTH_TOKEN: "t", SENTRY_ORG: "acme", SENTRY_PROJECT: "web", SENTRY_API_BASE: "http://sentry.local" } as never) === null, "a plain-http Sentry address is refused");
  ok(sentryConfig({ SENTRY_AUTH_TOKEN: "t", SENTRY_ORG: "../x", SENTRY_PROJECT: "web" } as never) === null, "a path-like org name is refused");
  ok(sentryConfig({ SENTRY_ORG: "acme", SENTRY_PROJECT: "web" } as never) === null, "no token means no dashboard access");

  // ---- parsing ----
  const issues = parseSentryIssues([{ id: "1", title: "TypeError at ana@example.com", culprit: "chat.ts", level: "error", count: "12", userCount: 3, firstSeen: "a", lastSeen: "b", permalink: "https://sentry.io/x" }, { id: "2", permalink: "javascript:alert(1)" }]);
  ok(issues[0]?.count === 12 && issues[0].users === 3, "issue counts arrive as numbers");
  ok(!issues[0]?.title.includes("ana@example.com"), "personal data in an issue title is redacted");
  ok(issues[1]?.href === null, "a non-https issue link is dropped");
  ok(parseSentryIssues("nope").length === 0, "garbage from Sentry gives an empty list, not a crash");
  const st = parseSentryStats([[1700000000, 2], [1700003600, 5]]);
  ok(st.total === 7 && st.perHour.length === 2, "hourly stats are summed");
  const mons = parseDatadogMonitors([{ id: 1, name: "CPU", overall_state: "Alert", type: "metric alert" }, { id: 2, name: "DB", overall_state: "OK" }, { id: 3, name: "Disk", overall_state: "Warn" }], "datadoghq.com");
  ok(mons?.total === 3 && mons.byState["OK"] === 1 && mons.attention.length === 2, "monitors are counted and only the unhealthy ones are listed");
  ok(mons?.attention[0]?.href === "https://app.datadoghq.com/monitors/1", "monitor links point at the right region");
  ok(parseDatadogMonitors({}, "datadoghq.com") === null, "a non-list monitor reply is ignored");
  const counts = parseDatadogStatusCounts({ data: { buckets: [{ by: { status: "error" }, computes: { c0: 4 } }, { by: { status: "info" }, computes: { c0: 90 } }] } });
  ok(counts["error"] === 4 && counts["info"] === 90, "log counts are grouped by status");
  ok(parseDatadogTimeseries({ data: { buckets: [{ computes: { c0: [{ time: "t1", value: 2 }, { time: "t2", value: 0 }] } }] } }).length === 2, "log timeseries is read");
  const logs = parseDatadogLogs({ data: [{ attributes: { timestamp: "t", message: "failed for bob@example.com" } }] });
  ok(logs.length === 1 && !logs[0]!.message.includes("bob@example.com"), "personal data in a log line is redacted");
  ok(overallTone([], false) === "off" && overallTone([{ label: "a", ok: true, detail: "" }], true) === "ok" && overallTone([{ label: "a", ok: false, detail: "" }], true) === "bad" && overallTone([{ label: "a", ok: null, detail: "" }], true) === "warn", "the traffic light follows the checks");

  // ---- Sentry end to end (fake network) ----
  const seen: string[] = [];
  const sentryFetch = (async (url: string, init?: RequestInit) => {
    seen.push(String(url));
    ok((init?.headers as Record<string, string>)["authorization"] === "Bearer tok", "Sentry calls carry the token");
    if (String(url).includes("/issues/")) return json([{ id: "9", title: "Boom", level: "error", count: "3", userCount: 1, permalink: "https://sentry.io/i/9" }]);
    if (String(url).includes("/stats/")) return json([[1700000000, 4]]);
    return json({ slug: "web" });
  }) as typeof fetch;
  const env = { SENTRY_DSN: "https://k@o.ingest.sentry.io/1", SENTRY_AUTH_TOKEN: "tok", SENTRY_ORG: "acme", SENTRY_PROJECT: "web" } as never;
  const s = await loadSentry(sentryFetch, env);
  ok(s.status.tone === "ok" && s.data?.issues.length === 1 && s.data.total24h === 4, "a healthy Sentry shows its issues and totals");
  ok(seen.every((u) => u.startsWith("https://sentry.io/api/0/projects/acme/web")), "Sentry calls stay on the configured host and project");
  const sBad = await loadSentry((async () => json({}, 401)) as typeof fetch, env);
  ok(sBad.status.tone === "bad" && sBad.status.checks.some((c) => c.ok === false && /rejected/.test(c.detail)), "a rejected Sentry token is reported plainly");
  ok(!JSON.stringify(sBad).includes("tok\""), "the token never appears in the report");
  const sOff = await loadSentry((async () => { throw new Error("no network"); }) as typeof fetch, {} as never);
  ok(sOff.status.tone === "off" && sOff.status.missing.includes("SENTRY_DSN"), "with nothing set, Sentry reads 'not connected' and lists what's missing");
  const sDsnOnly = await loadSentry((async () => { throw new Error("must not call"); }) as typeof fetch, { SENTRY_DSN: "x" } as never);
  ok(sDsnOnly.status.tone === "warn" && sDsnOnly.data === null, "a DSN alone is 'sending errors' with a nudge to add the token");

  // ---- Datadog end to end (fake network) ----
  const ddFetch = (async (url: string, init?: RequestInit) => {
    const u = String(url);
    ok(u.startsWith("https://api.datadoghq.com/"), "Datadog calls go to the validated region");
    if (u.endsWith("/api/v1/validate")) return json({ valid: true });
    if (u.includes("/api/v1/monitor")) return json([{ id: 5, name: "API errors", overall_state: "Alert", type: "log alert" }]);
    if (u.endsWith("/analytics/aggregate")) {
      const body = JSON.parse(String(init?.body));
      return body.compute[0].type === "timeseries" ? json({ data: { buckets: [{ computes: { c0: [{ time: "t", value: 1 }] } }] } }) : json({ data: { buckets: [{ by: { status: "error" }, computes: { c0: 1 } }] } });
    }
    return json({ data: [{ attributes: { timestamp: "t", message: "x failed" } }] });
  }) as typeof fetch;
  const d = await loadDatadog(ddFetch, { DD_API_KEY: "k", DD_APP_KEY: "a" } as never);
  ok(d.status.tone === "warn" && d.status.headline.includes("1 monitor needs attention"), "an alerting monitor turns the card amber");
  ok(d.data?.logs?.byStatus["error"] === 1 && d.data.logs.recentErrors.length === 1, "logs are included");
  const dNoApp = await loadDatadog((async (u: string) => json({ valid: true })) as typeof fetch, { DD_API_KEY: "k" } as never);
  ok(dNoApp.status.missing.includes("DD_APP_KEY") && dNoApp.data === null && dNoApp.status.checks[0]?.ok === true, "an API key alone is accepted, with a nudge to add the app key");
  const dBadKey = await loadDatadog((async () => json({ errors: ["Forbidden"] }, 403)) as typeof fetch, { DD_API_KEY: "k" } as never);
  ok(dBadKey.status.tone === "bad", "a rejected Datadog key is reported");
  const dBadSite = await loadDatadog((async () => { throw new Error("must not call"); }) as typeof fetch, { DD_API_KEY: "k", DD_SITE: "evil.example.com" } as never);
  ok(dBadSite.status.tone === "bad", "a bad DD_SITE makes no request at all");
  const dDown = await loadDatadog((async () => { throw new Error("offline"); }) as typeof fetch, { DD_API_KEY: "k", DD_APP_KEY: "a" } as never);
  ok(dDown.status.tone === "bad" && /Couldn't reach/.test(dDown.status.checks[0]!.detail), "a network failure is explained, not thrown");

  console.log("done");
})();
