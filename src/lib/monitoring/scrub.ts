// Pure, client-safe privacy filter used before ANY error or log leaves the app (Sentry, Datadog).
// ADUF handles customers' orders, tokens and chat text, so monitoring only ever receives what a
// developer needs to find a bug: the error, the stack, the route path and an opaque status.

const PATTERNS: [RegExp, string][] = [
  [/\bsk_(?:live|test)_[A-Za-z0-9]+/g, "[secret-key]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [token]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, "[jwt]"],
  [
    /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|authorization)(\s*[=:]\s*)["']?[^\s"'&,;]+/gi,
    "[redacted-credential]",
  ],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, "[email]"],
  [/\b(?:sbp|sb)_[A-Za-z0-9]{20,}\b/g, "[secret-key]"],
  [/\b[A-Za-z0-9_-]{32,}\b/g, "[long-id]"],
];

export function redactText(input: string): string {
  let out = input;
  for (const [re, to] of PATTERNS) out = out.replace(re, to);
  return out;
}

/** Drops the query string and fragment (they can hold tokens, emails, search text). */
export function stripUrl(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

type Loose = { [key: string]: unknown };
const isObj = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

function redactDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactText(value).slice(0, 1000);
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactDeep(v, depth + 1));
  if (isObj(value)) {
    const out: Loose = {};
    for (const [k, v] of Object.entries(value).slice(0, 40)) out[k] = redactDeep(v, depth + 1);
    return out;
  }
  return value;
}

/** Works on a Sentry event (or anything shaped like one). Returns the same object, cleaned. */
export function scrubEvent<T extends object>(event: T): T {
  const e = event as unknown as Loose;
  // Who: nothing about the person, not even their id or IP.
  delete e["user"];
  // Request: method and path only. No cookies, headers, body or query string.
  if (isObj(e["request"])) {
    const r = e["request"];
    e["request"] = {
      ...(typeof r["method"] === "string" ? { method: r["method"] } : {}),
      ...(typeof r["url"] === "string" ? { url: stripUrl(r["url"]) } : {}),
    };
  }
  if (typeof e["message"] === "string") e["message"] = redactText(e["message"]);
  if (isObj(e["exception"]) && Array.isArray(e["exception"]["values"])) {
    for (const v of e["exception"]["values"]) {
      if (isObj(v) && typeof v["value"] === "string")
        v["value"] = redactText(v["value"]).slice(0, 1000);
    }
  }
  if (Array.isArray(e["breadcrumbs"])) {
    e["breadcrumbs"] = e["breadcrumbs"].slice(-20).map((b) => {
      if (!isObj(b)) return b;
      const data = isObj(b["data"]) ? b["data"] : {};
      return {
        ...(typeof b["category"] === "string" ? { category: b["category"] } : {}),
        ...(typeof b["type"] === "string" ? { type: b["type"] } : {}),
        ...(typeof b["level"] === "string" ? { level: b["level"] } : {}),
        ...(typeof b["timestamp"] === "number" ? { timestamp: b["timestamp"] } : {}),
        ...(typeof b["message"] === "string" ? { message: redactText(b["message"]) } : {}),
        // Keep where a request went and whether it worked, never what was sent.
        data: {
          ...(typeof data["url"] === "string" ? { url: stripUrl(data["url"]) } : {}),
          ...(typeof data["method"] === "string" ? { method: data["method"] } : {}),
          ...(typeof data["status_code"] === "number" ? { status_code: data["status_code"] } : {}),
        },
      };
    });
  }
  if (isObj(e["extra"])) e["extra"] = redactDeep(e["extra"]);
  if (isObj(e["contexts"])) {
    // Keep runtime/device/os info, drop anything custom.
    const keep: Loose = {};
    for (const k of ["browser", "os", "device", "runtime", "app"])
      if (e["contexts"][k]) keep[k] = e["contexts"][k];
    e["contexts"] = keep;
  }
  if (isObj(e["tags"])) e["tags"] = redactDeep(e["tags"]);
  return event;
}
