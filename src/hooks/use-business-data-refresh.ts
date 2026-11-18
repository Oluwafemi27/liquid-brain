import { useCallback } from "react";
import { fetchBusinessDataFn } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

/** Returns a function that reloads the imported-data panels (sales, leads,
 *  customers, deals, funnel) from the server. The import panel calls it right
 *  after saving; BusinessDataBootstrap also polls it as a safety net. */
export function useBusinessDataRefresh() {
  const setBusinessData = useAduf((s) => s.setBusinessData);
  const accessToken = useAuth((s) => s.accessToken);
  return useCallback(async () => {
    try {
      const data = await fetchBusinessDataFn({ data: { accessToken } });
      if (data) setBusinessData(data);
    } catch (err) {
      console.error("[business-data] refresh failed", err);
    }
  }, [accessToken, setBusinessData]);
}
