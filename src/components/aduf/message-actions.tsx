import { Check, Copy, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useAduf } from "@/store/aduf-store";
import type { ChatMessage } from "@/lib/aduf-types";
import { cn } from "@/lib/utils";

const btn =
  "grid h-7 w-7 place-items-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-cyan";

/** Copy for every message, edit for the owner's own questions, thumbs up/down for ADUF's replies. */
export function MessageActions({ message, onEdit }: { message: ChatMessage; onEdit?: () => void }) {
  const { rateMessage, thinking } = useAduf();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-0.5",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => void copy()}
        aria-label="Copy message"
        title="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {message.role === "user" && onEdit ? (
        <button
          type="button"
          className={btn}
          disabled={thinking}
          onClick={onEdit}
          aria-label="Edit message"
          title="Edit and resend"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {message.role === "aduf" ? (
        <>
          <button
            type="button"
            className={cn(btn, message.feedback === "up" && "text-emerald-400")}
            aria-pressed={message.feedback === "up"}
            onClick={() => rateMessage(message.id, "up")}
            aria-label="Good answer"
            title="Good answer"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={cn(btn, message.feedback === "down" && "text-rose-400")}
            aria-pressed={message.feedback === "down"}
            onClick={() => rateMessage(message.id, "down")}
            aria-label="Poor answer"
            title="Poor answer"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </>
      ) : null}
    </div>
  );
}

/** Inline editor shown in place of a user's message while they rewrite it. */
export function MessageEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <div className="rounded-2xl bg-white/12 p-2.5">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(8, Math.max(2, text.split("\n").length))}
        className="w-full resize-none bg-transparent text-sm outline-none"
        aria-label="Edit your message"
      />
      <div className="mt-1.5 flex justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!text.trim() || text.trim() === initial.trim()}
          onClick={() => onSave(text)}
          className="rounded-lg bg-white/15 px-2.5 py-1 font-medium disabled:opacity-40"
        >
          Resend
        </button>
      </div>
    </div>
  );
}
