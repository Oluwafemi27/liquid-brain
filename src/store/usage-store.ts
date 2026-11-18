import { create } from "zustand";
import { fetchUsageFn } from "@/lib/server-fns";
import type { UsageSnapshot } from "@/lib/billing-types";
import { useAuth } from "@/store/auth-store";

interface UsageState {
  usage: UsageSnapshot | null;
  /** Notice ids the person has closed this visit, so a refresh doesn't bring them back. */
  dismissed: string[];
  refresh: () => Promise<void>;
  dismiss: (id: string) => void;
  reset: () => void;
}

let inflight: Promise<void> | null = null;

export const useUsage = create<UsageState>((set, get) => ({
  usage: null,
  dismissed: [],
  refresh: () => {
    // Several parts of the app ask at once (chat finished, timer, page focus): make it one request.
    if (inflight) return inflight;
    const { accessToken, setDemoExpiresAt } = useAuth.getState();
    if (!accessToken) return Promise.resolve();
    inflight = fetchUsageFn({ data: { accessToken } })
      .then((res) => {
        if (!res) return;
        set({ usage: res.usage });
        if (res.demo) setDemoExpiresAt(res.demo.expiresAt);
      })
      .catch(() => undefined)
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  dismiss: (id) => set({ dismissed: [...get().dismissed, id] }),
  reset: () => set({ usage: null, dismissed: [] }),
}));
