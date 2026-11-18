import "@tanstack/react-start/server-only";
import { normalizeStage, STAGE_PROBABILITY, type ParsedRecord } from "@/lib/import-mapping";
import { assertPublicHttpsUrl } from "./url-guard";
import { ImportError } from "./google-auth";

const MAX_RECORDS = 2000;
const blank = (): ParsedRecord => ({
  occurredOn: null,
  amount: null,
  name: null,
  company: null,
  email: null,
  channel: null,
  stage: null,
  probability: null,
  owner: null,
  segment: null,
  orders: null,
});
const day = (iso?: string | null) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null;
const clean = (s?: string | null) => (s && s.trim() ? s.trim() : null);
const fullName = (...p: (string | null | undefined)[]) => clean(p.filter(Boolean).join(" "));

// ------------------------------------------------------------- pure mappers
// Shapes follow each provider's documented list responses. Anything we can't use is skipped, never guessed.

export interface PaystackTx {
  status?: string;
  amount?: number;
  currency?: string;
  paid_at?: string;
  created_at?: string;
  customer?: { email?: string; first_name?: string; last_name?: string } | null;
}
export function mapPaystack(rows: PaystackTx[]): ParsedRecord[] {
  return rows.flatMap((t) => {
    const date = day(t.paid_at ?? t.created_at);
    if (t.status !== "success" || !date || !(t.amount && t.amount > 0)) return [];
    return [
      {
        ...blank(),
        occurredOn: date,
        amount: t.amount / 100,
        currency: (t.currency ?? "NGN").toUpperCase(),
        name: fullName(t.customer?.first_name, t.customer?.last_name) ?? clean(t.customer?.email),
        email: clean(t.customer?.email)?.toLowerCase() ?? null,
      },
    ];
  });
}

const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);
export interface StripeCharge {
  status?: string;
  paid?: boolean;
  amount?: number;
  amount_refunded?: number;
  currency?: string;
  created?: number;
  billing_details?: { name?: string | null; email?: string | null } | null;
  receipt_email?: string | null;
  customer?: string | null;
}
export function mapStripe(rows: StripeCharge[]): ParsedRecord[] {
  return rows.flatMap((c) => {
    const cur = (c.currency ?? "usd").toUpperCase();
    const factor = ZERO_DECIMAL.has(cur) ? 1 : 100;
    const net = ((c.amount ?? 0) - (c.amount_refunded ?? 0)) / factor; // refunds come off the sale
    if (c.status !== "succeeded" || !c.paid || net <= 0 || !c.created) return [];
    const email = clean(c.billing_details?.email ?? c.receipt_email)?.toLowerCase() ?? null;
    return [
      {
        ...blank(),
        occurredOn: new Date(c.created * 1000).toISOString().slice(0, 10),
        amount: net,
        currency: cur,
        name: clean(c.billing_details?.name) ?? email ?? clean(c.customer),
        email,
      },
    ];
  });
}

export interface FlwTx {
  status?: string;
  amount?: number;
  currency?: string;
  created_at?: string;
  customer?: { name?: string; fullname?: string; email?: string } | null;
}
export function mapFlutterwave(rows: FlwTx[]): ParsedRecord[] {
  return rows.flatMap((t) => {
    const date = day(t.created_at);
    if (t.status !== "successful" || !date || !(t.amount && t.amount > 0)) return [];
    const email = clean(t.customer?.email)?.toLowerCase() ?? null;
    return [
      {
        ...blank(),
        occurredOn: date,
        amount: t.amount,
        currency: (t.currency ?? "NGN").toUpperCase(),
        name: clean(t.customer?.name ?? t.customer?.fullname) ?? email,
        email,
      },
    ];
  });
}

