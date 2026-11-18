import { Check } from "lucide-react";
import { useState } from "react";
import type { ChatQuestion, ChatQuestionOption } from "@/lib/aduf-types";
import { cn } from "@/lib/utils";

export function AgentQuestion({
  question,
  answeredValues,
  disabled = false,
  onAnswer,
}: {
  question: ChatQuestion;
  /** Set once the user has already answered — renders as a locked summary. */
  answeredValues?: string[] | undefined;
  disabled?: boolean;
  onAnswer: (values: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const answered = answeredValues !== undefined;

  function toggle(option: ChatQuestionOption) {
    if (disabled || answered) return;
    if (!question.multi) {
      onAnswer([option.value]);
      return;
    }
    setSelected((prev) =>
      prev.includes(option.value)
        ? prev.filter((v) => v !== option.value)
        : [...prev, option.value],
    );
  }

  return (
    <div className="mt-2 max-w-[85%] space-y-2">
      <p className="text-xs text-muted-foreground">{question.prompt}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => {
          const isPicked = answered
            ? answeredValues!.includes(option.value)
            : selected.includes(option.value);
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled || answered}
              onClick={() => toggle(option)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                isPicked
                  ? "border-transparent text-background"
                  : "border-border text-muted-foreground hover:bg-white/8 hover:text-foreground",
                (disabled || answered) && !isPicked && "opacity-50",
              )}
              style={isPicked ? { background: "var(--gradient-accent)" } : undefined}
            >
              {isPicked ? <Check className="h-3 w-3" /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
      {question.multi && !answered ? (
        <button
          type="button"
          disabled={disabled || selected.length === 0}
          onClick={() => onAnswer(selected)}
          className="rounded-full px-3 py-1.5 text-[11px] font-medium text-background disabled:opacity-40"
          style={{ background: "var(--gradient-accent)" }}
        >
          Submit
        </button>
      ) : null}
    </div>
  );
}
