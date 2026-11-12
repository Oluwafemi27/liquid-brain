import "@tanstack/react-start/server-only";

// Medusa v2 Admin API client. Auth: a secret API key sent as `Authorization: Basic <key>`
// (docs.medusajs.com/api/admin#authentication). Amounts are in MAJOR units (19.99 = $19.99) in v2.
// Not yet exercised against a live Medusa instance: tests mock fetch, so confirm on a dev store first.

export const medusaConfigured = (): boolean =>
  Boolean(process.env["MEDUSA_BACKEND_URL"] && process.env["MEDUSA_ADMIN_TOKEN"]);

export interface MedusaPrice {
  currency_code: string;
  amount: number;
}
export interface MedusaVariant {
  id: string;
  title?: string;
  sku?: string | null;
  prices?: MedusaPrice[];
}
export interface MedusaProduct {
  id: string;
  title: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  variants?: MedusaVariant[];
}
export interface MedusaOrder {
  id: string;
  display_id?: number;
  status?: string;
  created_at: string;
  total?: number;
  currency_code?: string;
  payment_status?: string;
  fulfillment_status?: string;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = process.env["MEDUSA_BACKEND_URL"]?.replace(/\/+$/, "");
  const key = process.env["MEDUSA_ADMIN_TOKEN"];
  if (!base || !key) throw new Error("MEDUSA_BACKEND_URL / MEDUSA_ADMIN_TOKEN aren't set.");
  const init: RequestInit = {
    method,
    headers: { authorization: `Basic ${key}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(30_000),
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${base}${path}`, init);
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`Medusa ${method} ${path.split("?")[0]} failed (${res.status}). ${text}`);
  }
  return (await res.json()) as T;
}

const PRODUCT_FIELDS = "id,title,status,metadata,*variants,*variants.prices";

export async function listProducts(
  limit = 50,
  offset = 0,
): Promise<{ products: MedusaProduct[]; count: number }> {
  const r = await call<{ products: MedusaProduct[]; count?: number }>(
    "GET",
    `/admin/products?limit=${limit}&offset=${offset}&fields=${encodeURIComponent(PRODUCT_FIELDS)}`,
  );
  return { products: r.products ?? [], count: r.count ?? r.products?.length ?? 0 };
}

export async function getProduct(id: string): Promise<MedusaProduct> {
  const r = await call<{ product: MedusaProduct }>(
    "GET",
    `/admin/products/${encodeURIComponent(id)}?fields=${encodeURIComponent(PRODUCT_FIELDS)}`,
  );
  return r.product;
}

/** Orders created on/after `sinceIso`, newest first, up to `maxOrders`. */
export async function listOrders(sinceIso: string, maxOrders = 500): Promise<MedusaOrder[]> {
  const out: MedusaOrder[] = [];
  const pageSize = 100;
  for (let offset = 0; offset < maxOrders; offset += pageSize) {
    const q = new URLSearchParams({
      limit: String(pageSize),
      offset: String(offset),
      order: "-created_at",
      fields:
        "id,display_id,status,created_at,total,currency_code,+payment_status,+fulfillment_status",
    });
    q.set("created_at[$gte]", sinceIso);
    const r = await call<{ orders: MedusaOrder[]; count?: number }>("GET", `/admin/orders?${q}`);
    out.push(...(r.orders ?? []));
    if ((r.orders?.length ?? 0) < pageSize) break;
  }
  return out.slice(0, maxOrders);
}

export interface MedusaOrderDetail extends MedusaOrder {
  items?: {
    id: string;
    title?: string;
    quantity: number;
    variant_sku?: string | null;
    product_id?: string | null;
    unit_price?: number;
  }[];
  shipping_address?: {
    first_name?: string | null;
    last_name?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
    phone?: string | null;
  } | null;
}

/** One order with its items and shipping address (read server-side only; never shown to the model). */
export async function getOrder(id: string): Promise<MedusaOrderDetail> {
  const fields =
    "id,display_id,status,created_at,total,currency_code,+payment_status,+fulfillment_status,*items,*shipping_address";
  const r = await call<{ order: MedusaOrderDetail }>(
    "GET",
    `/admin/orders/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`,
  );
  return r.order;
}

export interface NewProduct {
  title: string;
  description?: string;
  sku?: string;
  currencyCode: string;
  price: number;
  metadata: Record<string, unknown>;
}

/** Creates a DRAFT product with one default variant. Never publishes. */
export async function createDraftProduct(p: NewProduct): Promise<MedusaProduct> {
  const body = {
    title: p.title,
    description: p.description,
    status: "draft",
    options: [{ title: "Default", values: ["Default"] }],
    variants: [
      {
        title: "Default",
        sku: p.sku,
        options: { Default: "Default" },
        manage_inventory: false,
        prices: [{ currency_code: p.currencyCode.toLowerCase(), amount: p.price }],
      },
    ],
    metadata: p.metadata,
  };
  const r = await call<{ product: MedusaProduct }>("POST", "/admin/products", body);
  return r.product;
}

/** Sets one currency's price on a variant. Sends the full price list so other currencies survive. */
export async function setVariantPrice(
  productId: string,
  variant: MedusaVariant,
  currencyCode: string,
  amount: number,
): Promise<void> {
  const cc = currencyCode.toLowerCase();
  const others = (variant.prices ?? []).filter((x) => x.currency_code.toLowerCase() !== cc);
  await call(
    "POST",
    `/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variant.id)}`,
    {
      prices: [
        ...others.map((x) => ({ currency_code: x.currency_code, amount: x.amount })),
        { currency_code: cc, amount },
      ],
    },
  );
}

export async function deleteProduct(id: string): Promise<void> {
  await call("DELETE", `/admin/products/${encodeURIComponent(id)}`);
}
