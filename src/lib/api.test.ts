import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({ getAccessToken: async () => "test-token" }));
import { api, mapSource } from "./api";

function sse(chunks: string[], status = 200) {
  const enc = new TextEncoder();
  const body = new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(enc.encode(x))); c.close(); } });
  return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("parses token and done events, even when split across chunks", async () => {
    const fetchMock = vi.fn(async () => sse([
      'data: {"type":"token","text":"Hel"}\n\ndata: {"type":"tok',
      'en","text":"lo"}\n\n',
      'data: {"type":"done","message_id":"m1","sources":[{"file_name":"a.pdf","page":3,"text":"excerpt"}],"suggestions":[]}\n\n',
      'data: {"type":"suggestions","suggestions":["Why?"]}\n\n',
    ]));
    vi.stubGlobal("fetch", fetchMock);
    const events = [];
    for await (const e of api.streamChat("c1", "hi", true, "Biswojit", new AbortController().signal)) events.push(e);
    expect(events.map((e) => e.type)).toEqual(["token", "token", "done", "suggestions"]);
    const done = events[2];
    expect(done).toMatchObject({ type: "done", messageId: "m1" });
    expect(events[3]).toEqual({ type: "suggestions", suggestions: ["Why?"] });
    expect(done && done.type === "done" && done.sources[0]).toEqual({ id: 1, fileName: "a.pdf", location: "Page 3", excerpt: "excerpt" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/conversations\/c1\/chat$/);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token");
    expect(JSON.parse(init.body as string)).toEqual({ message: "hi", use_files: true, user_name: "Biswojit" });
  });

  it("surfaces SSE error events", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sse(['data: {"type":"error","message":"Quota hit"}\n\n'])));
    const events = [];
    for await (const e of api.streamChat("c1", "hi", false, "", new AbortController().signal)) events.push(e);
    expect(events).toEqual([{ type: "error", message: "Quota hit" }]);
  });

  it("sends the part of day only when given", async () => {
    const fetchMock = vi.fn(async () => sse(['data: {"type":"done","message_id":"m1","sources":[],"suggestions":[]}\n\n']));
    vi.stubGlobal("fetch", fetchMock);
    for await (const _ of api.streamChat("c1", "hi", true, "Sam", new AbortController().signal, "evening")) void _;
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ message: "hi", use_files: true, user_name: "Sam", part_of_day: "evening" });
  });

  it("turns HTTP errors into ApiError with the backend detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "Conversation not found" }), { status: 404 })));
    await expect(api.getConversation("x")).rejects.toMatchObject({ status: 404, message: "Conversation not found" });
  });

  it("maps conversation detail and treats naive timestamps as UTC", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      id: "c1", title: "T", created_at: "2026-01-01T00:00:00", updated_at: "2026-01-01T00:00:00",
      messages: [{ id: "m", role: "assistant", content: "x", sources: null, feedback: "down: Incorrect", created_at: "2026-01-01T00:00:00" }],
      files: [{ id: "f", name: "a.csv", mime: "text/csv", size: 5, created_at: "2026-01-01T00:00:00" }],
    }), { status: 200 })));
    const c = await api.getConversation("c1");
    expect(c.updatedAt).toBe("2026-01-01T00:00:00Z");
    expect(c.messages[0]).toMatchObject({ feedback: "down", sources: [] });
    expect(c.files?.[0]).toMatchObject({ serverId: "f", progress: 100 });
  });

  it("maps odd source shapes defensively", () => {
    expect(mapSource({ filename: "b.csv", row: 12, snippet: "s" }, 4)).toEqual({ id: 5, fileName: "b.csv", location: "Row 12", excerpt: "s" });
  });
});
