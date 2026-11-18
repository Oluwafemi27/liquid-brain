# How ADUF works, and how it handles many users

## The picture

```
 People (phones, browsers)
        |  HTTPS
        v
 +--------------------------+      two front doors run the SAME code:
 |  FRONT DOOR / BALANCER   |      - Vercel (liquid-brain.vercel.app): serverless, no fixed servers
 |  Vercel  or  Azure       |      - Azure Container Apps (app "aduf"): containers
 |  Container Apps ingress  |
 +------------+-------------+
              |  spreads requests across copies
     +--------+--------+--------+
     v        v        v        v
 [ app copy ][ app copy ][ app copy ]...   BACKEND: identical, stateless Node servers
     |  \        |        /               (pages + /api routes + server functions)
     |   \       |       /
     |    +------+------+---------------> REDIS (optional): shared limits + caches
     |                                    AI providers (Groq/OpenAI/Azure...), Composio, Paystack
     |  HTTPS (PostgREST) / websockets
     v
 +-------------------------------+
 | SUPABASE                      |   Postgres database (one primary) behind a pooler
 |  Postgres + Auth + Storage    |   Auth = sign-in, Storage = temporary uploaded files,
 |  + Realtime                   |   Realtime = live screen updates
 +-------------------------------+
 [ ClamAV (optional) ]  virus engine the app streams uploads to
```

## How many servers do you have?
- **Vercel** (liquid-brain.vercel.app): no fixed number. Vercel starts as many short-lived function copies as traffic needs and stops them when idle.
- **Azure** (container app `aduf` in resource group `Aduf`): the number of containers is whatever its scale setting says. A new container app defaults to a single replica unless you set a range. Check yours:
  `az containerapp show -n aduf -g Aduf --query "properties.template.scale"`
  Set 2 to 10 with the command in `docs/SCALING.md`.
- **Database**: one Supabase Postgres primary. Supabase adds the other parts (Auth, Storage, Realtime) as separate services.
- **Optional extras**: Redis (1 small server), ClamAV (1 small container).

## What each layer does for a crowd

**Frontend (the browser).** It does the work that costs you nothing: rendering, voice dictation, cutting videos into frames and audio, reading spreadsheets. It refreshes data on a timer with random jitter (45 to 120 seconds), pauses when the tab is hidden, and receives instant updates from Realtime, so 500 open tabs don't hit the server in a wave.

**Backend (the app copies).** Every copy is identical and keeps nothing important in memory, so the balancer can send any request to any copy and you add capacity by adding copies. Each request is protected: per-person rate limits (chat 20 a minute and 3 at a time), a cached sign-in check, retries for busy AI providers, caches for the heavy Analytics query, request size caps.

**Database (Supabase).** The app talks to it over HTTPS through PostgREST, and Supabase pools the real database connections, so adding app copies never exhausts database connections. Frequently used lookups have indexes. Every table denies direct access by default, and each person can read only their own rows.

**Redis (optional).** With one app copy you don't need it. With several, each copy has its own memory, so without Redis a person could get N times the rate limit, and a cached value changed on one copy stays stale on the others. Redis gives all copies one shared memory for: rate-limit counters, sign-in check results (stored under a hash, never the raw token), and the Analytics cache with instant invalidation. If Redis is down the app keeps working from memory and retries Redis a few seconds later.

## What happens to an uploaded file
1. The browser sends the file straight to private storage (not through the web server, so big files don't clog it). **Videos are never uploaded:** the browser cuts them into a few frames plus audio, and only those small pieces are sent.
2. The server downloads it and **scans it first**: built-in checks (programs in disguise, macros, PDF scripts, zip bombs, password-locked or path-trick archives, scripts in web files), then ClamAV if configured, then a VirusTotal fingerprint lookup if configured. A blocked file is deleted at once and nothing is read from it. If ClamAV is configured but unreachable, the file is refused rather than let through unscanned.
3. It is read (text extracted, picture described, speech transcribed) and the result is saved with the conversation. This is what the AI uses.
4. **Audio and any file of 8 MB or more are deleted immediately** after reading. Videos were never stored. Smaller documents and images keep their original for at most **23 hours** (so a slightly late cleanup still stays under 24) so you can open them again, then they are deleted. Failed or abandoned uploads are deleted within the hour.
5. Cleanup runs three ways, so it can't be missed: every 15 minutes inside the Azure container, hourly from a GitHub Actions schedule (`.github/workflows/purge-files.yml`), and after uploads. Vercel's daily cron also runs it.

What is kept: the text the AI learned from the file, with the conversation. If you want that text to expire too, set `ATTACHMENT_TEXT_RETENTION_HOURS`.

## Limits to know
- Capacity ends where the smallest part ends: the AI provider's per-minute cap, Supabase's compute size and Realtime connection limit (200 on Free, 500 on Pro), and your replica maximum.
- Redis only helps when you run more than one app copy, or want limits that survive restarts.
