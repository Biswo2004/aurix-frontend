import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAccessToken: async () => "tok",
  useSession: () => ({ user: { id: "u", email: "biswojit@x.com", user_metadata: { full_name: "Biswojit Bal" } }, session: {}, loading: false }),
  displayName: () => "Biswojit Bal",
  initials: () => "BB",
  signOut: async () => undefined,
}));

import { ChatApp } from "./ChatApp";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const enc = new TextEncoder();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** An SSE response that delivers each frame after its delay, like the real server. */
function timedSse(frames: Array<[number, string]>) {
  const body = new ReadableStream({
    async start(c) {
      for (const [ms, f] of frames) { await sleep(ms); c.enqueue(enc.encode(f)); }
      c.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}
/** Polls until `check` stops throwing, letting React flush between tries. */
async function until(check: () => void, timeout = 8000) {
  const end = Date.now() + timeout;
  for (;;) {
    try { check(); return; } catch (e) { if (Date.now() > end) throw e; }
    await act(async () => { await sleep(40); });
  }
}
const bodyText = () => document.body.textContent ?? "";
const buttons = (label: string) => Array.from(document.querySelectorAll("button")).filter((b) => b.textContent === label);

const ev = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

const WORDS = "Photosynthesis converts light into chemical energy 【4†L1-L5】 and stores it as sugar [1] in the leaves. ".repeat(4).split(" ");

describe("live stream in ChatApp", () => {
  beforeEach(() => { localStorage.clear(); document.body.innerHTML = ""; Element.prototype.scrollIntoView = () => {}; });
  afterEach(() => vi.unstubAllGlobals());

  it("shows page sources, clickable [n] and follow-up chips right after the live reply, with no refresh", async () => {
    const frames: Array<[number, string]> = WORDS.map((w) => [5, ev({ type: "token", text: w + " " })]);
    frames.push([20, ev({ type: "done", message_id: "m-real", sources: [{ index: 1, file_id: "f", file_name: "paper.pdf", page: 68, snippet: "excerpt text" }], suggestions: [] })]);
    frames.push([800, ev({ type: "suggestions", suggestions: ["Explain more", "Give an example", "What next"] })]);

    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push(`${method} ${url}`);
      if (url.endsWith("/conversations") && method === "GET") return new Response("[]");
      if (url.endsWith("/conversations") && method === "POST") return new Response(JSON.stringify({ id: "c1", title: "New chat", created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00" }));
      if (url.endsWith("/chat")) return timedSse(frames);
      if (url.endsWith("/conversations/c1")) return new Response(JSON.stringify({ id: "c1", title: "Photosynthesis", created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00", messages: [], files: [] }));
      return new Response("{}", { status: 404 });
    }));

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(<QueryClientProvider client={qc}><ChatApp /></QueryClientProvider>); });

    await until(() => expect(document.getElementById("composer")).not.toBeNull());
    await act(async () => { await sleep(400); }); // let the chat list finish loading, as it does in real use
    const box = document.getElementById("composer") as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(box, "explain photosynthesis");
      box.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => { box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });

    await until(() => expect(bodyText()).toContain("Photosynthesis converts"), 5000);
    // Sources chip with the page, clickable [1], and follow-up chips must appear without any refresh.
    await until(() => expect(bodyText()).toContain("Page 68"), 10000);
    await until(() => expect(bodyText()).toContain("Explain more"), 10000);
    expect(buttons("[1]").length).toBeGreaterThan(0);
    expect(bodyText()).toContain("Give an example");
    expect(bodyText()).toContain("What next");
    expect(bodyText()).not.toContain("【"); // gpt-oss style markers are cleaned up, also in the sidebar preview
    await act(async () => { root.unmount(); });
  }, 20000);
});
