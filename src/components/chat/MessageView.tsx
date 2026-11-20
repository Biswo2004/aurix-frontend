import { useState } from "react";
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Feedback, Message, Source } from "@/lib/types";
import { FileChip } from "./FileChip";
import { LogoMark } from "./Logo";
import { Markdown } from "./Markdown";

const iconBtn = "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground";

export function UserMessage({ m }: { m: Message }) {
  return (
    <div className="msg-in flex flex-col items-end gap-2">
      {m.files && m.files.length > 0 && <div className="flex max-w-[85%] flex-wrap justify-end gap-2">{m.files.map((f) => <FileChip key={f.id} f={f} />)}</div>}
      <div className="max-w-[85%] rounded-[18px] border border-user-bubble-border bg-user-bubble px-4 py-2 text-base leading-[1.65] whitespace-pre-wrap text-user-bubble-foreground">{m.content}</div>
    </div>
  );
}

export function AssistantMessage({ m, streaming, isLast, onCite, onRegenerate, onFeedback, onFollowUp }: {
  m: Message; streaming?: boolean; isLast?: boolean; onCite?: (s: Source, all: Source[]) => void;
  onRegenerate?: () => void; onFeedback?: (f: Feedback, reason?: string) => void; onFollowUp?: (q: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="msg-in flex gap-4">
      <LogoMark className="mt-1" />
      <div className="min-w-0 flex-1">
        {m.content ? <Markdown sources={streaming ? undefined : m.sources} onCite={onCite}>{m.content}</Markdown> : (
          <div className="flex h-7 items-center gap-1" aria-label="AURIX is typing">
            {[0, 1, 2].map((i) => <span key={i} className="typing-dot size-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        )}
        {!streaming && m.content && (
          <>
            {m.sources && m.sources.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Sources</span>
                {m.sources.map((s) => (
                  <button key={s.id} title={`${s.fileName} · ${s.location}`} onClick={() => onCite?.(s, m.sources!)}
                    className="flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs hover:bg-muted">
                    <span className="font-mono text-accent-text">[{s.id}]</span><span className="max-w-[140px] truncate">{s.fileName}</span>{s.location && <span className="shrink-0 text-muted-foreground">· {s.location}</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 -ml-2 flex items-center gap-1">
              <button aria-label="Copy reply" className={iconBtn} onClick={() => { navigator.clipboard.writeText(m.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
              {isLast && <button aria-label="Regenerate reply" className={iconBtn} onClick={onRegenerate}><RefreshCw className="size-4" /></button>}
              <button aria-label="Good reply" aria-pressed={m.feedback === "up"} className={cn(iconBtn, m.feedback === "up" && "text-accent-text")}
                onClick={() => { onFeedback?.(m.feedback === "up" ? null : "up"); }}><ThumbsUp className="size-4" /></button>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="Bad reply" className={cn(iconBtn, m.feedback === "down" && "text-destructive")}><ThumbsDown className="size-4" /></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">What went wrong?</DropdownMenuLabel>
                  {["Incorrect", "Off-topic", "Unsafe", "Other"].map((r) => (
                    <DropdownMenuItem key={r} onClick={() => { onFeedback?.("down", r); toast("Thanks for the feedback", { description: r }); }}>{r}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isLast && m.followUps && (
              <div className="mt-4 flex flex-wrap gap-2">
                {m.followUps.map((f) => (
                  <button key={f} onClick={() => onFollowUp?.(f)}
                    className="btn-lift rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted">{f}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
