// Typed client for the AURIX FastAPI backend.
// VITE_API_URL must include the /api prefix, e.g. https://your-app.onrender.com/api
import { getAccessToken } from "./auth";
import type { Attachment, Conversation, Feedback, Message, Source } from "./types";

const RAW = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000/api";
export const API_URL = RAW.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ---------- raw backend shapes ---------- */
type RawSource = Record<string, unknown>;
type RawMessage = { id: string; role: "user" | "assistant"; content: string; sources?: RawSource[] | null; feedback?: string | null; created_at: string };
type RawFile = { id: string; name: string; mime: string; size: number; created_at: string };
type RawListItem = { id: string; title: string; last_message_preview: string | null; created_at: string; updated_at: string };
type RawDetail = { id: string; title: string; created_at: string; updated_at: string; messages: RawMessage[]; files: RawFile[] };

/* ---------- mappers ---------- */
/** The backend may return naive UTC timestamps; make sure JS reads them as UTC. */
const iso = (s: string) => (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + "Z");
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

export function mapSource(raw: RawSource, i: number): Source {
  const page = raw["page"];
  const row = raw["row"] ?? raw["rows"];
  const location =
    str(raw["location"]) ??
    (page !== undefined && page !== null && page !== "" ? `Page ${String(page)}` : undefined) ??
    (row !== undefined && row !== null ? `Row ${String(row)}` : undefined) ??
    "";
  const rawId = raw["id"] ?? raw["index"];
  return {
    id: typeof rawId === "number" ? rawId : i + 1,
    fileName: str(raw["file_name"]) ?? str(raw["fileName"]) ?? str(raw["filename"]) ?? str(raw["file"]) ?? str(raw["name"]) ?? "Source",
    location,
    excerpt: str(raw["excerpt"]) ?? str(raw["text"]) ?? str(raw["snippet"]) ?? str(raw["content"]) ?? "",
  };
}

const mapFeedback = (f: string | null | undefined): Feedback => (f?.startsWith("up") ? "up" : f?.startsWith("down") ? "down" : null);

const mapMessage = (m: RawMessage): Message => ({
  id: m.id,
  role: m.role,
  content: m.content,
  createdAt: iso(m.created_at),
  sources: (m.sources ?? []).map(mapSource),
  feedback: mapFeedback(m.feedback),
});

export const mapFile = (f: RawFile): Attachment => ({
  id: f.id, serverId: f.id, name: f.name, size: f.size, type: f.mime, progress: 100,
});

/* ---------- transport ---------- */
async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new ApiError("You're signed out. Please sign in again.", 401);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(API_URL + path, { ...init, headers });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError("Can't reach the AURIX server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    let detail = res.statusText || `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { detail?: unknown; message?: unknown };
      if (typeof j.detail === "string") detail = j.detail;
      else if (Array.isArray(j.detail)) detail = j.detail.map((d: { msg?: string }) => d.msg ?? "").filter(Boolean).join("; ") || detail;
      else if (typeof j.message === "string") detail = j.message;
    } catch { /* body was not JSON */ }
    if (res.status === 429) detail = "You're sending messages too quickly. Please wait a moment.";
    throw new ApiError(detail, res.status);
  }
  return res;
}

const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export type ChatEvent =
  | { type: "token"; text: string }
  | { type: "done"; messageId: string; sources: Source[]; suggestions: string[] }
  | { type: "suggestions"; suggestions: string[] }
  | { type: "error"; message: string };

function parseEvent(p: Record<string, unknown>): ChatEvent | null {
  switch (p["type"]) {
    case "token": return { type: "token", text: typeof p["text"] === "string" ? p["text"] : "" };
    case "done": return {
      type: "done",
      messageId: String(p["message_id"] ?? ""),
      sources: Array.isArray(p["sources"]) ? (p["sources"] as RawSource[]).map(mapSource) : [],
      suggestions: Array.isArray(p["suggestions"]) ? (p["suggestions"] as unknown[]).filter((s): s is string => typeof s === "string") : [],
    };
    case "suggestions": return {
      type: "suggestions",
      suggestions: Array.isArray(p["suggestions"]) ? (p["suggestions"] as unknown[]).filter((x): x is string => typeof x === "string") : [],
    };
    case "error": return { type: "error", message: typeof p["message"] === "string" ? p["message"] : "Something went wrong." };
    default: return null;
  }
}

