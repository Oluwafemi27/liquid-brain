import "@tanstack/react-start/server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// This file lives under lib/server/ so TanStack Start's importProtection
// (see vite.config.ts) refuses to bundle it into client code — the service
// role key must never reach the browser.

let cached: SupabaseClient | null = null;
let warned = false;

/** Returns a Supabase admin (service-role) client, or null if the project
 *  isn't configured yet. Every caller must handle the null case — the app
 *  runs fine without a backend, it just skips persistence. */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    if (!warned) {
      console.warn(
        "[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — " +
          "chat history, connector tokens and agent-run logs won't be persisted.",
      );
      warned = true;
    }
    return null;
  }

  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** Single-tenant placeholder until real auth/accounts exist — every row is
 *  scoped to this workspace id so multi-tenant support is a schema-compatible
 *  follow-up (swap this for the authenticated user's workspace id). */
export const DEFAULT_WORKSPACE_ID = "default";
