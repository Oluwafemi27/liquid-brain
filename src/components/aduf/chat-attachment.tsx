import {
  Download,
  FileText,
  Film,
  ImageIcon,
  Loader2,
  Music,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChatAttachment } from "@/lib/aduf-types";
import { sizeLabel } from "@/lib/attachment-types";
import { authHeaders } from "@/lib/auth-headers";

const kindOf = (a: ChatAttachment) => a.kind ?? "document";

function Icon({ a, className }: { a: ChatAttachment; className?: string }) {
  const k = kindOf(a);
  const I = k === "image" ? ImageIcon : k === "video" ? Film : k === "audio" ? Music : FileText;
  return <I className={className} />;
}

/** A short-lived link to the stored original. Every file is opened through a signed link, never a bare URL. */
function useOriginalUrl(a: ChatAttachment, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || a.kind === "video") return;
    let live = true;
    const endpoint = a.kind ? "/api/attachments/url" : "/api/documents/link";
    fetch(endpoint, {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no url"))))
      .then((d: { url: string }) => live && setUrl(d.url))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [a.id, a.kind, enabled]);
  return { url, failed };
}

export function ChatAttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  const [open, setOpen] = useState(false);
  const kind = kindOf(attachment);
  const legacy = !attachment.kind;
  const gone = attachment.originalDeleted === true;
  const { url, failed } = useOriginalUrl(attachment, open && !gone);
  const isPdf = attachment.format === "pdf";
  const source = url;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex max-w-[85%] items-center gap-2.5 rounded-xl border border-border/60 bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.06]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-cyan/15 text-cyan">
          {attachment.thumbnail ? (
            <img src={attachment.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon a={attachment} className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{attachment.filename}</span>
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
            {attachment.format} · {sizeLabel(attachment.sizeBytes)} · tap to open
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[86dvh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6 text-base">
              <Icon a={attachment} className="h-4 w-4 shrink-0 text-cyan" />
              <span className="truncate">{attachment.filename}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the attached file and what ADUF read from it.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[58dvh] space-y-3 overflow-y-auto">
            {kind === "image" ? (
              <div className="grid min-h-24 place-items-center overflow-hidden rounded-lg border border-border/60 bg-black/20">
                {gone ? (
                  <p className="p-4 text-xs text-muted-foreground">
                    The original picture was deleted. ADUF keeps what it read from it.
                  </p>
                ) : url ? (
                  <img
                    src={url}
                    alt={attachment.filename}
                    className="max-h-[40dvh] w-auto max-w-full object-contain"
                  />
                ) : failed ? (
                  <p className="p-4 text-xs text-muted-foreground">
                    The picture can't be shown right now.
                  </p>
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
            ) : null}
            {kind === "video" && attachment.thumbnail ? (
              <img
                src={attachment.thumbnail}
                alt=""
                className="mx-auto max-h-40 rounded-lg border border-border/60"
              />
            ) : null}
            {kind === "audio" ? (
              url ? (
                <audio controls src={url} className="w-full" />
              ) : failed ? null : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )
            ) : null}
            {kind === "document" && isPdf && source ? (
              <iframe
                title={attachment.filename}
                src={source ? (legacy ? `${source}&inline=1` : source) : undefined}
                className="h-[45dvh] w-full rounded-lg border border-border/60"
              />
            ) : null}
            {attachment.note ? (
              <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
                {attachment.note}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {attachment.scanned ? (
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Scanned for viruses
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Trash2 className="h-3.5 w-3.5" />
                {gone
                  ? "Original file deleted. Only the text read from it is kept."
                  : "Original is deleted automatically within 24 hours."}
              </span>
            </div>
            {!(kind === "document" && isPdf) || !legacy ? (
              <div>
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                  {kind === "image"
                    ? "What ADUF sees"
                    : kind === "video"
                      ? "What ADUF understood"
                      : kind === "audio"
                        ? "Transcript"
                        : "Text ADUF read"}
                </p>
                <pre className="max-h-[28dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-black/20 p-3 text-xs text-muted-foreground">
                  {attachment.previewText || "(nothing readable was found)"}
                </pre>
              </div>
            ) : null}
          </div>

          {kind !== "video" && source ? (
            <a
              href={source}
              download={attachment.filename}
              target={legacy ? undefined : "_blank"}
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-background"
              style={{ background: "var(--gradient-accent)" }}
            >
              <Download className="h-4 w-4" /> Download
            </a>
          ) : null}
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
