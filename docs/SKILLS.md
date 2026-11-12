# Skills, connectors and memory import

Layout (modules inside the one app, nothing moved):

```
src/core/                     barrel re-exporting the existing backend (lib/server) for skills to use
src/skills/                   framework: types.ts, registry.ts, index.ts
  skill-business-analyst/     pandas in E2B + cognee graph   (working; needs E2B_API_KEY / COGNEE_*)
  skill-competitor-spy/       firecrawl + apify              (working; needs FIRECRAWL_API_KEY / APIFY_TOKEN; lightpanda not wired)
  skill-dropship/             medusa + dropshipping logic    (working; engine needs no keys, store tools need MEDUSA_*)
  skill-ads-operator/         Meta Marketing API, read-only  (working; needs a Meta connection or META_ADS_ACCESS_TOKEN)
  skill-n8n-engineer/         (planned; the agent already has search_n8n_templates / search_n8n_docs built in)
src/connectors/composio-hub/  Composio                       (built; needs a free Composio API key, no hosting)
src/import-memory/            mem0 + claude-mem importer     (working)
src/playbooks/                14 method guides from superpowers + agent-skills (MIT)
src/agents/                   sub-agent orchestrator (the `delegate` tool)
```

## How a skill plugs in

A skill is a `SkillModule` (`src/skills/types.ts`): prompt guidance plus named tools. The agent
(`lib/server/agent.ts`) can call any ready tool with `{"type":"skill_tool","name":...,"input":{...}}`.

- A skill is advertised to the model only when `implemented` is true, it has tools, and every env var in
  `requiresEnv` is set. Otherwise it is not mentioned, so the model can't call something that would fail.
- Tools have a `risk`. `read` runs immediately. Every other risk (ads, messages, money, external, internal)
  is refused by `runSkillTool` with `approval_required`; those must go through the proposal flow in
  `lib/server/actions.ts` (add an `ActionType` in `lib/action-registry.ts`). Nothing risky can run from the registry.
- To implement a skill: add tools to its `index.ts`, set `implemented: true`, add its env vars to `.env.example`.

## Importing memory

`POST /api/import-memory` (signed-in, Bearer token) with `{ "content": "<file text>", "mode": "preview" | "import" }`.
Preview reports what was found; import upserts into `imported_memories` (run migration 021 first).
Re-importing the same file updates rows, it doesn't duplicate them. Supported: mem0 `get_all()` output
and claude-mem JSON exports (observations and summaries only; raw prompts are never imported), as JSON or JSONL.
Imported facts are stored but not yet shown in the Business Memory graph or given to the agent.

## Services (src/skills/services)

Thin REST clients: `firecrawl.ts` (v2 scrape), `apify.ts` (run-sync-get-dataset-items, closed actor allowlist),
`cognee.ts` (cognee Cloud add / cognify / search, one dataset per user: `aduf-<userId>`).
Tools can declare their own `requiresEnv`, so a skill with several services works with whichever are configured.

`POST /api/skills/cognee-sync` (signed-in) pushes imported memories and monthly aggregates to the user's cognee
dataset. It is a user action, not an agent tool, because it sends business data to a third party. Names, emails
and companies are never sent.

## Dropshipping skill

`engine.ts` is pure and needs no keys: unit economics (supplier cost, shipping, payment fees, expected refunds,
break-even CPA/ROAS), a fee-aware price floor, five pricing strategies, and product scoring (go / test / skip).
Ported in spirit from DropShipping-AI-Agent (MIT). Its mock product data and "RL" placeholder were not ported, and its
price floor (cost x 1.1) was replaced because it ignores fees and refunds.

Rules the code enforces, covered by tests: no recommended price is ever below the break-even floor; a product with no
demand data can never be "go"; rating under 3.8 or a money-losing product is always "skip".

Store writes go through approval (`dropship_create_product`, `dropship_update_price`): creating adds a DRAFT only;
cost facts are saved on the Medusa product metadata (`aduf_*`); a price change is refused below the 10% margin floor, if
the product has no cost on file, or if the currency differs; undo restores the old price or deletes an unpublished draft.
Medusa v2 amounts are in major units. The Medusa client has only been run against a mock; try it on a dev store first.

## Supplier orders (skill-dropship/supplier)

Ledger table `supplier_orders` (migration 022). One live supplier order per store order, enforced by a partial unique
index. Lifecycle (state.ts): to_place -> placed -> shipped -> delivered, with issue / cancelled / refunded; "placed" needs
the supplier's order number, "shipped" needs a tracking number. Late flags: not placed in 1+ days, no tracking after 4+
days, past the expected delivery date, 30+ days in transit, or marked as a problem.

Actions: `dropship_place_supplier_order` (always approval) and `dropship_update_supplier_order` (tracking-only edits run
automatically with 24h undo; delivered / refunded / cancelled need approval). The server reads items and the customer's
address from Medusa itself: the model never sees the address and ADUF never stores it (only the country code).
Refused: unpaid or cancelled store orders, orders whose supplier cost exceeds what the customer paid, duplicates.

