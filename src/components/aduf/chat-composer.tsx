import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  FileText,
  Film,
  ImageIcon,
  Loader2,
  Mic,
  Music,
  Paperclip,
  Plug,
  Plus,
  Send,
  Square,
  Target,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { ConnectorPicker } from "@/components/aduf/connector-picker";
import type { ChatAttachment } from "@/lib/aduf-types";
import { attachFile, checkFile, type Stage } from "@/lib/attachments-client";
import { MAX_FILES_PER_MESSAGE, sizeLabel } from "@/lib/attachment-types";
import { useDictation } from "@/lib/use-dictation";
import { cn } from "@/lib/utils";

const MAX_CHARS = 12_000;

interface Item {
  key: string;
  name: string;
  size: number;
  kind: "document" | "image" | "audio" | "video";
  stage: Stage | "ready" | "error";
  detail?: string | undefined;
  thumbnail?: string | null | undefined;
  attachment?: ChatAttachment | undefined;
  error?: string | undefined;
}

const STAGE_LABEL: Record<Stage, string> = {
  preparing: "Preparing",
  uploading: "Uploading",
  reading: "Reading",
  transcribing: "Transcribing",
};

function KindIcon({ kind, className }: { kind: Item["kind"]; className?: string }) {
  const I =
    kind === "image" ? ImageIcon : kind === "video" ? Film : kind === "audio" ? Music : FileText;
  return <I className={className} />;
}

/** The message box: grows with what you type, takes many files (documents, photos, video, audio),
 *  dictates voice without repeating words, and opens the connector panel in place. */
