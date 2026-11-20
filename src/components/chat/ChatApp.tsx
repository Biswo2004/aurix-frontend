import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, Paperclip, UploadCloud, FileSearch, ImageIcon, ListChecks, Menu, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import type { Attachment, Conversation, Feedback, Message, Source } from "@/lib/types";
import { validateFile } from "@/lib/files";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileChip } from "./FileChip";
import { CitationPanel } from "./CitationPanel";
import { SettingsDialog } from "./SettingsDialog";
import { Sidebar } from "./Sidebar";
import { AssistantMessage, UserMessage } from "./MessageView";
import { Composer, type ComposerHandle } from "./Composer";
import { useTheme } from "./useTheme";

const PROMPTS = [
  { icon: FileSearch, title: "Summarize my document", desc: "Get the key ideas in seconds" },
  { icon: BarChart3, title: "Analyze this CSV", desc: "Find trends and outliers" },
  { icon: ImageIcon, title: "Explain this image", desc: "Describe charts, diagrams, screenshots" },
  { icon: ListChecks, title: "Extract key points", desc: "Turn long text into action items" },
];
const LAST = "aurix.lastId";

export function ChatApp() {
  const { theme, setTheme } = useTheme();
  const q = useQuery({ queryKey: ["conversations"], queryFn: api.listConversations });
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const composer = useRef<ComposerHandle>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [cite, setCite] = useState<{ s: Source; all: Source[] } | null>(null);
  const [settings, setSettings] = useState(false);

  const pickFiles = (list: FileList) => {
    let count = pending.length;
    const added: Attachment[] = [];
    for (const f of Array.from(list)) {
      const err = validateFile(f, count);
      if (err) { toast.error(err); continue; }
      count++;
      added.push({ id: api.newId(), name: f.name, size: f.size, type: f.type, progress: 0,
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined });
    }
    setPending((p) => [...p, ...added]);
    // Simulated upload; replace with a real POST to the backend later.
    added.forEach((a) => {
      const t = setInterval(() => setPending((p) => p.map((x) => {
        if (x.id !== a.id) return x;
        const progress = Math.min(100, x.progress + 15 + Math.round(Math.random() * 20));
        if (progress === 100) clearInterval(t);
        return { ...x, progress };
      })), 180);
    });
  };

  useEffect(() => {
    if (!q.data) return;
    setConvs(q.data);
    const last = localStorage.getItem(LAST);
    setActiveId(q.data.find((c) => c.id === last)?.id ?? q.data[0]?.id ?? null);
  }, [q.data]);
  useEffect(() => { if (q.data) api.saveConversations(convs.filter((c) => c.messages.length)); }, [convs, q.data]);
  useEffect(() => { if (activeId) localStorage.setItem(LAST, activeId); }, [activeId]);

  const active = useMemo(() => convs.find((c) => c.id === activeId) ?? null, [convs, activeId]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [active?.messages]);

  const update = (id: string, fn: (c: Conversation) => Conversation) => setConvs((l) => l.map((c) => (c.id === id ? fn(c) : c)));

  const newChat = useCallback(() => {
    const c: Conversation = { id: api.newId(), title: "New chat", updatedAt: new Date().toISOString(), messages: [] };
    setConvs((l) => [c, ...l.filter((x) => x.messages.length)]); setActiveId(c.id); setDrawer(false);
    setTimeout(() => composer.current?.focus(), 50);
  }, []);

  const run = async (convId: string, prompt: string) => {
    const tmpId = api.newId();
    update(convId, (c) => ({ ...c, messages: [...c.messages, { id: tmpId, role: "assistant", content: "", createdAt: new Date().toISOString() }] }));
    setStreamingId(tmpId);
    const ctrl = new AbortController(); abort.current = ctrl;
    const it = api.streamReply(prompt, ctrl.signal);
    let acc = "";
    try {
      for (;;) {
        const r = await it.next();
        if (r.done) {
          update(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === tmpId ? { ...r.value, content: acc || "_Stopped._" } as Message : m)) }));
          break;
        }
        acc += r.value;
        update(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === tmpId ? { ...m, content: acc } : m)) }));
      }
    } catch { toast.error("Something went wrong", { action: { label: "Retry", onClick: () => run(convId, prompt) } }); }
    setStreamingId(null);
  };

  const send = (text: string) => {
    let id = activeId;
    if (!id) { const c: Conversation = { id: api.newId(), title: "New chat", updatedAt: "", messages: [] }; setConvs((l) => [c, ...l]); id = c.id; setActiveId(id); }
    const files = pending; setPending([]);
    const msg: Message = { id: api.newId(), role: "user", content: text, createdAt: new Date().toISOString(), files: files.length ? files : undefined };
    setConvs((l) => l.map((c) => (c.id === id ? { ...c, title: c.messages.length ? c.title : text.slice(0, 48), updatedAt: msg.createdAt, messages: [...c.messages, msg], files: [...(c.files ?? []), ...files] } : c)));
    run(id, text);
  };

  const regenerate = () => {
    if (!active) return;
    const lastUser = [...active.messages].reverse().find((m) => m.role === "user"); if (!lastUser) return;
    update(active.id, (c) => ({ ...c, messages: c.messages.slice(0, -1) }));
    run(active.id, lastUser.content);
  };
  const feedback = (mid: string, f: Feedback) => active && update(active.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === mid ? { ...m, feedback: f } : m)) }));
  const remove = (id: string) => { setConvs((l) => l.filter((c) => c.id !== id)); if (id === activeId) setActiveId(null); toast("Chat deleted"); };
  const exportMd = () => {
    if (!active) return;
    const md = `# ${active.title}\n\n` + active.messages.map((m) => `**${m.role === "user" ? "You" : "AURIX"}:**\n\n${m.content}`).join("\n\n---\n\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = `${active.title}.md`; a.click();
  };

  const sidebar = (
    <Sidebar conversations={convs} activeId={activeId} loading={q.isLoading} newDisabled={!!active && active.messages.length === 0}
      onSelect={(id) => { setActiveId(id); setDrawer(false); }} onNew={newChat}
      onRename={(id, t) => update(id, (c) => ({ ...c, title: t }))} onDelete={remove} theme={theme} setTheme={setTheme} onSettings={() => { setDrawer(false); setSettings(true); }} />
  );
  const empty = !active || active.messages.length === 0;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="hidden md:block">{sidebar}</div>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-[280px] max-w-[85vw] border-0 p-0 [&>button]:hidden"><SheetTitle className="sr-only">Chats</SheetTitle>{sidebar}</SheetContent>
      </Sheet>
      <main onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) pickFiles(e.dataTransfer.files); }}
        className="relative flex min-w-0 flex-1 flex-col bg-chat md:my-2 md:mr-2 md:rounded-2xl md:border md:border-border">
        {dragging && <div className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-background/90 text-sm"><UploadCloud className="size-8 text-accent-text" /><p className="font-medium">Drop files to attach</p><p className="text-muted-foreground">PDF, DOCX, TXT, MD, CSV, XLSX, images · up to 20 MB</p></div>}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <button aria-label="Open chats" className="flex size-9 items-center justify-center rounded-[10px] hover:bg-muted md:hidden" onClick={() => setDrawer(true)}><Menu className="size-5" /></button>
          {active && !empty ? (
            <input aria-label="Chat title" value={active.title} onChange={(e) => update(active.id, (c) => ({ ...c, title: e.target.value }))}
              className="min-w-0 flex-1 truncate rounded-md bg-transparent px-2 py-1 font-display text-lg font-semibold outline-none hover:bg-muted focus:bg-muted" />
          ) : <span className="flex-1 px-2 font-display text-lg font-semibold">New chat</span>}
          <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-success" /> Aurix Pro
          </span>
          {active?.files && active.files.length > 0 && (
            <Popover>
              <PopoverTrigger aria-label="Files in this chat" className="flex h-9 items-center gap-1 rounded-[10px] px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                <Paperclip className="size-4" />{active.files.length}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[260px] p-2">
                <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Files in this chat</p>
                <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">{active.files.map((f) => <FileChip key={f.id} f={{ ...f, progress: 100 }} />)}</div>
              </PopoverContent>
            </Popover>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Share or export" disabled={empty} className="flex size-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><Share2 className="size-4" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(location.href); toast("Link copied"); }}><Share2 className="size-4" /> Copy link</DropdownMenuItem>
              <DropdownMenuItem onClick={exportMd}><Download className="size-4" /> Export as Markdown</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex-1 overflow-y-auto">
          {empty ? (
            <div className="mx-auto flex h-full max-w-[768px] flex-col justify-center px-4 py-8">
              <h1 className="font-display text-[28px] font-bold tracking-normal md:text-[40px]">Good to see you, Biswojit.</h1>
              <p className="mt-2 text-muted-foreground">Ask a question or attach a file — AURIX answers with sources.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {PROMPTS.map(({ icon: Icon, title, desc }) => (
                  <button key={title} onClick={() => send(title)} className="btn-lift rounded-2xl border border-border bg-card p-4 text-left hover:bg-muted/50" style={{ boxShadow: "var(--shadow-card)" }}>
                    <Icon className="size-5 text-accent-text" />
                    <p className="mt-4 text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-[768px] flex-col gap-8 px-4 py-8">
              {active!.messages.map((m, i) => m.role === "user" ? <UserMessage key={m.id} m={m} /> : (
                <AssistantMessage key={m.id} m={m} streaming={m.id === streamingId} isLast={i === active!.messages.length - 1} onCite={(src, all) => setCite({ s: src, all })}
                  onRegenerate={regenerate} onFeedback={(f) => feedback(m.id, f)} onFollowUp={send} />
              ))}
              <div ref={bottom} />
            </div>
          )}
        </div>
        <div className="shrink-0 px-4 pt-2 pb-4">
          <Composer ref={composer} streaming={!!streamingId} files={pending} onPick={pickFiles} onRemove={(id) => setPending((p) => p.filter((x) => x.id !== id))} onSend={send} onStop={() => abort.current?.abort()} />
          <p className="mt-2 text-center text-xs text-muted-foreground">AURIX can make mistakes. Check important info.</p>
        </div>
      </main>
      <CitationPanel data={cite} onClose={() => setCite(null)} />
      <SettingsDialog open={settings} onOpenChange={setSettings} theme={theme} setTheme={setTheme} canExport={!empty} onExport={exportMd}
        onResetMemory={() => toast.success("Memory reset", { description: "AURIX will forget saved preferences." })}
        onDeleteAll={() => { setConvs([]); setActiveId(null); localStorage.removeItem(LAST); setSettings(false); toast("All chats deleted"); }} />
    </div>
  );
}
