import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ClipboardEvent as ReactClipboardEvent } from "react";
import { ArrowUp, Image as ImageIcon, Mic, Paperclip, SlidersHorizontal, Square, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/types";
import { ACCEPT_ATTR } from "@/lib/files";
import { FileChip } from "./FileChip";

export type ComposerHandle = { focus: () => void };
const tool = "flex size-9 items-center justify-center rounded-[10px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground";

export const Composer = forwardRef<ComposerHandle, { onSend: (t: string, opts: { useFiles: boolean }) => void; onStop: () => void; streaming: boolean; files: Attachment[]; onPick: (f: FileList) => void; onRemove: (id: string) => void }>(
  function Composer({ onSend, onStop, streaming, files: att, onPick, onRemove }, ref) {
    const [text, setText] = useState("");
    const [files, setFiles] = useState(true);
    const [listening, setListening] = useState(false);
    const ta = useRef<HTMLTextAreaElement>(null);
    const fileIn = useRef<HTMLInputElement>(null);
    const imgIn = useRef<HTMLInputElement>(null);
    const uploading = att.some((a) => a.progress < 100);
    useImperativeHandle(ref, () => ({ focus: () => ta.current?.focus() }));
    useEffect(() => {
      const el = ta.current; if (!el) return;
      el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 24 * 6 + 16) + "px";
    }, [text]);
    const send = () => { const t = text.trim() || (att.length ? "Please review the attached files." : ""); if (!t || streaming || uploading) return; onSend(t, { useFiles: files }); setText(""); };
    // Paste support: Ctrl/Cmd+V with a copied file, screenshot or image attaches it like the paperclip does.
    // Plain text pastes are left alone; clipboards holding text AND an image (e.g. copied from Excel/Word) paste as text.
    const onPaste = (e: ReactClipboardEvent<HTMLTextAreaElement>) => {
      const cd = e.clipboardData;
      if (!cd) return;
      const files: File[] = [];
      for (const item of Array.from(cd.items ?? [])) {
        if (item.kind === "file") { const f = item.getAsFile(); if (f) files.push(f); }
      }
      if (!files.length && cd.files?.length) files.push(...Array.from(cd.files));
      if (!files.length || cd.getData("text/plain")) return;
      e.preventDefault();
      const stamp = Date.now();
      const dt = new DataTransfer();
      files.forEach((f, i) => {
        // Screenshots arrive as a generic "image.png"; give each a unique, readable name.
        const generic = /^image\.\w+$/i.test(f.name) || !f.name;
        const ext = (f.type.split("/")[1] || "png").replace("jpeg", "jpg").split("+")[0];
        dt.items.add(generic ? new File([f], `pasted-image-${stamp}${files.length > 1 ? "-" + (i + 1) : ""}.${ext}`, { type: f.type }) : f);
      });
      onPick(dt.files);
    };
    const voice = () => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { toast.error("Voice input is not supported in this browser"); return; }
      const r = new SR(); r.lang = "en-US"; r.interimResults = false;
      r.onresult = (e: any) => setText((p) => (p ? p + " " : "") + e.results[0][0].transcript);
      r.onend = () => setListening(false); setListening(true); r.start();
    };
    return (
      <div className="composer-surface mx-auto w-full max-w-[768px] rounded-2xl border border-border bg-card p-2">
        {att.length > 0 && <div className="flex flex-wrap gap-2 p-1 pb-2">{att.map((a) => <FileChip key={a.id} f={a} onRemove={() => onRemove(a.id)} />)}</div>}
        <input ref={fileIn} type="file" multiple accept={ACCEPT_ATTR} hidden onChange={(e) => { if (e.target.files) onPick(e.target.files); e.target.value = ""; }} />
        <input ref={imgIn} type="file" multiple accept=".jpg,.jpeg,.png,.webp" hidden onChange={(e) => { if (e.target.files) onPick(e.target.files); e.target.value = ""; }} />
        <label htmlFor="composer" className="sr-only">Message AURIX</label>
        <textarea id="composer" ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          onPaste={onPaste}
          placeholder="Ask anything, or attach a file…"
          className="block max-h-[160px] min-h-[40px] w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground" />
        <div className="flex items-center gap-1">
          <button aria-label="Attach file" className={tool} onClick={() => fileIn.current?.click()}><Paperclip className="size-4" /></button>
          <button aria-label="Attach image" className={tool} onClick={() => imgIn.current?.click()}><ImageIcon className="size-4" /></button>
          <button aria-label={listening ? "Listening" : "Voice input"} className={cn(tool, listening && "text-destructive")} onClick={voice}><Mic className="size-4" /></button>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Tools" className={tool}><SlidersHorizontal className="size-4" /></DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem checked={files} onCheckedChange={setFiles}><FileText className="size-4" /> Use my files</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          {streaming ? (
            <button onClick={onStop} aria-label="Stop generating" className="btn-lift flex h-9 items-center gap-2 rounded-[10px] border border-border px-3 text-sm font-medium hover:bg-muted">
              <Square className="size-3.5 fill-current" /> Stop
            </button>
          ) : (
            <button onClick={send} disabled={(!text.trim() && !att.length) || uploading} aria-label="Send message"
              className="btn-lift flex size-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </div>
    );
  },
);
