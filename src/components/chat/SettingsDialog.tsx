import { useState } from "react";
import { Download, Monitor, Moon, RotateCcw, Sun, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Theme } from "./useTheme";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; theme: Theme; setTheme: (t: Theme) => void;
  canExport: boolean; onExport: () => void; onResetMemory: () => void; onDeleteAll: () => void };

const row = "flex items-center justify-between gap-4 py-4";
const btn = "btn-lift inline-flex h-10 items-center gap-2 rounded-[10px] border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40";

export function SettingsDialog(p: Props) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Dialog open={p.open} onOpenChange={(o) => { setConfirm(false); p.onOpenChange(o); }}>
      <DialogContent className="rounded-2xl sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display">Settings</DialogTitle>
          <DialogDescription>Appearance, memory and your chat data.</DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <div className={row}>
            <div><p className="text-sm font-medium">Theme</p><p className="text-xs text-muted-foreground">Light, dark or match your device</p></div>
            <div role="radiogroup" aria-label="Theme" className="flex rounded-[10px] border border-border p-1">
              {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([t, I]) => (
                <button key={t} role="radio" aria-checked={p.theme === t} aria-label={t} onClick={() => p.setTheme(t)}
                  className={cn("flex size-8 items-center justify-center rounded-md text-muted-foreground", p.theme === t && "bg-primary text-primary-foreground")}><I className="size-4" /></button>
              ))}
            </div>
          </div>
          <div className={row}>
            <div><p className="text-sm font-medium">Reset memory</p><p className="text-xs text-muted-foreground">Forget what AURIX remembers about you</p></div>
            <button className={btn} onClick={p.onResetMemory}><RotateCcw className="size-4" /> Reset</button>
          </div>
          <div className={row}>
            <div><p className="text-sm font-medium">Export chat</p><p className="text-xs text-muted-foreground">Download the current chat as Markdown</p></div>
            <button className={btn} disabled={!p.canExport} onClick={p.onExport}><Download className="size-4" /> Export</button>
          </div>
          <div className={row}>
            <div><p className="text-sm font-medium">Delete all chats</p><p className="text-xs text-muted-foreground">This can't be undone</p></div>
            {confirm ? (
              <button className={cn(btn, "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90")} onClick={p.onDeleteAll}><Trash2 className="size-4" /> Confirm</button>
            ) : <button className={cn(btn, "text-destructive")} onClick={() => setConfirm(true)}><Trash2 className="size-4" /> Delete all</button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
