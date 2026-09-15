import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Lightbulb,
  ListChecks,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AdufAnalysis, AdufArea, AdufFinding, AdufSeverity } from "@/lib/aduf-types";
import { cn } from "@/lib/utils";

const AREA_LABELS: Record<AdufArea, string> = {
  visibility: "Visibility",
  credibility: "Credibility",
  customer_journey: "Customer Journey",
  conversion: "Conversion",
  sales: "Sales",
  retention: "Retention",
  operations: "Operations",
  local_presence: "Local Presence",
  search_ai_visibility: "Search / AI Visibility",
};

const SEVERITY_STYLES: Record<AdufSeverity, string> = {
  low: "bg-cyan/15 text-cyan",
  medium: "bg-amber-400/15 text-amber-300",
  high: "bg-orange-400/15 text-orange-300",
  critical: "bg-red-500/15 text-red-400",
};

function SeverityBadge({ severity }: { severity: AdufSeverity }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        SEVERITY_STYLES[severity],
      )}
    >
      {severity}
    </span>
  );
}

function FindingList({
  icon: Icon,
  label,
  items,
}: {
  icon: typeof Lightbulb;
  label: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <div className="mt-2">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <ul className="mt-1 space-y-0.5 pl-4 text-xs leading-relaxed text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="list-disc marker:text-muted-foreground/50">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FindingCard({ finding }: { finding: AdufFinding }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/60 bg-white/[0.03] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.15em] text-cyan/80">
            {AREA_LABELS[finding.area]}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug">{finding.problem}</p>
        </div>
        <SeverityBadge severity={finding.severity} />
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-cyan" />
        <span>
          <span className="font-medium text-foreground/80">Estimated impact: </span>
          {finding.estimatedImpact}
        </span>
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
            finding.automationPossible
              ? "bg-violet/15 text-violet"
              : "bg-white/8 text-muted-foreground",
          )}
        >
          <Bot className="h-3 w-3" />
          {finding.automationPossible ? "Automatable" : "Not automatable"}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
            finding.expertRequired
              ? "bg-amber-400/15 text-amber-300"
              : "bg-white/8 text-muted-foreground",
          )}
        >
          <UserCog className="h-3 w-3" />
          {finding.expertRequired ? finding.expertType || "Expert needed" : "No expert needed"}
        </span>
      </div>

      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {open ? "Hide details" : "Root cause, opportunities & actions"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <FindingList icon={AlertTriangle} label="Root cause(s)" items={finding.rootCauses} />
        <FindingList icon={Lightbulb} label="Opportunities" items={finding.opportunities} />
        <FindingList
          icon={ListChecks}
          label="Recommended actions"
          items={finding.recommendedActions}
        />
        {finding.automationNotes ? (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Automation notes: </span>
            {finding.automationNotes}
          </p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Renders a full ADUF diagnosis: a short summary plus one card per finding,
 *  each covering problem / severity / root cause / opportunity /
 *  recommended action / estimated impact / automation / expert need. */
export function AdufAnalysisCard({ analysis }: { analysis: AdufAnalysis }) {
  return (
    <div className="mt-2 max-w-[95%] space-y-2.5 rounded-2xl border border-border/60 bg-secondary/40 p-3.5">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ripple absolute inset-0 rounded-full bg-cyan" />
          <span className="relative h-2 w-2 rounded-full bg-cyan" />
        </span>
        <p className="text-xs font-semibold">ADUF Diagnostic</p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{analysis.summary}</p>
      <div className="space-y-2">
        {analysis.findings.map((finding, i) => (
          <FindingCard key={i} finding={finding} />
        ))}
      </div>
    </div>
  );
}
