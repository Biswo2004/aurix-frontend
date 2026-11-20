import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, Paperclip, UploadCloud, FileSearch, ImageIcon, ListChecks, Menu, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { displayName, signOut, useSession } from "@/lib/auth";
import type { Attachment, Conversation, Feedback, Message, Source } from "@/lib/types";
import { validateFile } from "@/lib/files";
import { createReveal } from "@/lib/reveal";
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
  const { user } = useSession();
  const firstName = displayName(user).split(/\s+/)[0] ?? "";
  const q = useQuery({ queryKey: ["conversations"], queryFn: api.listConversations, refetchOnWindowFocus: false });
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
  const initialised = useRef(false);
  const creating = useRef(new Map<string, Promise<string>>());

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
  const update = useCallback((id: string, fn: (c: Conversation) => Conversation) => setConvs((l) => l.map((c) => (c.id === id ? fn(c) : c))), []);

  /* ----- load the conversation list once ----- */
  useEffect(() => {
    if (!q.data || initialised.current) return;
    initialised.current = true;
    setConvs(q.data);
    const last = localStorage.getItem(LAST);
    setActiveId(q.data.find((c) => c.id === last)?.id ?? q.data[0]?.id ?? null);
  }, [q.data]);
  useEffect(() => {
    if (q.isError) toast.error("Couldn't load your chats", { description: errMsg(q.error), action: { label: "Retry", onClick: () => void q.refetch() } });
  }, [q.isError]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeId && !activeId.startsWith("draft-")) localStorage.setItem(LAST, activeId); }, [activeId]);

  const active = useMemo(() => convs.find((c) => c.id === activeId) ?? null, [convs, activeId]);

  /* ----- load full messages when a saved chat is opened ----- */
  useEffect(() => {
    if (!active || active.loaded || active.draft) return;
    const id = active.id;
    api.getConversation(id)
      .then((d) => update(id, (c) => ({ ...c, title: d.title, updatedAt: d.updatedAt, messages: d.messages, files: d.files, loaded: true })))
      .catch((e) => { toast.error("Couldn't open this chat", { description: errMsg(e) }); update(id, (c) => ({ ...c, loaded: true })); });
  }, [active?.id, active?.loaded, active?.draft, update]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [active?.messages]);

  /* ----- drafts: a new chat only exists on the server once it is needed ----- */
  const createDraft = useCallback(() => {
    const c: Conversation = { id: "draft-" + api.newId(), title: "New chat", updatedAt: new Date().toISOString(), messages: [], draft: true, loaded: true };
    setConvs((l) => [c, ...l.filter((x) => !(x.draft && x.messages.length === 0))]);
    setActiveId(c.id);
    return c.id;
  }, []);

  /** Returns the real server id for a conversation, creating it first if it is still a draft. */
  const ensureServer = useCallback((id: string): Promise<string> => {
    if (!id.startsWith("draft-")) return Promise.resolve(id);
    let p = creating.current.get(id);
    if (!p) {
      p = api.createConversation().then((c) => {
        setConvs((l) => l.map((x) => (x.id === id ? { ...x, id: c.id, draft: false, loaded: true } : x)));
        setActiveId((a) => (a === id ? c.id : a));
        return c.id;
      });
      creating.current.set(id, p);
    }
    return p;
  }, []);

  const newChat = useCallback(() => {
    setPending([]); createDraft(); setDrawer(false);
    setTimeout(() => composer.current?.focus(), 50);
  }, [createDraft]);

  const select = (id: string) => { if (id !== activeId) setPending([]); setActiveId(id); setDrawer(false); };

  /* ----- file upload ----- */
  const pickFiles = async (list: FileList) => {
    let count = pending.length;
    const entries: { a: Attachment; f: File }[] = [];
    for (const f of Array.from(list)) {
      const err = validateFile(f, count);
      if (err) { toast.error(err); continue; }
      count++;
      entries.push({ f, a: { id: api.newId(), name: f.name, size: f.size, type: f.type, progress: 0, previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined } });
    }
    if (!entries.length) return;
    const drop = (ids: string[]) => setPending((p) => p.filter((x) => !ids.includes(x.id)));
    setPending((p) => [...p, ...entries.map((e) => e.a)]);
    let realId: string;
    try { realId = await ensureServer(activeId ?? createDraft()); }
    catch (e) { toast.error("Couldn't start a chat", { description: errMsg(e) }); drop(entries.map((x) => x.a.id)); return; }
    await Promise.all(entries.map(async ({ a, f }) => {
      try {
        const rec = await api.uploadFile(realId, f, (pct) => setPending((p) => p.map((x) => (x.id === a.id ? { ...x, progress: Math.min(99, pct) } : x))));
        setPending((p) => p.map((x) => (x.id === a.id ? { ...x, progress: 100, serverId: rec.id } : x)));
      } catch (e) {
        toast.error(`${f.name}: ${errMsg(e)}`);
        drop([a.id]);
      }
    }));
  };

  const removePending = (id: string) => {
    const a = pending.find((x) => x.id === id);
    setPending((p) => p.filter((x) => x.id !== id));
    if (a?.serverId) api.deleteFile(a.serverId).catch(() => undefined);
  };

  const removeFile = (fileId: string) => {
    if (!active) return;
    update(active.id, (c) => ({ ...c, files: (c.files ?? []).filter((f) => f.id !== fileId) }));
    api.deleteFile(fileId).catch((e) => toast.error("Couldn't remove file", { description: errMsg(e) }));
  };

  /* ----- chat ----- */
  const run = async (convId: string, prompt: string, useFiles: boolean) => {
    const tmpId = api.newId();
    update(convId, (c) => ({ ...c, messages: [...c.messages, { id: tmpId, role: "assistant", content: "", createdAt: new Date().toISOString() }] }));
    setStreamingId(tmpId);
    const ctrl = new AbortController(); abort.current = ctrl;
    let acc = "";
    let id = convId;
    let mid = tmpId;
    let done = false;
    const patch = (fn: (m: Message) => Message) => update(id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === mid ? fn(m) : m)) }));
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    const reveal = createReveal((t) => patch((m) => ({ ...m, content: t })), reduceMotion);
    ctrl.signal.addEventListener("abort", () => reveal.flush());
    try {
      id = await ensureServer(convId);
      for await (const ev of api.streamChat(id, prompt, useFiles, firstName, ctrl.signal)) {
        if (ev.type === "token") { acc += ev.text; reveal.push(ev.text); }
        else if (ev.type === "error") throw new Error(ev.message);
        else if (ev.type === "done") {
          done = true;
          await reveal.drain(); // let the last words finish appearing before showing sources
          const newId = ev.messageId || mid;
          patch((m) => ({ ...m, id: newId, content: acc, sources: ev.sources, followUps: ev.suggestions, feedback: null }));
          mid = newId;
          setStreamingId(null); // answer is complete: unlock the input right away
          // The server auto-titles new chats; pick up the saved title.
          api.getConversation(id).then((d) => update(id, (c) => ({ ...c, title: d.title }))).catch(() => undefined);
        } else {
          // Follow-up suggestions arrive after "done".
          patch((m) => ({ ...m, followUps: ev.suggestions }));
        }
      }
      if (!done && !ctrl.signal.aborted) throw new Error("The connection was interrupted before the reply finished.");
    } catch (e) {
      if (done) { setStreamingId((cur) => (cur === tmpId || cur === mid ? null : cur)); return; } // answer already complete; only suggestions were cut off
      const stopped = ctrl.signal.aborted || (e instanceof DOMException && e.name === "AbortError");
      if (stopped) {
        patch((m) => ({ ...m, content: acc || "_Stopped._" }));
      } else {
        if (acc) patch((m) => ({ ...m, content: acc }));
        else update(id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== tmpId) }));
        toast.error("Something went wrong", { description: errMsg(e), action: { label: "Retry", onClick: () => void run(id, prompt, useFiles) } });
      }
    }
    reveal.cancel();
    setStreamingId((cur) => (cur === tmpId || cur === mid ? null : cur));
  };

  const send = (text: string, opts?: { useFiles: boolean }) => {
    const id = activeId ?? createDraft();
    const files = pending.filter((a) => a.progress === 100);
    setPending([]);
    const msg: Message = { id: api.newId(), role: "user", content: text, createdAt: new Date().toISOString(), files: files.length ? files : undefined };
    const title = text.split(/\s+/).slice(0, 6).join(" ").slice(0, 48);
    setConvs((l) => {
      const cur = l.find((c) => c.id === id);
      if (!cur) return l;
      const next: Conversation = { ...cur, title: cur.messages.length ? cur.title : title, updatedAt: msg.createdAt, messages: [...cur.messages, msg], files: [...(cur.files ?? []), ...files.map((f) => ({ ...f, id: f.serverId ?? f.id }))] };
      return [next, ...l.filter((c) => c.id !== id)];
    });
    void run(id, text, opts?.useFiles ?? true);
  };

  const regenerate = () => {
    if (!active) return;
    const lastUser = [...active.messages].reverse().find((m) => m.role === "user"); if (!lastUser) return;
    update(active.id, (c) => ({ ...c, messages: c.messages.slice(0, -1) }));
    void run(active.id, lastUser.content, true);
  };

  const feedback = (mid: string, f: Feedback, reason?: string) => {
    if (!active) return;
    update(active.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === mid ? { ...m, feedback: f } : m)) }));
    if (f) api.sendFeedback(mid, f, reason).catch((e) => toast.error("Couldn't save feedback", { description: errMsg(e) }));
  };

  const rename = (id: string, title: string) => {
    update(id, (c) => ({ ...c, title }));
    if (!id.startsWith("draft-")) api.renameConversation(id, title).catch((e) => toast.error("Couldn't rename chat", { description: errMsg(e) }));
  };

  const remove = (id: string) => {
    setConvs((l) => l.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
    if (!id.startsWith("draft-")) api.deleteConversation(id).then(() => toast("Chat deleted")).catch((e) => { toast.error("Couldn't delete chat", { description: errMsg(e) }); void q.refetch().then((r) => { if (r.data) setConvs(r.data); }); });
  };

  const deleteAll = async () => {
    const ids = convs.filter((c) => !c.draft).map((c) => c.id);
    setSettings(false);
    const results = await Promise.allSettled(ids.map((id) => api.deleteConversation(id)));
    const failed = ids.filter((_, i) => results[i]?.status === "rejected");
    setConvs((l) => l.filter((c) => failed.includes(c.id)));
    setActiveId(null); localStorage.removeItem(LAST);
    if (failed.length) toast.error(`${failed.length} chat(s) couldn't be deleted`); else toast("All chats deleted");
  };

  const resetMemory = () => api.resetMemory()
    .then(() => toast.success("Memory reset", { description: "AURIX has forgotten saved preferences." }))
    .catch((e) => toast.error("Couldn't reset memory", { description: errMsg(e) }));

  const exportMd = () => {
    if (!active) return;
    const md = `# ${active.title}\n\n` + active.messages.map((m) => `**${m.role === "user" ? "You" : "AURIX"}:**\n\n${m.content}`).join("\n\n---\n\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = `${active.title}.md`; a.click();
  };

  const loadingConv = !!active && !active.loaded;
  const empty = !active || (!!active.loaded && active.messages.length === 0);
  const streamingHere = !!streamingId && !!active?.messages.some((m) => m.id === streamingId);

  const sidebar = (
    <Sidebar conversations={convs} activeId={activeId} loading={q.isLoading} newDisabled={!!active && !!active.loaded && active.messages.length === 0}
      onSelect={select} onNew={newChat}
      onRename={rename} onDelete={remove} theme={theme} setTheme={setTheme} onSettings={() => { setDrawer(false); setSettings(true); }} />
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="hidden md:block">{sidebar}</div>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-[280px] max-w-[85vw] border-0 p-0 [&>button]:hidden"><SheetTitle className="sr-only">Chats</SheetTitle>{sidebar}</SheetContent>
      </Sheet>
      <main onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) void pickFiles(e.dataTransfer.files); }}
        className="relative flex min-w-0 flex-1 flex-col bg-chat md:my-2 md:mr-2 md:rounded-2xl md:border md:border-border">
        {dragging && <div className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-background/90 text-sm"><UploadCloud className="size-8 text-accent-text" /><p className="font-medium">Drop files to attach</p><p className="text-muted-foreground">PDF, DOCX, TXT, MD, CSV, XLSX, images · up to 20 MB</p></div>}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <button aria-label="Open chats" className="flex size-9 items-center justify-center rounded-[10px] hover:bg-muted md:hidden" onClick={() => setDrawer(true)}><Menu className="size-5" /></button>
          {active && !empty ? (
            <input aria-label="Chat title" value={active.title} onChange={(e) => update(active.id, (c) => ({ ...c, title: e.target.value }))}
              onBlur={(e) => { const t = e.target.value.trim(); if (t) rename(active.id, t); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="min-w-0 flex-1 truncate rounded-md bg-transparent px-2 py-1 font-display text-lg font-semibold outline-none hover:bg-muted focus:bg-muted" />
          ) : <span className="flex-1 px-2 font-display text-lg font-semibold">New chat</span>}
          <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-success" /> Gemma 4
          </span>
          {active?.files && active.files.length > 0 && (
            <Popover>
              <PopoverTrigger aria-label="Files in this chat" className="flex h-9 items-center gap-1 rounded-[10px] px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                <Paperclip className="size-4" />{active.files.length}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[260px] p-2">
                <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Files in this chat</p>
                <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">{active.files.map((f) => <FileChip key={f.id} f={{ ...f, progress: 100 }} onRemove={() => removeFile(f.id)} />)}</div>
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
          {loadingConv ? (
            <div className="mx-auto flex max-w-[768px] flex-col gap-8 px-4 py-8" aria-label="Loading chat" role="status">
              {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : empty ? (
            <div className="mx-auto flex h-full max-w-[768px] flex-col justify-center px-4 py-8">
              <h1 className="font-display text-[28px] font-bold tracking-normal md:text-[40px]">{firstName ? `Good to see you, ${firstName}.` : "Good to see you."}</h1>
              <p className="mt-2 text-muted-foreground">Ask a question or attach a file — AURIX answers with sources.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {PROMPTS.map(({ icon: Icon, title, desc }) => (
                  <button key={title} onClick={() => send(title, { useFiles: true })} className="btn-lift rounded-2xl border border-border bg-card p-4 text-left hover:bg-muted/50" style={{ boxShadow: "var(--shadow-card)" }}>
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
                  onRegenerate={regenerate} onFeedback={(f, reason) => feedback(m.id, f, reason)} onFollowUp={send} />
              ))}
              <div ref={bottom} />
            </div>
          )}
        </div>
        <div className="shrink-0 px-4 pt-2 pb-4">
          <Composer ref={composer} streaming={streamingHere} files={pending} onPick={(l) => void pickFiles(l)} onRemove={removePending} onSend={send} onStop={() => abort.current?.abort()} />
          <p className="mt-2 text-center text-xs text-muted-foreground">AURIX can make mistakes. Check important info.</p>
        </div>
      </main>
      <CitationPanel data={cite} onClose={() => setCite(null)} />
      <SettingsDialog open={settings} onOpenChange={setSettings} theme={theme} setTheme={setTheme} canExport={!empty} onExport={exportMd}
        onResetMemory={() => void resetMemory()}
        onDeleteAll={() => void deleteAll()} />
    </div>
  );
}
