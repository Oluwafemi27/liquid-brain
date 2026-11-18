// Test double for @composio/core. Tests steer it through globalThis.__c and read back what was called.
const st = () => (globalThis as any).__c;
export class Composio {
  constructor(public opts: unknown) {}
  toolkits = { get: async (q: unknown) => { st().calls.push(["toolkits.get", q]); return st().toolkits; } };
  connectedAccounts = {
    list: async (q: any) => ({ items: st().connections.filter((c: any) => !q.userIds || q.userIds.includes(c.userId)).map((c: any) => ({ id: c.id, status: "ACTIVE", createdAt: "2026-11-01T00:00:00Z", toolkit: { slug: c.toolkit } })) }),
    link: async (u: string, a: string, o: unknown) => { st().calls.push(["link", u, a, o]); return { redirectUrl: st().noRedirect ? null : `https://connect.test/${a}` }; },
    delete: async (id: string) => { st().calls.push(["delete", id]); },
  };
  authConfigs = {
    list: async (q: unknown) => { st().calls.push(["authConfigs.list", q]); return { items: st().authConfigs }; },
    create: async (slug: string, b: unknown) => { st().calls.push(["authConfigs.create", slug, b]); return { id: `ac_new_${slug}` }; },
  };
  tools = {
    getRawComposioTools: async (q: unknown) => { st().calls.push(["tools.search", q]); return [{ slug: "GMAIL_SEND_EMAIL", name: "Send email", description: "Sends an email" }]; },
    execute: async (slug: string, body: any) => { st().calls.push(["execute", slug, body]); return st().exec ?? { successful: true, data: { id: "m1" }, error: null }; },
  };
}
