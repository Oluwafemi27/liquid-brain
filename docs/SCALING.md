# Keeping ADUF fast when many people use it

This is the plan for many users at once without the app slowing down or falling over. Each item says what is already in the code and what to switch on as traffic grows. Nothing here has been load-tested yet; see "Measuring" for how to get real numbers.

## Where time goes in one reply
1. Verify the sign-in token (cached 45 s, shared across servers through Redis).
2. Fetch survey, connected apps, goals/schedule and the facts sheet **in parallel**, each with a timeout (2.5-3 s) so a slow source is left out instead of stalling the reply.
3. One model call (Anthropic prompt caching on the large system prompt), occasionally more when the agent runs a tool.
4. Save the messages and bill the reply (one charge per reply, in credits).

The server adds a `Server-Timing` header and a `[perf]` log line per reply (stages: `context`, `model`, `total`), so the slowest stage is visible in logs and the browser network tab.

## What protects the app under load
| Risk | Already in place | Add when needed |
|---|---|---|
| One user floods the model | Per-user credits (a hard cap); per-request check before the model call; per-user request rate limit (`rate-limit.ts`, shared through Redis when configured) | Tighten the limits in `LIMITS` once real usage is known |
| Many replies at once | Stateless server; every cache falls back to memory | Run 2+ replicas (Azure Container Apps scale rule: HTTP concurrency ~30 per replica, min 1, max 10) |
| Slow database | Indexes on the user/session columns (migration 025) | Use the Supabase pooler URL (port 6543) for server code; add a read replica for admin analytics |
| Provider outage or rate limit | Harness retries (3 attempts) and tolerant JSON parsing | A second provider key as fallback; a global concurrency gate per provider (semaphore, e.g. 20) |
| Big uploads | Parallel upload and extraction in the browser; files stored once, read by id | Direct-to-storage uploads with signed URLs so files never pass through the app server |
| Long jobs (video, big files) | Run inside the request | Move to a queue (Upstash QStash) and notify when ready |
| Static files and the landing page | Served by Vercel's CDN | Nothing |
| Admin dashboards | Cached | Materialised views refreshed every few minutes |

## Shared state must live outside the server
Redis (Upstash) holds the shared caches and rate limits so any replica can answer any request. Watch the Upstash command quota: cache reads count as commands, so keep entries coarse (one key per user per minute, not per field).

## Measuring (do this before and after each change)
- Read the `Server-Timing` header on `/api/chat` and compare `context` against `model`.
- Replay a realistic mix with k6 or autocannon against a staging copy: 50 users, one message every 20 s, 10 minutes. Targets to aim for: p95 reply start under 8 s for a normal question, error rate under 1%, no replica over 70% CPU.
- Raise the replica count or the provider concurrency gate only when a measurement shows that stage is the bottleneck.

## Order of work
1. Pooler URL for the database. 2. Two replicas with an HTTP scale rule. 3. Direct-to-storage uploads. 4. Queue for long jobs. 5. Streaming the reply so text appears while the model is still writing.