export interface WooOrder {
  status?: string;
  total?: string;
  currency?: string;
  date_created_gmt?: string | null;
  date_created?: string | null;
  billing?: { first_name?: string; last_name?: string; email?: string } | null;
}
export function mapWoo(rows: WooOrder[]): ParsedRecord[] {
  return rows.flatMap((o) => {
    const total = Number.parseFloat(o.total ?? "");
    const date = day(o.date_created_gmt ?? o.date_created);
    if (!["completed", "processing"].includes(o.status ?? "") || !date || !(total > 0)) return [];
    const email = clean(o.billing?.email)?.toLowerCase() ?? null;
    return [
      {
        ...blank(),
        occurredOn: date,
        amount: total,
        currency: (o.currency ?? "USD").toUpperCase(),
        name: fullName(o.billing?.first_name, o.billing?.last_name) ?? email,
        email,
      },
    ];
  });
}

const prettySource = (s?: string) =>
  s
    ? s
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/^./, (c) => c.toUpperCase())
    : null;
export interface HubContact {
  properties?: {
    firstname?: string;
    lastname?: string;
    email?: string;
    company?: string;
    createdate?: string;
    hs_analytics_source?: string;
  };
}
export function mapHubspotContacts(rows: HubContact[]): ParsedRecord[] {
  return rows.flatMap((c) => {
    const p = c.properties ?? {};
    const date = day(p.createdate);
    const name = fullName(p.firstname, p.lastname);
    if (!date || !(name || clean(p.email) || clean(p.company))) return [];
    return [
      {
        ...blank(),
        occurredOn: date,
        name,
        email: clean(p.email)?.toLowerCase() ?? null,
        company: clean(p.company),
        channel: prettySource(p.hs_analytics_source),
      },
    ];
  });
}

export interface HubDeal {
  properties?: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    createdate?: string;
    deal_currency_code?: string;
  };
}
export interface HubStage {
  label: string;
  probability?: number | null;
}
export function mapHubspotDeals(rows: HubDeal[], stages: Record<string, HubStage>): ParsedRecord[] {
  return rows.flatMap((d) => {
    const p = d.properties ?? {};
    const st = stages[p.dealstage ?? ""];
    const stage = normalizeStage(st?.label ?? p.dealstage);
    const amount = Number.parseFloat(p.amount ?? "");
    if (!stage || !(amount >= 0) || !clean(p.dealname)) return []; // lost deals / unnamed: not on the active board
    return [
      {
        ...blank(),
        occurredOn: day(p.createdate),
        amount,
        currency: (p.deal_currency_code ?? "USD").toUpperCase(),
        name: clean(p.dealname),
        stage,
        probability:
          st?.probability != null ? Math.round(st.probability * 100) : STAGE_PROBABILITY[stage],
      },
    ];
  });
}

export interface PdDeal {
  title?: string;
  value?: number;
  currency?: string;
  status?: string;
  stage_id?: number;
  add_time?: string;
  org_name?: string | null;
  person_name?: string | null;
  probability?: number | null;
  user_id?: { name?: string } | number | null;
  person_id?: { name?: string } | number | null;
}
export function mapPipedrive(rows: PdDeal[], stages: Record<number, string>): ParsedRecord[] {
  return rows.flatMap((d) => {
    if (d.status === "lost" || d.status === "deleted" || !clean(d.title)) return [];
    const stage = d.status === "won" ? ("Won" as const) : normalizeStage(stages[d.stage_id ?? -1]);
    if (!stage || typeof d.value !== "number" || d.value < 0) return [];
    const owner = typeof d.user_id === "object" && d.user_id ? clean(d.user_id.name) : null;
    const person =
      clean(d.person_name) ??
      (typeof d.person_id === "object" && d.person_id ? clean(d.person_id.name) : null);
    return [
      {
        ...blank(),
        occurredOn: day(d.add_time),
        amount: d.value,
        currency: (d.currency ?? "USD").toUpperCase(),
        name: clean(d.title),
        company: clean(d.org_name) ?? person,
        owner,
        stage,
        probability: d.probability ?? STAGE_PROBABILITY[stage],
      },
    ];
  });
}

// ------------------------------------------------------------------ fetching

async function getJson<T>(url: string, init: RequestInit, name: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000), redirect: "manual" });
  } catch {
    throw new ImportError(`Couldn't reach ${name}. Try again in a moment.`, "api");
  }
  if (res.status === 401 || res.status === 403)
    throw new ImportError(
      `${name} rejected the saved credentials. Reconnect it in Settings.`,
      "reauth",
    );
  if (res.status === 429)
    throw new ImportError(`${name} is rate-limiting requests. Try again in a few minutes.`, "api");
  if (!res.ok) throw new ImportError(`${name} returned an error (${res.status}).`, "api");
  return (await res.json()) as T;
}

