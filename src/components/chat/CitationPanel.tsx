import { FileText } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/types";

export function CitationPanel({ data, onClose }: { data: { s: Source; all: Source[] } | null; onClose: () => void }) {
  return (
    <Sheet open={!!data} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[400px]">
        <SheetHeader className="shrink-0 border-b border-border p-6">
          <SheetTitle className="font-display">Sources</SheetTitle>
          <SheetDescription>Exact excerpts used in this answer.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-6">
          {data?.all.map((s) => (
            <article key={s.id} className={cn("rounded-2xl border p-4", s.id === data.s.id ? "border-primary" : "border-border")} style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-accent-text">[{s.id}]</span>
                <FileText className="size-4 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{s.fileName}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.location}</p>
              <blockquote className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed">"{s.excerpt}"</blockquote>
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
