import { Check, Sparkles, Target, X, Zap } from "lucide-react";
import type { ProposedAction, ProposedActionStatus } from "@/lib/aduf-types";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  crm: "CRM",
  payments: "Payments",
  ads: "Ads",
  email: "Email",
};

function summarize(action: ProposedAction): { icon: typeof Target; title: string } {
  if (action.type === "create_goal") {
    const amount = action.currency
      ? `${action.currency}${action.target.toLocaleString()}`
      : action.target.toLocaleString();
    return { icon: Target, title: `New goal: "${action.title}" — target ${amount}` };
  }
  return {
    icon: Zap,
    title: `${action.enabled ? "Turn on" : "Turn off"} ${CHANNEL_LABEL[action.channelId] ?? action.channelId} automation`,
  };
}

/** Approve/Dismiss card rendered under a chat reply that carries a
 *  proposedAction. Nothing happens until Approve is tapped — see
 *  useAduf().approveProposedAction, which routes the change through the
 *  same store actions the Goals page / Automation Grid use directly, so it
 *  shows up there exactly like a hand-made change would. */
export function AgentProposedAction({
  action,
  status,
  onApprove,
  onDismiss,
}: {
  action: ProposedAction;
  status: ProposedActionStatus | undefined;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const { icon: Icon, title } = summarize(action);
  const resolved = status === "approved" || status === "dismissed";

  return (
    <div className="mt-2 max-w-[85%] rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan/15 text-cyan">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan">
            <Sparkles className="h-3 w-3" /> Proposed action
          </p>
          <p className="mt-1 text-sm font-medium leading-snug">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{action.reasoning}</p>
        </div>
      </div>

      {resolved ? (
        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 text-xs font-medium",
            status === "approved" ? "text-cyan" : "text-muted-foreground",
          )}
        >
          {status === "approved" ? (
            <>
              <Check className="h-3.5 w-3.5" /> Applied
            </>
          ) : (
            <>
              <X className="h-3.5 w-3.5" /> Dismissed
            </>
          )}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-background"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground hover:bg-white/8 hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
