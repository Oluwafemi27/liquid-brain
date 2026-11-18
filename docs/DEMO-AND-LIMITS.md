# Demo mode and usage limits

## "Continue as demo"
- Every click creates its **own** private Supabase user (`demo+<random>@aduf.me`, `app_metadata.demo = true`).
  Nothing is shared between visitors, so one demo never sees another's chats, files or settings.
- All demo users are on the **Demo** plan and answer with the default model key of the account set in
  Admin → Plans → Demo mode (default `oluseyioke39@gmail.com`). The key stays on the server.
- Blocked in demo: connectors (incl. Telegram), supplier orders, billing, model-key and n8n management, uploads of documents/attachments, transcription.
- **24-hour clean-up, three layers:** expired demo tokens are rejected; every demo start purges expired demos;
  a 15-minute timer inside the container and the hourly `purge-files` / daily cron workflows call
  `purge_expired_demo_users`, which deletes the auth user (cascading) and workspace tables without a foreign key.
- Abuse controls (admin-editable): demos per address per hour, global daily credit cap, max live sessions (`DEMO_MAX_LIVE`, 300).

## Hit limits
Per plan: `hitsPerHour`, `hitsPerDay` (0 = no cap) in Admin → Plans. Counters live in the shared store (Redis when set).
When a cap is full, chat answers with a structured `limit` and the app shows a banner with the reset time.
Notices appear at 80% and 100% of credits and hit caps, and 2 hours before a demo ends (max 3 at once).
Usage panel (Settings → Plan) shows credits, replies this hour/today, term and sessions.

## Operator checklist
- Keep the key owner's default Gemini key valid.
- Supabase Auth email provider must stay enabled (the demo uses `generateLink`).
- Optional: add Cloudflare Turnstile in front of `/api/demo` if bots appear.
