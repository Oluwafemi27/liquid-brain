import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Renders a chat message's markdown properly — this is what was missing:
 *  the agent has always been instructed (see agent.ts's "Formatting: use
 *  tables for structured answers") to reply with GitHub-flavored markdown
 *  (bold, bullet lists, and pipe tables), but the chat bubble was just
 *  printing `{m.text}` as a raw string, so `**bold**` and `| a | b |`
 *  showed up literally instead of rendering. remark-gfm adds table/
 *  strikethrough/task-list support on top of react-markdown, which never
 *  uses dangerouslySetInnerHTML — safe by construction for LLM output.
 *
 *  Tables get their own horizontally-scrollable wrapper since chat bubbles
 *  are narrow (esp. on mobile) and a wide table must never blow out the
 *  bubble or force the whole page to scroll sideways. */
export function ChatMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("chat-markdown space-y-2.5 text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed [&:not(:first-child)]:mt-2.5">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan underline decoration-cyan/40 underline-offset-2 hover:decoration-cyan"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1 [&:not(:first-child)]:mt-2">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1 [&:not(:first-child)]:mt-2">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          h1: ({ children }) => <h3 className="mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h3>,
          h3: ({ children }) => (
            <h4 className="mt-2.5 text-xs font-semibold uppercase tracking-wide text-foreground/90 first:mt-0">
              {children}
            </h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan/40 pl-3 text-muted-foreground/90">{children}</blockquote>
          ),
          hr: () => <hr className="my-3 border-border/60" />,
          code: ({ className: codeClassName, children }) => {
            const isBlock = /language-/.test(codeClassName ?? "");
            if (isBlock) {
              return (
                <pre className="my-2 overflow-x-auto rounded-lg bg-black/40 p-2.5 text-[12px] leading-relaxed">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-cyan/90">
                {children}
              </code>
            );
          },
          // The actual fix for the screenshot: pipe tables now render as a
          // real <table>, wrapped so wide tables scroll within the bubble
          // instead of forcing overflow or getting truncated off-screen.
          table: ({ children }) => (
            <div className="-mx-1 my-2 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/8">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border/50">{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="whitespace-nowrap px-2.5 py-1.5 font-semibold text-foreground">{children}</th>
          ),
          td: ({ children }) => <td className="px-2.5 py-1.5 align-top text-muted-foreground">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
