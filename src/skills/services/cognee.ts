import "@tanstack/react-start/server-only";

// cognee Cloud HTTP API: base URL = your tenant host, every path under /api/v1, headers
// X-Api-Key + X-Tenant-Id. add = multipart form (datasetName + raw_data); cognify and search = JSON.

export const cogneeConfigured = (): boolean =>
  Boolean(process.env["COGNEE_BASE_URL"] && process.env["COGNEE_API_KEY"]);

/** One dataset per ADUF user, so one owner's facts are never searched together with another's. */
export const cogneeDataset = (userId: string): string => `aduf-${userId}`;

function base(): { url: string; headers: Record<string, string> } {
  const url = process.env["COGNEE_BASE_URL"]?.replace(/\/+$/, "");
  const key = process.env["COGNEE_API_KEY"];
  if (!url || !key) throw new Error("COGNEE_BASE_URL / COGNEE_API_KEY aren't set.");
  const headers: Record<string, string> = { "x-api-key": key };
  const tenant = process.env["COGNEE_TENANT_ID"];
  if (tenant) headers["x-tenant-id"] = tenant;
  return { url, headers };
}

async function check(res: Response, what: string): Promise<void> {
  if (!res.ok) {
    const text = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`cognee ${what} failed (${res.status}). ${text}`);
  }
}

export async function cogneeAdd(dataset: string, texts: string[]): Promise<void> {
  const { url, headers } = base();
  const form = new FormData();
  form.append("datasetName", dataset);
  for (const t of texts) form.append("raw_data", t);
  await check(
    await fetch(`${url}/api/v1/add`, {
      method: "POST",
      headers,
      body: form,
      signal: AbortSignal.timeout(60_000),
    }),
    "add",
  );
}

export async function cogneeCognify(dataset: string): Promise<void> {
  const { url, headers } = base();
  await check(
    await fetch(`${url}/api/v1/cognify`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ datasets: [dataset] }),
      signal: AbortSignal.timeout(120_000),
    }),
    "cognify",
  );
}

export async function cogneeSearch(dataset: string, query: string): Promise<unknown> {
  const { url, headers } = base();
  const res = await fetch(`${url}/api/v1/search`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ query, search_type: "GRAPH_COMPLETION", datasets: [dataset] }),
    signal: AbortSignal.timeout(60_000),
  });
  await check(res, "search");
  return res.json();
}
