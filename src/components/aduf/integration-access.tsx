import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { HealthBadge } from "@/components/aduf/health-badge";
import type { ConnectionHealth } from "@/lib/aduf-types";
import { INTEGRATION_ACCESS } from "@/lib/permissions-catalog";
import { ageLabel } from "@/lib/sources";

/** Under each integration: is it working, and exactly what can ADUF read and change through it. */
export function IntegrationAccess({
  id,
  health,
  connected,
}: {
  id: string;
  health: ConnectionHealth | undefined;
  connected: boolean;
}) {
  const access = INTEGRATION_ACCESS[id];
  return (
    <div className="mt-3 border-t border-white/10 pt-3 text-left">
      {connected ? (
        <div className="mb-2 text-xs">
          <div className="flex items-center gap-2">
            {health ? (
              <HealthBadge state={health.state} />
            ) : (
              <span className="text-[11px] text-muted-foreground">Checking…</span>
            )}
            {health ? (
              <span className="text-[11px] text-muted-foreground">
                {health.method === "live-check" ? "checked" : "saved login looked at"}{" "}
                {ageLabel(health.checkedAt)}
              </span>
            ) : null}
          </div>
          {health && health.state !== "live" ? (
            <p className="mt-1.5 text-amber-200">
              {health.message}{" "}
              {health.actionHref ? (
                <Link to={health.actionHref as "/"} className="underline underline-offset-4">
                  {health.actionLabel}
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}
      {access ? (
        <details className="group text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground">
            What ADUF can access{" "}
            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-2">
            <div>
              <p className="font-medium">Can read</p>
              <ul className="text-muted-foreground">
                {access.reads.map((r) => (
                  <li key={r}>· {r}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Can change</p>
              {access.changes.length ? (
                <ul className="text-muted-foreground">
                  {access.changes.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nothing</p>
              )}
            </div>
            {access.never.length ? (
              <div>
                <p className="font-medium">Never</p>
                <ul className="text-muted-foreground">
                  {access.never.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-muted-foreground">Cut it off at the source: {access.revoke}</p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
