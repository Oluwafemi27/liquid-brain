import { create } from "zustand";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

interface AuthState {
  /** "loading" until the initial session check resolves, so the UI never
   *  flashes the sign-in modal for a user who's actually already signed in. */
  status: "loading" | "signed-out" | "signed-in";
  user: AuthUser | null;
  accessToken: string | null;
  /** Whether this user has completed the post-sign-in survey — starts
   *  "unknown" until checked, distinct from `false`, so the survey modal
   *  doesn't flash open while that check is in flight. */
  surveyStatus: "unknown" | "pending" | "done";
  /** Controls the Google sign-in overlay. Anything that needs a signed-in
   *  user (like sending a Brain Chat message) calls requireAuth() instead of
   *  reading `status` directly. */
  signInModalOpen: boolean;
  initialized: boolean;
  init: () => void;
  openSignIn: () => void;
  closeSignIn: () => void;
  signInWithGoogle: () => Promise<void>;
  /** Emails a one-time sign-in link (no password, no Google account needed). */
  signInWithEmail: (email: string) => Promise<{ ok: boolean; message: string }>;
  signOut: () => Promise<void>;
  setSurveyStatus: (status: "pending" | "done") => void;
  /** Returns true if the user is signed in. If not, opens the sign-in modal
   *  and returns false — call this as a guard before any action that talks
   *  to the AI. */
  requireAuth: () => boolean;
}

/** The root <head> sets data-session="maybe" when a saved login exists, hiding the landing page
 *  so returning users don't see it flash before their app loads. Remove it once we know. */
function clearSessionHint() {
  if (typeof document !== "undefined") document.documentElement.removeAttribute("data-session");
}

function toAuthUser(supabaseUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const meta = supabaseUser.user_metadata ?? {};
  const name =
    (meta["full_name"] as string | undefined) ??
    (meta["name"] as string | undefined) ??
    (supabaseUser.email ? supabaseUser.email.split("@")[0] : "") ??
    "";
  const avatarUrl =
    (meta["avatar_url"] as string | undefined) ?? (meta["picture"] as string | undefined) ?? null;
  return { id: supabaseUser.id, email: supabaseUser.email ?? null, name, avatarUrl };
}

export const useAuth = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  accessToken: null,
  surveyStatus: "unknown",
  signInModalOpen: false,
  initialized: false,

  init: () => {
    if (get().initialized) return;
    set({ initialized: true });
    const client = getSupabaseBrowser();
    if (!client) {
      clearSessionHint();
      set({ status: "signed-out" });
      return;
    }

    client.auth.getSession().then(({ data }) => {
      const session = data.session;
      clearSessionHint();
      set(
        session
          ? {
              status: "signed-in",
              user: toAuthUser(session.user),
              accessToken: session.access_token,
              signInModalOpen: false,
            }
          : { status: "signed-out" },
      );
    });

    client.auth.onAuthStateChange((_event, session) => {
      set(
        session
          ? {
              status: "signed-in",
              user: toAuthUser(session.user),
              accessToken: session.access_token,
              signInModalOpen: false,
            }
          : {
              status: "signed-out",
              user: null,
              accessToken: null,
              surveyStatus: "unknown",
            },
      );
    });
  },

  openSignIn: () => set({ signInModalOpen: true }),
  closeSignIn: () => set({ signInModalOpen: false }),

  signInWithGoogle: async () => {
    const client = getSupabaseBrowser();
    if (!client) {
      console.error("[auth] Supabase isn't configured — can't sign in.");
      return;
    }
    await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  },

  signInWithEmail: async (email) => {
    const client = getSupabaseBrowser();
    if (!client) return { ok: false, message: "Sign-in isn't available right now." };
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
      return { ok: false, message: "That doesn't look like an email address." };
    const { error } = await client.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      return {
        ok: false,
        message: /rate|seconds|too many/i.test(error.message)
          ? "Too many requests — wait a minute and try again."
          : "Couldn't send the link. Check the address and try again.",
      };
    }
    return { ok: true, message: `Check ${clean} — we've sent you a sign-in link.` };
  },

  signOut: async () => {
    const client = getSupabaseBrowser();
    if (!client) return;
    await client.auth.signOut();
    set({ status: "signed-out", user: null, accessToken: null, surveyStatus: "unknown" });
  },

  setSurveyStatus: (status) => set({ surveyStatus: status }),

  requireAuth: () => {
    const { status } = get();
    if (status === "signed-in") return true;
    set({ signInModalOpen: true });
    return false;
  },
}));