const monthsAgo = (n: number) => new Date(Date.now() - n * 30.5 * 86_400_000);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export interface ImportBatch {
  kind: "sale" | "lead" | "deal";
  sourceRef: string;
  label: string;
  currency: string;
  records: ParsedRecord[];
  note: string;
}

const mostCommonCurrency = (r: ParsedRecord[], fallback: string) => {
  const n = new Map<string, number>();
  for (const x of r) n.set(x.currency ?? fallback, (n.get(x.currency ?? fallback) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
};
const batch = (
  id: string,
  kind: ImportBatch["kind"],
  label: string,
  records: ParsedRecord[],
  fallback: string,
  note: string,
): ImportBatch => ({
  kind,
  sourceRef: `${id}:${kind}`,
  label,
  records,
  currency: mostCommonCurrency(records, fallback),
  note,
});

/** Pulls what ADUF can use from a connected platform (last 12 months, up to 2,000 records per kind). */
export async function fetchConnectorBatches(
  id: string,
  c: Record<string, string>,
): Promise<ImportBatch[]> {
  const since = monthsAgo(12);
  switch (id) {
    case "paystack": {
      const rows: PaystackTx[] = [];
      for (let page = 1; page <= 10 && rows.length < MAX_RECORDS; page++) {
        const j = await getJson<{ data?: PaystackTx[]; meta?: { pageCount?: number } }>(
          `https://api.paystack.co/transaction?perPage=200&page=${page}&status=success&from=${isoDay(since)}`,
          { headers: { authorization: `Bearer ${c["secretKey"]}` } },
          "Paystack",
        );
        rows.push(...(j.data ?? []));
        if (page >= (j.meta?.pageCount ?? 1)) break;
      }
      return [
        batch(
          id,
          "sale",
          "Paystack payments",
          mapPaystack(rows),
          "NGN",
          "Successful payments from the last 12 months.",
        ),
      ];
    }
    case "stripe": {
      const rows: StripeCharge[] = [];
      let after = "";
      for (let page = 0; page < 10 && rows.length < MAX_RECORDS; page++) {
        const j = await getJson<{ data?: (StripeCharge & { id: string })[]; has_more?: boolean }>(
          `https://api.stripe.com/v1/charges?limit=100&created[gte]=${Math.floor(since.getTime() / 1000)}${after ? `&starting_after=${after}` : ""}`,
          { headers: { authorization: `Bearer ${c["secretKey"]}` } },
          "Stripe",
        );
        rows.push(...(j.data ?? []));
        after = j.data?.at(-1)?.id ?? "";
        if (!j.has_more || !after) break;
      }
      return [
        batch(
          id,
          "sale",
          "Stripe charges",
          mapStripe(rows),
          "USD",
          "Paid charges from the last 12 months, net of refunds.",
        ),
      ];
    }
    case "flutterwave": {
      const rows: FlwTx[] = [];
      for (let page = 1; page <= 10 && rows.length < MAX_RECORDS; page++) {
        const j = await getJson<{
          data?: FlwTx[];
          meta?: { page_info?: { total_pages?: number } };
        }>(
          `https://api.flutterwave.com/v3/transactions?page=${page}&from=${isoDay(since)}&to=${isoDay(new Date())}&status=successful`,
          { headers: { authorization: `Bearer ${c["secretKey"]}` } },
          "Flutterwave",
        );
        rows.push(...(j.data ?? []));
        if (page >= (j.meta?.page_info?.total_pages ?? 1)) break;
      }
      return [
        batch(
          id,
          "sale",
          "Flutterwave transactions",
          mapFlutterwave(rows),
          "NGN",
          "Successful transactions from the last 12 months.",
        ),
      ];
    }
    case "woocommerce": {
      const origin = assertPublicHttpsUrl(c["storeUrl"]!);
      const auth = `Basic ${btoa(`${c["consumerKey"]}:${c["consumerSecret"]}`)}`;
      const rows: WooOrder[] = [];
      for (let page = 1; page <= 10 && rows.length < MAX_RECORDS; page++) {
        const j = await getJson<WooOrder[]>(
          `${origin}/wp-json/wc/v3/orders?per_page=100&page=${page}&after=${since.toISOString()}`,
          { headers: { authorization: auth } },
          "WooCommerce",
        );
        rows.push(...j);
        if (j.length < 100) break;
      }
      return [
        batch(
          id,
          "sale",
          "WooCommerce orders",
          mapWoo(rows),
          "USD",
          "Completed and processing orders from the last 12 months.",
        ),
      ];
    }
    case "hubspot": {
      const h = { headers: { authorization: `Bearer ${c["accessToken"]}` } };
      const list = async <T>(path: string, props: string): Promise<T[]> => {
        const out: T[] = [];
        let after = "";
        for (let page = 0; page < 10 && out.length < MAX_RECORDS; page++) {
          const j = await getJson<{ results?: T[]; paging?: { next?: { after?: string } } }>(
            `https://api.hubapi.com/crm/v3/objects/${path}?limit=100&properties=${props}${after ? `&after=${after}` : ""}`,
            h,
            "HubSpot",
          );
          out.push(...(j.results ?? []));
          after = j.paging?.next?.after ?? "";
          if (!after) break;
        }
        return out;
      };
      const pipes = await getJson<{
        results?: {
          stages?: { id: string; label: string; metadata?: { probability?: string } }[];
        }[];
      }>("https://api.hubapi.com/crm/v3/pipelines/deals", h, "HubSpot");
      const stages: Record<string, HubStage> = {};
      for (const p of pipes.results ?? [])
        for (const st of p.stages ?? [])
          stages[st.id] = {
            label: st.label,
            probability: st.metadata?.probability != null ? Number(st.metadata.probability) : null,
          };
      const [contacts, deals] = await Promise.all([
        list<HubContact>(
          "contacts",
          "firstname,lastname,email,company,createdate,hs_analytics_source",
        ),
        list<HubDeal>("deals", "dealname,amount,dealstage,createdate,deal_currency_code"),
      ]);
      return [
        batch(
          id,
          "lead",
          "HubSpot contacts",
          mapHubspotContacts(contacts),
          "USD",
          "Contacts, with their original source.",
        ),
        batch(
          id,
          "deal",
          "HubSpot deals",
          mapHubspotDeals(deals, stages),
          "USD",
          "Open and won deals; lost deals are left out.",
        ),
      ];
    }
    case "pipedrive": {
      const tok = encodeURIComponent(c["apiToken"]!);
      const st = await getJson<{ data?: { id: number; name: string }[] }>(
        `https://api.pipedrive.com/v1/stages?api_token=${tok}`,
        {},
        "Pipedrive",
      );
      const stages = Object.fromEntries((st.data ?? []).map((s) => [s.id, s.name]));
      const rows: PdDeal[] = [];
      let start = 0;
      for (let page = 0; page < 5 && rows.length < MAX_RECORDS; page++) {
        const j = await getJson<{
          data?: PdDeal[] | null;
          additional_data?: {
            pagination?: { more_items_in_collection?: boolean; next_start?: number };
          };
        }>(
          `https://api.pipedrive.com/v1/deals?status=all_not_deleted&limit=500&start=${start}&api_token=${tok}`,
          {},
          "Pipedrive",
        );
        rows.push(...(j.data ?? []));
        const pg = j.additional_data?.pagination;
        if (!pg?.more_items_in_collection) break;
        start = pg.next_start ?? start + 500;
      }
      return [
        batch(
          id,
          "deal",
          "Pipedrive deals",
          mapPipedrive(rows, stages),
          "USD",
          "Open and won deals; lost deals are left out.",
        ),
      ];
    }
    default:
      throw new ImportError("ADUF can't import data from this connector yet.", "bad_data");
  }
}

export const IMPORTABLE_CONNECTORS = [
  "paystack",
  "stripe",
  "flutterwave",
  "woocommerce",
  "hubspot",
  "pipedrive",
] as const;
