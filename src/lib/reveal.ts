/**
 * Smooth word-by-word reveal of streamed text.
 * The model often delivers text in big bursts; this queues it and shows it a few words at a time.
 * The queue speeds up when it falls behind, so the lag stays short.
 */
export type Reveal = {
  push: (text: string) => void;
  drain: () => Promise<void>;
  flush: () => void;
  cancel: () => void;
};

const TICK_MS = 30;
const CATCH_UP = 40; // larger backlog => more words per tick

export function createReveal(onText: (full: string) => void, instant = false): Reveal {
  let shown = "";
  let carry = "";
  let queue: string[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let waiters: Array<() => void> = [];

  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  const settle = () => { const w = waiters; waiters = []; w.forEach((r) => r()); };
  const tick = () => {
    if (queue.length === 0) { stop(); settle(); return; }
    const n = Math.min(queue.length, Math.max(1, Math.ceil(queue.length / CATCH_UP)));
    shown += queue.splice(0, n).join("");
    onText(shown);
    if (queue.length === 0) { stop(); settle(); }
  };
  const start = () => { if (!timer) timer = setInterval(tick, TICK_MS); };

  return {
    push(text) {
      if (!text) return;
      if (instant) { shown += text; onText(shown); return; }
      const buf = carry + text;
      const re = /\s*\S+\s+/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(buf)) !== null) { queue.push(m[0]); last = re.lastIndex; }
      carry = buf.slice(last);
      if (queue.length) start();
    },
    drain() {
      if (carry) { queue.push(carry); carry = ""; }
      if (queue.length === 0) return Promise.resolve();
      start();
      return new Promise<void>((resolve) => { waiters.push(resolve); });
    },
    flush() {
      stop();
      const rest = queue.join("") + carry;
      queue = []; carry = "";
      if (rest) { shown += rest; onText(shown); }
      settle();
    },
    cancel() { stop(); queue = []; carry = ""; settle(); },
  };
}
