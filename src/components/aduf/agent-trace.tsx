import { AlertCircle, ChevronDown, Circle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AgentTraceStep } from "@/lib/aduf-types";
import { cn } from "@/lib/utils";

function StepIcon({ status }: { status: AgentTraceStep["status"] }) {
  if (status === "running") return <Loader2 className="h-3 w-3 animate-spin text-cyan" />;
  if (status === "error") return <AlertCircle className="h-3 w-3 text-red-400" />;
  return <Circle className="h-3 w-3 fill-current text-muted-foreground/60" />;
}

/** Tucks the agent's step-by-step working behind a small toggle so it never
 *  crowds the chat by default, but is one tap away when the user wants to
 *  see what ADUF actually did to arrive at a reply. */
export function AgentTracePanel({ steps }: { steps: AgentTraceStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;

  const isWorking = steps.some((s) => s.status === "running");
  const errorCount = steps.filter((s) => s.status === "error").length;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-1.5 max-w-[85%] rounded-xl border border-border/60 bg-white/[0.03]"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[10px] text-muted-foreground hover:text-foreground"
        >
          {isWorking ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan" />
          ) : (
            <Circle className="h-3 w-3 shrink-0 fill-current text-muted-foreground/50" />
          )}
          <span className="truncate">
            {isWorking
              ? "ADUF is working…"
              : `Agent working (${steps.length} step${steps.length === 1 ? "" : "s"})`}
            {errorCount > 0 ? ` — self-corrected ${errorCount}×` : ""}
          </span>
          <ChevronDown
            className={cn("ml-auto h-3 w-3 shrink-0 transition-transform", open && "rotate-180")}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 border-t border-border/60 px-2.5 py-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-1.5 text-[10px]">
            <span className="mt-0.5 shrink-0">
              <StepIcon status={step.status} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-muted-foreground">{step.label}</p>
              {step.detail ? (
                <p className="mt-0.5 break-words text-muted-foreground/70">{step.detail}</p>
              ) : null}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
