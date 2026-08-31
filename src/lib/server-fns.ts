import { createServerFn } from "@tanstack/react-start";
import { getConnectorStatuses } from "@/lib/server/connectors";

export const fetchConnectorStatuses = createServerFn({ method: "GET" }).handler(async () => {
  return getConnectorStatuses();
});
