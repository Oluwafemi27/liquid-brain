import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ChatAttachment } from "@/lib/aduf-types";

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1000)} KB`;
  return `${bytes} B`;
}

export function ChatAttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex max-w-[85%] items-center gap-2.5 rounded-xl border border-border/60 bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.06]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan/15 text-cyan">
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{attachment.filename}</span>
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
            {attachment.format} · {formatSize(attachment.sizeBytes)} · click to preview
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6 text-base">
              <FileText className="h-4 w-4 shrink-0 text-cyan" />
              <span className="truncate">{attachment.filename}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border/60 bg-black/20">
            {attachment.format === "pdf" ? (
              <iframe
                title={attachment.filename}
                src={`/api/documents/${attachment.id}/download?inline=1`}
                className="h-[55vh] w-full"
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words p-4 text-xs text-muted-foreground">
                {attachment.previewText || "(no preview available)"}
              </pre>
            )}
          </div>

          <a
            href={`/api/documents/${attachment.id}/download`}
            download={attachment.filename}
            className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-background"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Download className="h-4 w-4" /> Download {attachment.filename}
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ChatAttachmentLoading() {
  return (
    <div className="mt-2 flex max-w-[85%] items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing file…
    </div>
  );
}
