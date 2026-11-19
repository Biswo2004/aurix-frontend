import { File, FileSpreadsheet, FileText, Image as ImageIcon, X } from "lucide-react";
import type { Attachment } from "@/lib/types";

export const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
export function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return ImageIcon;
  if (["csv", "xlsx"].includes(ext)) return FileSpreadsheet;
  if (["pdf", "docx", "txt", "md"].includes(ext)) return FileText;
  return File;
}

export function FileChip({ f, onRemove }: { f: Attachment; onRemove?: () => void }) {
  const Icon = fileIcon(f.name);
  return (
    <div className="relative flex w-[220px] items-center gap-2 overflow-hidden rounded-xl border border-border bg-card p-2">
      {f.previewUrl ? <img src={f.previewUrl} alt="" className="size-9 shrink-0 rounded-md object-cover" /> : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary"><Icon className="size-4" /></span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{f.name}</p>
        <p className="text-xs text-muted-foreground">{f.progress < 100 ? `Uploading… ${f.progress}%` : fmtSize(f.size)}</p>
      </div>
      {onRemove && <button aria-label={`Remove ${f.name}`} onClick={onRemove} className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-3.5" /></button>}
      {f.progress < 100 && <span className="absolute bottom-0 left-0 h-0.5 bg-primary transition-[width] duration-200" style={{ width: `${f.progress}%` }} />}
    </div>
  );
}