export function ChatComposer({
  sessionId,
  thinking,
  onSend,
}: {
  sessionId: string;
  thinking: boolean;
  onSend: (text: string, attachments: ChatAttachment[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const anyFile = useRef<HTMLInputElement>(null);
  const mediaFile = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // ---- auto-growing text box: always as tall as its text, up to 45% of the screen, then it scrolls.
  const fit = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.max(120, Math.round(window.innerHeight * 0.45));
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, []);
  useLayoutEffect(fit, [draft, fit]);
  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  const dictation = useDictation({
    getText: () => draftRef.current,
    setText: setDraft,
    onError: setNotice,
  });

  // ---- files
  const patch = (key: string, p: Partial<Item>) =>
    setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setNotice(null);
      const room = MAX_FILES_PER_MESSAGE - itemsRef.current.length;
      if (room <= 0)
        return setNotice(`You can attach up to ${MAX_FILES_PER_MESSAGE} files per message.`);
      const accepted = files.slice(0, room);
      if (files.length > room)
        setNotice(
          `Only ${room} more file${room === 1 ? "" : "s"} fit in this message. The rest were skipped.`,
        );
      const fresh: Array<{ file: File; item: Item }> = [];
      for (const file of accepted) {
        const checked = checkFile(file);
        if ("error" in checked) {
          setNotice(checked.error);
          continue;
        }
        const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
        fresh.push({
          file,
          item: { key, name: file.name, size: file.size, kind: checked.kind, stage: "preparing" },
        });
      }
      if (fresh.length === 0) return;
      setItems((cur) => [...cur, ...fresh.map((f) => f.item)]);
      // Videos go one at a time (they are heavy); everything else is read three at a time.
      void (async () => {
        const run = async ({ file, item }: { file: File; item: Item }) => {
          try {
            const { attachment, thumbnail } = await attachFile(file, sessionId, (stage, detail) =>
              patch(item.key, { stage, detail }),
            );
            patch(item.key, {
              stage: "ready",
              attachment,
              thumbnail: thumbnail ?? attachment.thumbnail ?? null,
              detail: undefined,
            });
          } catch (e) {
            patch(item.key, {
              stage: "error",
              error: e instanceof Error ? e.message : "Couldn't read that file.",
            });
          }
        };
        const light = fresh.filter((f) => f.item.kind !== "video");
        const heavy = fresh.filter((f) => f.item.kind === "video");
        let next = 0;
        const lane = async () => {
          while (next < light.length) await run(light[next++]!);
        };
        await Promise.all([
          Promise.all([lane(), lane(), lane()]),
          (async () => {
            for (const f of heavy) await run(f);
          })(),
        ]);
      })();
    },
    [sessionId],
  );

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const busy = items.some((i) => i.stage !== "ready" && i.stage !== "error");
  const ready = items.flatMap((i) => (i.stage === "ready" && i.attachment ? [i.attachment] : []));
  const canSend = !thinking && !busy && (draft.trim().length > 0 || ready.length > 0);

  const send = () => {
    if (!canSend) return;
    dictation.stop();
    onSend(draft, ready);
    setDraft("");
    setItems([]);
    setNotice(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    // Phones: Enter makes a new line (use the send button). Computers: Enter sends, Shift+Enter is a new line.
    if (window.matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      send();
    }
  };

  const menuItem =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/8";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "relative flex shrink-0 flex-col gap-2 p-4 transition-colors",
        dragging && "bg-cyan/5",
      )}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-2xl border border-dashed border-cyan/60 bg-background/80 text-sm text-cyan">
          Drop files to attach them
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul
          className="flex max-h-40 flex-wrap gap-2 overflow-y-auto px-1"
          aria-label="Attached files"
        >
          {items.map((i) => (
            <li
              key={i.key}
              title={i.error ?? i.name}
              className={cn(
                "glass flex max-w-full items-center gap-2 rounded-2xl py-1.5 pl-1.5 pr-1.5 text-xs",
                i.stage === "error" && "border border-destructive/50",
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 text-muted-foreground">
                {i.thumbnail ? (
                  <img src={i.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <KindIcon kind={i.kind} className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 max-w-[11rem]">
                <span className="block truncate">{i.name}</span>
                <span
                  className={cn(
                    "block truncate text-[10px]",
                    i.stage === "error" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {i.stage === "error"
                    ? (i.error ?? "Couldn't read this file")
                    : i.stage === "ready"
                      ? sizeLabel(i.size)
                      : (i.detail ?? `${STAGE_LABEL[i.stage]}…`)}
                </span>
              </span>
              {i.stage !== "ready" && i.stage !== "error" ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              ) : null}
              {i.stage === "error" ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : null}
              <button
                type="button"
                onClick={() => setItems((cur) => cur.filter((x) => x.key !== i.key))}
                aria-label={`Remove ${i.name}`}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/12 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {notice ? (
        <p role="status" className="flex items-start gap-1.5 px-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Add files, connect an app or set a goal"
            aria-expanded={menuOpen}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
          >
            <Plus className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-45")} />
          </button>
          <AnimatePresence>
            {menuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="glass-solid absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden p-1.5"
                >
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => (anyFile.current?.click(), setMenuOpen(false))}
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Attach files
                      <span className="block text-[11px] text-muted-foreground">
                        PDF, Word, Excel, text and more
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => (mediaFile.current?.click(), setMenuOpen(false))}
                  >
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Photos &amp; videos
                      <span className="block text-[11px] text-muted-foreground">
                        ADUF looks at them and listens
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => (setPickerOpen(true), setMenuOpen(false))}
                  >
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    Connect an app
                  </button>
                  <Link to="/goals" onClick={() => setMenuOpen(false)} className={menuItem}>
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Set a goal
                  </Link>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
          <input
            ref={anyFile}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <input
            ref={mediaFile}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>

        <div className="min-w-0 flex-1 rounded-[1.35rem] bg-white/8 px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={area}
            value={draft}
            rows={1}
            maxLength={MAX_CHARS}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={dictation.listening ? "Listening…" : "Ask ADUF anything..."}
            aria-label="Message to ADUF"
            enterKeyHint="enter"
            className="block max-h-[45dvh] w-full resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-muted-foreground"
          />
          {draft.length > MAX_CHARS * 0.85 ? (
            <p className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground">
              {draft.length.toLocaleString("en")} / {MAX_CHARS.toLocaleString("en")}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={dictation.toggle}
          disabled={!dictation.supported || dictation.transcribing}
          aria-pressed={dictation.listening}
          aria-label={dictation.listening ? "Stop voice input" : "Voice input"}
          title={
            !dictation.supported
              ? "Voice input isn't supported in this browser"
              : dictation.mode === "recorder"
                ? dictation.listening
                  ? "Stop and transcribe"
                  : "Record, then ADUF types it out"
                : dictation.listening
                  ? "Stop listening"
                  : "Speak to ADUF"
          }
          className={cn(
            "relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors",
            dictation.listening
              ? "border-cyan/60 bg-cyan/15 text-cyan"
              : "border-border text-muted-foreground hover:bg-white/8 hover:text-foreground",
            (!dictation.supported || dictation.transcribing) && "cursor-not-allowed opacity-50",
          )}
        >
          {dictation.listening ? (
            <span className="animate-ripple absolute inset-0 rounded-full bg-cyan/40" />
          ) : null}
          {dictation.transcribing ? (
            <Loader2 className="relative h-4 w-4 animate-spin" />
          ) : dictation.listening && dictation.mode === "recorder" ? (
            <Square className="relative h-3.5 w-3.5 fill-current" />
          ) : (
            <Mic className="relative h-4 w-4" />
          )}
        </button>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          title={busy ? "Waiting for your files to be read" : undefined}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform enabled:hover:scale-105 disabled:opacity-40"
          style={{ background: "var(--gradient-accent)" }}
        >
          <Send className="h-4 w-4 text-background" />
        </button>
      </div>
      <ConnectorPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </form>
  );
}
