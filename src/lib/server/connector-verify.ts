import "@tanstack/react-start/server-only";
import { assertPublicHttpsUrl } from "./url-guard";

export type VerifyResult = { ok: true } | { ok: false; error: string };

interface Probe {
  url: string;
  init?: RequestInit;
  /** Extra check on a 200 response (some APIs answer 200 with ok:false). */
  accept?: (body: unknown) => boolean;
}

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`;
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

/** One cheap, read-only call per provider that proves the pasted credentials actually work. */
function probeFor(id: string, v: Record<string, string>): Probe | null {
  switch (id) {
    case "paystack":
      return { url: "https://api.paystack.co/balance", init: { headers: bearer(v["secretKey"]!) } };
    case "stripe":
      return {
        url: "https://api.stripe.com/v1/charges?limit=1",
        init: { headers: bearer(v["secretKey"]!) },
      };
    case "flutterwave":
      return {
        url: "https://api.flutterwave.com/v3/transactions?page=1",
        init: { headers: bearer(v["secretKey"]!) },
      };
    case "paypal":
      return {
        url: "https://api-m.paypal.com/v1/oauth2/token",
        init: {
          method: "POST",
          headers: {
            authorization: basic(v["clientId"]!, v["clientSecret"]!),
            "content-type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        },
      };
    case "square":
      return {
        url: "https://connect.squareup.com/v2/locations",
        init: { headers: bearer(v["accessToken"]!) },
      };
    case "woocommerce": {
      const origin = assertPublicHttpsUrl(v["storeUrl"]!);
      return {
        url: `${origin}/wp-json/wc/v3/orders?per_page=1`,
        init: { headers: { authorization: basic(v["consumerKey"]!, v["consumerSecret"]!) } },
      };
    }
    case "bigcommerce":
      return {
        url: `https://api.bigcommerce.com/stores/${encodeURIComponent(v["storeHash"]!)}/v2/store`,
        init: { headers: { "x-auth-token": v["accessToken"]!, accept: "application/json" } },
      };
    case "wordpress": {
      const origin = assertPublicHttpsUrl(v["siteUrl"]!);
      return {
        url: `${origin}/wp-json/wp/v2/users/me`,
        init: { headers: { authorization: basic(v["username"]!, v["appPassword"]!) } },
      };
    }
    case "webflow":
      return { url: "https://api.webflow.com/v2/sites", init: { headers: bearer(v["apiToken"]!) } };
    case "hubspot":
      return {
        url: "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
        init: { headers: bearer(v["accessToken"]!) },
      };
    case "pipedrive":
      return {
        url: `https://api.pipedrive.com/v1/users/me?api_token=${encodeURIComponent(v["apiToken"]!)}`,
      };
    case "mailchimp": {
      const dc = v["apiKey"]!.split("-").pop() ?? "";
      if (!/^[a-z]{2}\d{1,2}$/.test(dc))
        throw new Error("A Mailchimp key ends with a data centre like -us21.");
      return {
        url: `https://${dc}.api.mailchimp.com/3.0/ping`,
        init: { headers: { authorization: basic("adufcheck", v["apiKey"]!) } },
      };
    }
    case "sendgrid":
      return { url: "https://api.sendgrid.com/v3/scopes", init: { headers: bearer(v["apiKey"]!) } };
    case "brevo":
      return {
        url: "https://api.brevo.com/v3/account",
        init: { headers: { "api-key": v["apiKey"]!, accept: "application/json" } },
      };
    case "klaviyo":
      return {
        url: "https://a.klaviyo.com/api/accounts/",
        init: {
          headers: {
            authorization: `Klaviyo-API-Key ${v["privateKey"]}`,
            revision: "2024-10-15",
            accept: "application/json",
          },
        },
      };
    case "whatsapp":
      return {
        url: `https://graph.facebook.com/v21.0/${encodeURIComponent(v["phoneNumberId"]!)}?fields=display_phone_number,verified_name`,
        init: { headers: bearer(v["accessToken"]!) },
      };
    case "twilio":
      return {
        url: `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(v["accountSid"]!)}.json`,
        init: { headers: { authorization: basic(v["accountSid"]!, v["authToken"]!) } },
      };
    case "termii":
      return {
        url: `https://api.ng.termii.com/api/get-balance?api_key=${encodeURIComponent(v["apiKey"]!)}`,
      };
    case "africastalking":
      return {
        url: `https://api.africastalking.com/version1/user?username=${encodeURIComponent(v["username"]!)}`,
        init: { headers: { apikey: v["apiKey"]!, accept: "application/json" } },
      };
    case "slack":
      return {
        url: "https://slack.com/api/auth.test",
        init: { method: "POST", headers: bearer(v["botToken"]!) },
        accept: (b) => (b as { ok?: boolean }).ok === true,
      };
    case "airtable":
      return {
        url: "https://api.airtable.com/v0/meta/whoami",
        init: { headers: bearer(v["token"]!) },
      };
    case "notion":
      return {
        url: "https://api.notion.com/v1/users/me",
        init: { headers: { ...bearer(v["token"]!), "notion-version": "2022-06-28" } },
      };
    case "typeform":
      return { url: "https://api.typeform.com/me", init: { headers: bearer(v["token"]!) } };
    case "calendly":
      return { url: "https://api.calendly.com/users/me", init: { headers: bearer(v["token"]!) } };
    default:
      return null; // no cheap check known (Semrush, Jumia): saved without a live test
  }
}

/** Calls the provider once with the pasted credentials. A key that doesn't work is never saved,
 *  so "Connected" always means it really connected. */
export async function verifyCredentials(
  id: string,
  values: Record<string, string>,
  name: string,
): Promise<VerifyResult> {
  let probe: Probe | null;
  try {
    probe = probeFor(id, values);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Those details look wrong." };
  }
  if (!probe) return { ok: true };
  let res: Response;
  try {
    res = await fetch(probe.url, {
      ...probe.init,
      signal: AbortSignal.timeout(9000),
      redirect: "manual",
    });
  } catch {
    return {
      ok: false,
      error: `Couldn't reach ${name} to check these details. Check the address and try again.`,
    };
  }
  if (res.status >= 300 && res.status < 400)
    return { ok: false, error: `${name} redirected the request — check the address.` };
  if (res.status === 401 || res.status === 403)
    return {
      ok: false,
      error: `${name} rejected these credentials. Check them and the permissions you granted.`,
    };
  if (!res.ok)
    return {
      ok: false,
      error: `${name} answered with an error (${res.status}). Check the details and try again.`,
    };
  if (probe.accept) {
    const body = await res.json().catch(() => null);
    if (!probe.accept(body)) return { ok: false, error: `${name} rejected these credentials.` };
  }
  return { ok: true };
}
