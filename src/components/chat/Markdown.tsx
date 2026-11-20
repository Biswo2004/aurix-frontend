import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { Check, Copy } from "lucide-react";
import type { Source } from "@/lib/types";
import { normalizeCitations } from "@/lib/citations";

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between bg-muted px-4 py-2 text-xs text-muted-foreground">
        <span className="font-mono">{lang || "text"}</span>
        <button aria-label="Copy code" className="flex items-center gap-1 hover:text-foreground"
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter language={lang} useInlineStyles={false}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/** Turns [1] in an answer into a link to #cite-1, but only for numbers that have a source and never inside code. */
function linkCitations(text: string, ids: Set<number>): string {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) =>
      i % 2 === 1 ? part : part.replace(/\[(\d{1,2})\](?!\()/g, (all, n) => (ids.has(Number(n)) ? `[\\[${n}\\]](#cite-${n})` : all)),
    )
    .join("");
}

export function Markdown({ children, sources, onCite }: { children: string; sources?: Source[] | undefined; onCite?: ((s: Source, all: Source[]) => void) | undefined }) {
  const ids = new Set((sources ?? []).map((s) => s.id));
  const clean = normalizeCitations(children);
  const text = sources && sources.length ? linkCitations(clean, ids) : clean;
  return (
    <div className="prose-chat">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        pre: ({ children }) => <>{children}</>,
        table: ({ children }) => <div className="my-4 overflow-x-auto rounded-xl border border-border [&_table]:border-hidden"><table>{children}</table></div>,
        a({ href, children }) {
          const n = href?.startsWith("#cite-") ? Number(href.slice(6)) : NaN;
          const src = sources?.find((x) => x.id === n);
          if (!src) return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
          return (
            <button type="button" title={`${src.fileName}${src.location ? ` · ${src.location}` : ""}`} onClick={() => onCite?.(src, sources!)}
              className="mx-0.5 inline-flex items-center rounded border border-border bg-card px-1 align-baseline font-mono text-xs text-accent-text hover:bg-muted">
              {children}
            </button>
          );
        },
        code({ className, children }) {
          const m = /language-(\w+)/.exec(className || "");
          const text = String(children).replace(/\n$/, "");
          if (m || text.includes("\n")) return <CodeBlock lang={m?.[1] ?? ""} code={text} />;
          return <code>{children}</code>;
        },
      }}>{text}</ReactMarkdown>
    </div>
  );
}