Suppliers: `manual` (a to-do for the owner, who reports the supplier order number and tracking) and `cj` (CJ Dropshipping
createOrderV2, created UNPAID with payType 3, so the owner pays inside CJ). CJ order status and tracking polling is not built:
its endpoints weren't verifiable here. Tracking is as reported by the owner. Setting `supplierSku` when creating a product
is what lets CJ orders be built later. Medusa v2 order field names were not run against a live store.

## Ads Operator (skill-ads-operator)

Read-only by design: the Meta connection has only the `ads_read` scope and ADUF's trust layer says it can't change ad
accounts. Tools: `ads_accounts`, `ads_report` (spend, CTR, CPC, frequency, purchases, revenue, ROAS, daily budgets) and
`ads_diagnose`, which judges each campaign against the product's break-even ROAS (scale / keep / fix / pause / wait;
never judges on fewer than 3 sales; budget suggestions capped at 20%). The owner applies budget changes in Meta; the agent
records the decision with the existing `change_ad_budget` action. Enabling writes would need the `ads_management` scope and
a policy decision, so it was left out.

## Playbooks and sub-agents

`playbook_read` loads one of 14 method guides copied unmodified from obra/superpowers and addyosmani/agent-skills (MIT,
see `src/playbooks/content/LICENSES.md`); an ADUF note tells the agent how to apply coding-oriented text to business work.
Regenerate the bundle after editing `content/*.md`: `node tools/gen-playbooks.mjs`.

The agent can call `delegate` with 1-4 helpers that run in parallel. Limits are enforced in `src/agents/orchestrator.ts`:
helpers are read-only (only skill tools, never actions, code, messages or more helpers), 4 model calls each, 55 s wall clock
(`ADUF_SUBAGENT_TIMEOUT_MS`), a timed-out helper stops spending, failures are isolated, tokens are charged to the owner like any
other call. The parent is told to treat helper output as unverified claims.

## Tests

`node tools/run-skill-tests.mjs` runs all suites (no keys or network needed; the database, model and services are stubbed).


## Supplier orders page

`/supplier-orders` (nav: "Suppliers") shows the pipeline (to place, placed, shipped, delivered), the paid store
orders still waiting to be bought, and a detail panel with history and update forms. Buttons on this page call the
same `execPlace` / `execUpdate` code as the agent's approved actions; the owner's click is the approval. The
customer's address is read on the server only when ordering through CJ and is never sent to the browser.

## Connectors page and Composio

`/connectors` lists every app Composio offers (loaded live, cached 30 minutes). One click opens Composio's hosted sign-in;
the owner's ADUF user id is the Composio user id, so people only see and remove their own connections. Apps that need
your own developer credentials are shown as such and can't be connected from here.

The agent gets two read-only tools (`composio_my_apps`, `composio_find_tools`). Running a tool is a proposed action
(`composio_run_tool`), always external risk and always owner-approved; it can't be undone from ADUF.

Set `COMPOSIO_API_KEY` (free plan, no card) and `APP_URL` in Vercel, then redeploy. Built-in connections (Google, Telegram,
Paystack, ...) still live in Settings under "Built-in connections". Set `PAYSTACK_SECRET_KEY` there for ADUF's own billing.

## n8n templates (the 5,000-template repo)

The agent already searches templates and node docs and deploys in safe mode; it just needs the library loaded.
`tools/n8n-ingest/ingest.mjs` now includes `ritik-prog/n8n-automation-templates-5000` (MIT). On a test run it found
6,260 JSON files and kept 6,174 valid, de-duplicated workflows (74 duplicates, 12 invalid). Many are named
"Template 123", so search relies on their description and the integrations ADUF extracts from the nodes.

    git clone --depth 1 https://github.com/ritik-prog/n8n-automation-templates-5000.git repos/n8n-automation-templates-5000
    node tools/n8n-ingest/ingest.mjs repos > templates.jsonl
    # then load templates.jsonl with tools/n8n-ingest/load-to-supabase.mjs (needs SUPABASE_URL and the service key)

## Paystack: going live

Switching `PAYSTACK_SECRET_KEY` from `sk_test_` to `sk_live_` is safe: run migration `023_paystack_plan_mode.sql`, then in
Admin press sync on each paid plan to create live auto-renew codes (until then customers pay once, without auto-renew).
Add your LIVE webhook URL in Paystack: `https://<your-site>/api/billing/paystack-webhook`. Test charges are ignored by a
live server and the reverse. The Admin security checks now show whether Paystack is on a test or live key.

## Monitoring, Azure and browser tests
See `docs/MONITORING.md` (Sentry, Datadog), `docs/AZURE.md` (hosting + Azure OpenAI) and `docs/TESTING.md` (Playwright, BrowserStack, Polypane). Login stays on Supabase Auth.
