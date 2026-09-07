import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client-side Supabase client used ONLY for Google sign-in and reading the
// current session. Uses the public anon key (safe to ship to the browser) —
// never the service-role key from src/lib/server/supabase.ts.
//
// Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env (Vite only exposes
// VITE_-prefixed vars to client code). In the Supabase dashboard, enable the
// Google provider under Authentication > Providers and add this app's
// origin(s) to Authentication > URL Configuration > Redirect URLs.

let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
  if (!url || !anonKey) {
    console.warn(
      "[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — Google sign-in is disabled.",
    );
    return null;
  }

  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cached;
}