export const api = {
  newId: () => Math.random().toString(36).slice(2, 10),

  async listConversations(): Promise<Conversation[]> {
    const rows = (await (await request("/conversations")).json()) as RawListItem[];
    return rows.map((r) => ({
      id: r.id, title: r.title, updatedAt: iso(r.updated_at), messages: [], preview: r.last_message_preview ?? undefined, loaded: false,
    }));
  },

  async createConversation(): Promise<{ id: string; title: string; updatedAt: string }> {
    const r = (await (await request("/conversations", { method: "POST" })).json()) as { id: string; title: string; updated_at: string };
    return { id: r.id, title: r.title, updatedAt: iso(r.updated_at) };
  },

  async getConversation(id: string): Promise<Conversation> {
    const d = (await (await request(`/conversations/${id}`)).json()) as RawDetail;
    return { id: d.id, title: d.title, updatedAt: iso(d.updated_at), messages: d.messages.map(mapMessage), files: d.files.map(mapFile), loaded: true };
  },

  async renameConversation(id: string, title: string): Promise<void> {
    await request(`/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
  },

  async deleteConversation(id: string): Promise<void> {
    await request(`/conversations/${id}`, { method: "DELETE" });
  },

  /** Uploads one file with progress (0-100 = bytes sent). Resolves with the stored file. */
  async uploadFile(conversationId: string, file: File, onProgress: (pct: number) => void): Promise<Attachment> {
    const token = await getAccessToken();
    if (!token) throw new ApiError("You're signed out. Please sign in again.", 401);
    return new Promise<Attachment>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/conversations/${conversationId}/files`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onerror = () => reject(new ApiError("Can't reach the AURIX server. Check your connection and try again.", 0));
      xhr.onload = () => {
        let body: unknown = null;
        try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
        if (xhr.status >= 200 && xhr.status < 300 && Array.isArray(body) && body[0]) return resolve(mapFile(body[0] as RawFile));
        const detail = (body as { detail?: unknown } | null)?.detail;
        reject(new ApiError(typeof detail === "string" ? detail : `Upload failed (${xhr.status})`, xhr.status));
      };
      const form = new FormData();
      form.append("files", file, file.name);
      xhr.send(form);
    });
  },

  async deleteFile(id: string): Promise<void> {
    await request(`/files/${id}`, { method: "DELETE" });
  },

  /** Streams the assistant reply as parsed SSE events. */
  async *streamChat(conversationId: string, message: string, useFiles: boolean, userName: string, signal: AbortSignal, part?: string): AsyncGenerator<ChatEvent> {
    const body: Record<string, unknown> = { message, use_files: useFiles };
    if (userName) body.user_name = userName;
    if (part) body.part_of_day = part;
    const res = await request(`/conversations/${conversationId}/chat`, { ...json(body), signal });
    if (!res.body) throw new ApiError("The server sent an empty response.", 0);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let at: number;
      while ((at = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, at);
        buf = buf.slice(at + 2);
        const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
        if (!data || data === "[DONE]") continue;
        try {
          const ev = parseEvent(JSON.parse(data) as Record<string, unknown>);
          if (ev) yield ev;
        } catch { /* ignore malformed event */ }
      }
    }
  },

  async sendFeedback(messageId: string, value: "up" | "down", reason?: string): Promise<void> {
    await request(`/messages/${messageId}/feedback`, json(reason ? { value, reason } : { value }));
  },

  async resetMemory(): Promise<void> {
    await request("/memories", { method: "DELETE" });
  },
};
