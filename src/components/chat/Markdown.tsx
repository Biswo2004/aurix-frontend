import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { Check, Copy } from "lucide-react";

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

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        pre: ({ children }) => <>{children}</>,
        table: ({ children }) => <div className="my-4 overflow-x-auto rounded-xl border border-border [&_table]:border-hidden"><table>{children}</table></div>,
        code({ className, children }) {
          const m = /language-(\w+)/.exec(className || "");
          const text = String(children).replace(/\n$/, "");
          if (m || text.includes("\n")) return <CodeBlock lang={m?.[1] ?? ""} code={text} />;
          return <code>{children}</code>;
        },
      }}>{children}</ReactMarkdown>
    </div>
  );
}
