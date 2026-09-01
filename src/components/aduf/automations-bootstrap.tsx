import { useEffect } from "react";
import type { Automation, ChannelId } from "@/lib/aduf-types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { fetchAutomations } from "@/lib/server-fns";
import { useAduf } from "@/store/aduf-store";

export function AutomationsBootstrap() {
  const { setAutomations, upsertAutomation, removeAutomation } = useAduf();

  useEffect(() => {
    let cancelled = false;
    fetchAutomations()
      .then((automations) => {
        if (!cancelled) setAutomations(automations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setAutomations]);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) return;

    const channel = client
      .channel("automations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "automations" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: ChannelId }).id;
          if (id) removeAutomation(id);
          return;
        }
        const row = payload.new as Automation;
        upsertAutomation(row);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [upsertAutomation, removeAutomation]);

  return null;
}
