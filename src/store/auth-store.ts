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
  signOut: () => Promise<void>;
  setSurveyStatus: (status: "pending" | "done") => void;
  /** Returns true if the user is signed in. If not, opens the sign-in modal
   *  and returns false — call this as a guard before any action that talks
   *  to the AI. */
  requireAuth: () => boolean;
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
      set({ status: "signed-out" });
      return;
    }

    client.auth.getSession().then(({ data }) => {
      const session = data.session;
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
