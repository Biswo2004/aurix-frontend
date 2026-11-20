import { useMemo, useState } from "react";
import { LogOut, MoreHorizontal, Monitor, Moon, Pencil, Plus, Search, Settings, Sun, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types";
import { displayName, initials, signOut, useSession } from "@/lib/auth";
import { LogoMark } from "./Logo";
import type { Theme } from "./useTheme";

function group(c: Conversation) {
  const d = new Date(c.updatedAt); const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= start) return "Today";
  if (t >= start - 86400_000) return "Yesterday";
  if (t >= start - 7 * 86400_000) return "Previous 7 days";
  return "Older";
}
const ORDER = ["Today", "Yesterday", "Previous 7 days", "Older"];

type Props = {
  conversations: Conversation[]; activeId: string | null; loading: boolean; newDisabled: boolean;
  onSelect: (id: string) => void; onNew: () => void; onRename: (id: string, t: string) => void; onDelete: (id: string) => void;
  theme: Theme; setTheme: (t: Theme) => void; onSettings: () => void;
};

export function Sidebar(p: Props) {
  const { user } = useSession();
  const name = displayName(user);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const groups = useMemo(() => {
    const f = p.conversations.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
    const m = new Map<string, Conversation[]>();
    f.forEach((c) => { const g = group(c); m.set(g, [...(m.get(g) ?? []), c]); });
    return ORDER.filter((g) => m.has(g)).map((g) => [g, m.get(g)!] as const);
  }, [p.conversations, q]);
  const nextTheme: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
  const ThemeIcon = p.theme === "light" ? Sun : p.theme === "dark" ? Moon : Monitor;

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 pt-4 pb-4">
        <LogoMark />
        <span className="font-display text-[15px] font-bold tracking-tight">AURIX AI</span>
      </div>
      <div className="px-4">
        <button onClick={p.onNew} disabled={p.newDisabled}
          className="btn-lift flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="size-4" /> New Chat
        </button>
        <label className="relative mt-4 block">
          <span className="sr-only">Search conversations</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats"
            className="h-10 w-full rounded-[10px] border border-sidebar-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
      </div>
      <nav aria-label="Conversation history" className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
        {p.loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="mx-2 mb-2 h-12 animate-pulse rounded-lg bg-sidebar-accent" />)}
        {!p.loading && groups.length === 0 && <p className="px-3 text-sm text-muted-foreground">No chats found.</p>}
        {groups.map(([g, items]) => (
          <div key={g} className="mb-4">
            <h3 className="px-3 pb-1 font-sans text-xs font-medium text-muted-foreground">{g}</h3>
            <ul>
              {items.map((c) => {
                const preview = c.messages[c.messages.length - 1]?.content.replace(/[#*`|\n>-]+/g, " ").trim() ?? "Empty chat";
                const active = c.id === p.activeId;
                return (
                  <li key={c.id} className="group relative">
                    {editing === c.id ? (
                      <input autoFocus defaultValue={c.title} aria-label="Rename chat"
                        onBlur={(e) => { p.onRename(c.id, e.target.value.trim() || c.title); setEditing(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditing(null); }}
                        className="h-14 w-full rounded-lg border border-ring bg-background px-3 text-sm outline-none" />
                    ) : (
                      <button onClick={() => p.onSelect(c.id)} aria-current={active ? "page" : undefined}
                        className={cn("flex w-full flex-col rounded-lg px-3 py-2 pr-9 text-left transition-colors duration-150",
                          active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60")}>
                        <span className="truncate text-sm font-medium">{c.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{preview || "Empty chat"}</span>
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={`Options for ${c.title}`}
                        className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100">
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(c.id)}><Pencil className="size-4" /> Rename</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => p.onDelete(c.id)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2 border-t border-sidebar-border p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">{initials(name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name || "Account"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email ?? "Personal workspace"}</p>
        </div>
        <button aria-label={`Theme: ${p.theme}. Switch theme`} onClick={() => p.setTheme(nextTheme[p.theme])}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><ThemeIcon className="size-4" /></button>
        <button aria-label="Settings" onClick={p.onSettings} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><Settings className="size-4" /></button>
        <button aria-label="Sign out" title="Sign out" onClick={() => { void signOut(); }}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><LogOut className="size-4" /></button>
      </div>
    </aside>
  );
}
