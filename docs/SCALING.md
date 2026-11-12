# Running ADUF for 200 to 500 people at once

How the app maps to the usual architecture (frontend, load balancer, several servers, connection pooler, database):

| Layer | In ADUF | What keeps it healthy |
|---|---|---|
| Frontend | The browser app | Polling is spread out (see below), hidden tabs make no requests |
| Load balancer | Azure Container Apps ingress (or Vercel) | Spreads requests across replicas |
| Backend servers | The `aduf` container app: several identical, stateless replicas | Autoscale on concurrent requests |
| Connection pooler | Supabase (PostgREST over HTTPS, pooled by Supabase) | The server never opens its own Postgres connections, so there is no pool to exhaust |
| Database | Supabase Postgres | Indexes on per-user lookups, cached heavy reads |

## What the code does now
- **Per-person rate limits** on the costly routes (`src/lib/server/rate-limit.ts`): chat 20 a minute and 3 at a time, uploads 40, file reading 30, transcription 60, video 6. Over the limit returns HTTP 429 with `Retry-After`. Tune them in `LIMITS`.
- **Token check cache** (`verifyAccessToken`): a valid session is checked against Supabase Auth about once every 45 seconds instead of on every request, and simultaneous checks are shared.
- **AI provider calls retry** on 429/500/502/503/504 with a short randomised wait (honours `Retry-After`) and time out after 90 seconds (`resilient-fetch.ts`).
- **Business data cache**: building the Analytics panels scans up to 50,000 rows. The result is kept for 20 seconds per person and cleared the moment they import or delete data.
- **Gentler polling** (`use-live-refresh.ts`): intervals are 45 to 120 seconds with plus or minus 20% jitter, a random first-load delay, duplicate focus/visibility refreshes dropped, and nothing sent while the tab is hidden. Realtime still updates screens instantly.
- **Indexes**: run `supabase/migrations/025_scale_indexes.sql` (safe to repeat; it only creates an index when its columns exist).

## Redis (optional, recommended once you run 2 or more servers)
Set `REDIS_URL` (for example `rediss://:KEY@your-host:6380`) as a secret on every server. It shares rate-limit counters, sign-in check results and the Analytics cache between servers. Without it each server uses its own memory, and everything still works. If Redis goes down the app falls back to memory and retries. Check `/api/health`: `"cache": "redis"` or `"memory"`.
Where to get one: **Azure Managed Redis** (Microsoft's current service; the older Azure Cache for Redis Basic/Standard/Premium tiers are being retired on 30 September 2028, so don't start on those) or **Upstash** (serverless, has a free tier). Check current pricing before choosing.
Details of what is shared are in `docs/ARCHITECTURE.md`.

## What you must set (outside the code)
1. **Azure replicas**, so one container isn't the only server:
   ```
   az containerapp update -n aduf -g Aduf --min-replicas 2 --max-replicas 10 \
     --scale-rule-name http-load --scale-rule-type http --scale-rule-http-concurrency 50 \
     --cpu 1.0 --memory 2.0Gi
   ```
   Two replicas always on means a restart or deploy never takes the app down. Check the CPU/memory values are allowed in your environment.
2. **Supabase plan.** Realtime allows 200 concurrent connections on Free and 500 on Pro ([Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)). Each open tab is one connection. Past the limit, live updates stop for the extra people, and the polling above keeps their screens current. For 500 people use Pro or higher, and a compute size above the smallest in Project Settings, Compute and Disk.
3. **AI provider limits.** Your Groq/OpenAI/Azure key has its own requests-per-minute cap, shared by everyone using that key. If many people chat at once, raise the cap with the provider or let people add their own model key (Settings).
4. **Vercel** (if you also deploy there): keep `maxDuration` on the chat route high enough for slow models.

## Test it yourself
```
node tools/load-test.mjs https://YOUR-APP-URL --users 500 --seconds 60 --paths /,/api/health
```
It prints requests per second, failure rate and p50/p95/p99 latency, and says PASS when failures are under 1% and p95 is under 2 seconds. Run it against a staging copy first. Do not point it at routes that spend AI money.
To test signed-in pages, use a test account and pass its access token with `--token`.

## Honest limits
- The rate limiter and caches live in each server's memory. With several replicas the real limit is roughly the limit times the replicas. That is enough to stop abuse; money limits are enforced by the token wallet in `billing.ts`.
- Local result (dev server, same machine as the load generator, so a floor and not your real capacity): 500 simulated users on `/api/health` gave about 419 requests a second with 0 failures and p95 6 ms; 200 users on the SSR home page gave 82 requests a second, 0 failures, p95 75 ms. Chat, uploads and database-backed pages were not load-tested because they need real keys.
