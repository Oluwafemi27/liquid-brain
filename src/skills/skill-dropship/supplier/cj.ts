import "@tanstack/react-start/server-only";

// CJ Dropshipping API 2.0, createOrderV2 only. Verified against developers.cjdropshipping.com (POST
// /api2.0/v1/shopping/order/createOrderV2, header CJ-Access-Token, required body fields as below).
// Orders are created UNPAID (payType 3 = create only): the owner pays inside CJ, so ADUF never spends money.
// NOT built, because their docs sections weren't verifiable here: order status polling and tracking pull.
// CJ access tokens expire, so CJ_ACCESS_TOKEN has to be refreshed by the owner.

export const cjConfigured = (): boolean => Boolean(process.env["CJ_ACCESS_TOKEN"]);

export interface CjOrderInput {
  /** Our supplier_orders.id: CJ rejects a repeat of the same orderNumber, which makes retries safe. */
  orderNumber: string;
  customerName: string;
  countryCode: string;
  country: string;
  province: string;
  city: string;
  address: string;
  zip?: string | undefined;
  phone?: string | undefined;
  logisticName: string;
  fromCountryCode: string;
  products: { sku: string; quantity: number }[];
}

export async function cjCreateUnpaidOrder(
  o: CjOrderInput,
): Promise<{ orderId: string; orderStatus: string | null }> {
  const token = process.env["CJ_ACCESS_TOKEN"];
  if (!token) throw new Error("CJ_ACCESS_TOKEN isn't set.");
  const res = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV2",
    {
      method: "POST",
      headers: { "content-type": "application/json", "CJ-Access-Token": token },
      body: JSON.stringify({
        orderNumber: o.orderNumber,
        shippingCountryCode: o.countryCode,
        shippingCountry: o.country,
        shippingProvince: o.province,
        shippingCity: o.city,
        shippingCustomerName: o.customerName,
        shippingAddress: o.address,
        shippingZip: o.zip,
        shippingPhone: o.phone,
        logisticName: o.logisticName,
        fromCountryCode: o.fromCountryCode,
        payType: 3,
        products: o.products.map((p) => ({ sku: p.sku, quantity: p.quantity })),
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  const body = (await res.json().catch(() => null)) as {
    result?: boolean;
    success?: boolean;
    code?: number;
    message?: string;
    data?: { orderId?: string; orderStatus?: string };
  } | null;
  const ok =
    res.ok && body && (body.result === true || body.success === true) && body.data?.orderId;
  if (!ok)
    throw new Error(
      `CJ rejected the order (${res.status}${body?.message ? `: ${String(body.message).slice(0, 160)}` : ""}).`,
    );
  return { orderId: String(body.data!.orderId), orderStatus: body.data!.orderStatus ?? null };
}
