# Security

## Do these first (outside the code)
1. **Run `supabase/migrations/026_security_hardening.sql`** in the Supabase SQL editor, then deploy the new code. Order matters little, but do both. It:
   - closes the "anyone can read" policies, so the public (anon) key can no longer read chat, goals, automations or insights;
   - turns on row-level security for every table (default deny);
   - **blocks the public key from calling the secret-handling functions**. `get_decrypted_n8n_connection` and its siblings were callable by anyone holding the anon key and returned the decrypted n8n API key;
   - makes the `agent-files` bucket private;
   - adds `user_id` to documents.
2. **Existing documents** have no owner and will not appear until you assign them. For a single-owner install, find your user id in Supabase, Authentication, Users, then run:
   `update public.agent_documents set user_id = '<your user id>' where user_id is null;`
3. **Rotate anything that may have been exposed.** If your Supabase anon key was ever public (it is, in the browser, by design) and the old policies were live, treat the **n8n API key** and any pasted connector secrets as exposed. Reconnect n8n with a new key. Also rotate the Datadog API key you showed in a screenshot earlier.
4. In Supabase, Authentication, Providers, Email, keep **Confirm email ON**. The app now ignores admin status for unconfirmed emails, but confirmation is still the right default.
5. Set `DOCUMENT_LINK_SECRET` (random string) in Azure/Vercel. Use secrets, never plain environment text, for keys.
6. Keep `CRON_SECRET` set. Without it the cron route stays closed.

## What the code now enforces
- **Documents are private per person.** Before, every document lived in one shared pool and the download link needed no sign-in. Now each file belongs to a user, and opening one needs a signed link (`/api/documents/link`) valid for ten minutes, for one file and one person.
- **Admin needs a confirmed email.** Admin was granted by email address alone, so someone could sign up with the admin's address, skip confirmation and be treated as the admin.
- **No server-side request forgery.** The n8n address a person types is checked: http(s) only, no passwords in the URL, no localhost or private/internal addresses (including the cloud metadata address), DNS answers checked, redirects refused.
- **Browser protections on every response** (`src/lib/security-headers.ts`): Content-Security-Policy (no scripts from other sites, no framing, no plugins, restricted network targets), HSTS, nosniff, frame denial, referrer and permissions policies. API answers are never cached. If a new browser-side service breaks, add its host to `CSP_CONNECT_EXTRA`, or set `CSP_MODE=report-only` while you investigate.
- **Request size limits** (`request-limits.ts`): 2 MB by default, larger only for upload, audio and video routes. Chat input arrays and text are capped.
- **Secrets are compared in constant time** (cron, health).
- Already in place and kept: Paystack and Telegram signature checks, CSRF check on server functions, per-person rate limits, signed upload URLs, no raw HTML rendering of chat.

## Uploaded files: scanning and deletion
- **Every upload is scanned before anything reads, stores or shows it** (`src/lib/server/file-scan.ts`). Built-in checks always run: disguised programs, macros, PDF scripts and launch actions, hidden attachments, zip bombs, password-locked or path-trick archives, scripts in HTML/SVG, the EICAR test file. Optional engines add to that: **ClamAV** (`CLAMAV_HOST`, a real antivirus with daily signature updates) and **VirusTotal** (`VIRUSTOTAL_API_KEY`, sends only the SHA-256 fingerprint, never the file).
- **Fails safe:** if ClamAV is configured but unreachable the file is refused (`SCAN_FAIL_OPEN=true` to allow with a warning). Blocked files are deleted from storage immediately.
- Files are not opened for viewing until scanned, and never executed.
- **Originals are deleted automatically.** 23 hours by default (`ATTACHMENT_TTL_HOURS`, never more than 24). Audio and files of 8 MB or more (`LARGE_FILE_BYTES`) are deleted the moment they've been read; only the text taken from them is kept. Videos are never stored at all. Abandoned uploads are deleted after an hour.
- Run `supabase/migrations/027_file_retention.sql`. Set `CRON_SECRET` and the GitHub secrets `APP_URL` and `CRON_SECRET` so the hourly purge works.
- **Honest limits:** the built-in checks catch common tricks, not every threat, and a PDF can hide scripts inside compressed streams. For real antivirus coverage turn on ClamAV. Scanning cannot see into password-protected archives, so those are refused.

### Running ClamAV on Azure (recommended)
```
az containerapp create -n clamav -g Aduf --environment <your-container-apps-environment> \
  --image clamav/clamav:stable --ingress internal --transport tcp --target-port 3310 --exposed-port 3310 \
  --min-replicas 1 --max-replicas 1 --cpu 1.0 --memory 3.0Gi
```
Then set `CLAMAV_HOST=clamav` and `CLAMAV_PORT=3310` on the `aduf` app. It takes a few minutes to download signatures on first start. ClamAV needs about 2 to 3 GB of memory. It cannot be reached from Vercel, so if the app runs there, use VirusTotal or host ClamAV somewhere reachable.

## Known and accepted
- **zod** has a published memory-exhaustion advisory (fixed only in zod 4, a major upgrade). Request-size limits and array caps reduce the exposure; plan the zod 4 upgrade.
- `exceljs` flags `uuid` (a function we don't call in the affected way) and `e2b` flags `brace-expansion` (in the sandbox SDK, not fed user input). Re-check with `npm audit --omit=dev` periodically.
- The CSP allows inline scripts because the app's page bootstrap uses them. Moving to nonces is a future step.
- Uploaded files are checked by type and size and read as data, never executed, but they are not scanned for malware.

## Not covered (be aware)
No tool makes an app unhackable. This pass fixed what an audit of the code found. Still worth doing: a paid penetration test before large launches, Supabase "Security Advisor" (Database, Advisors) after running the migration, Azure Defender, and a regular dependency check.
