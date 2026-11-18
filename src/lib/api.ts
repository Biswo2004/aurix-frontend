// Single typed API client. Everything returns mock data for now;
// swap the bodies for fetch(`${API_URL}/...`) when the backend is ready.
import type { Conversation, Message, Source } from "./types";

export const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const SAMPLE_SOURCES: Source[] = [
  { id: 1, fileName: "Q3-Board-Report.pdf", location: "Page 4", excerpt: "Net revenue grew 18% quarter-over-quarter, driven primarily by enterprise expansion in EMEA." },
  { id: 2, fileName: "Q3-Board-Report.pdf", location: "Page 11", excerpt: "Gross margin held at 72%, with infrastructure spend flat despite a 30% rise in usage." },
  { id: 3, fileName: "pipeline.csv", location: "Rows 120–184", excerpt: "Late-stage pipeline: 41 deals, $6.2M weighted value, median cycle 54 days." },
];

const seed: Conversation[] = [
  {
    id: "c1", title: "Q3 board report summary", updatedAt: hoursAgo(1),
    messages: [
      { id: "m1", role: "user", content: "Summarize the key financial takeaways from the Q3 board report.", createdAt: hoursAgo(1) },
      {
        id: "m2", role: "assistant", createdAt: hoursAgo(1), sources: SAMPLE_SOURCES, feedback: null,
        followUps: ["Compare with Q2 numbers", "What drove EMEA growth?", "Draft an exec email"],
        content: `Here are the main takeaways from the Q3 report:

## Headline numbers
- **Revenue** grew **18% QoQ**, led by enterprise expansion in EMEA [1].
- **Gross margin** stayed steady at **72%** while usage rose 30% [2].
- **Pipeline** shows 41 late-stage deals worth **$6.2M** weighted [3].

| Metric | Q3 | Change |
|---|---|---|
| Revenue | $14.8M | +18% |
| Gross margin | 72% | flat |
| Late-stage deals | 41 | +9 |

A quick way to reproduce the growth figure:

\`\`\`python
q2, q3 = 12.54, 14.8
growth = (q3 - q2) / q2
print(f"QoQ growth: {growth:.1%}")
\`\`\``,
      },
    ],
  },
  { id: "c2", title: "Customer churn analysis", updatedAt: hoursAgo(26), messages: [
    { id: "m3", role: "user", content: "Which segments churned the most last quarter?", createdAt: hoursAgo(26) },
    { id: "m4", role: "assistant", content: "SMB accounts on monthly plans churned the most (**6.4%**), followed by self-serve teams under 5 seats (**4.1%**). Enterprise churn was below 1%.", createdAt: hoursAgo(26), followUps: ["Why did SMB churn?", "Suggest retention plays", "Show by region"] },
  ] },
  { id: "c3", title: "Contract clause review", updatedAt: hoursAgo(80), messages: [
    { id: "m5", role: "user", content: "Flag any unusual clauses in the MSA.", createdAt: hoursAgo(80) },
    { id: "m6", role: "assistant", content: "Two clauses stand out: an **uncapped indemnity** in §9.2 and an **auto-renewal with 90-day notice** in §14.1. Both are worth negotiating.", createdAt: hoursAgo(80) },
  ] },
  { id: "c4", title: "Onboarding email drafts", updatedAt: hoursAgo(150), messages: [
    { id: "m7", role: "user", content: "Write a 3-step onboarding email sequence.", createdAt: hoursAgo(150) },
    { id: "m8", role: "assistant", content: "**Email 1 — Welcome:** set up your workspace in 2 minutes.\n\n**Email 2 — First win:** upload a file and ask a question.\n\n**Email 3 — Go further:** invite your team.", createdAt: hoursAgo(150) },
  ] },
];

const KEY = "aurix.conversations";
function load(): Conversation[] {
  if (typeof window === "undefined") return seed;
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : seed; } catch { return seed; }
}
function save(list: Conversation[]) { localStorage.setItem(KEY, JSON.stringify(list)); }

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async listConversations(): Promise<Conversation[]> {
    await delay(300);
    return load().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async saveConversations(list: Conversation[]): Promise<void> { save(list); },
  newId: uid,
  /** Streams a mock assistant reply token by token. */
  async *streamReply(prompt: string, signal: AbortSignal): AsyncGenerator<string, Omit<Message, "content">> {
    const text = `Good question. Based on what you've shared, here's a short answer to **"${prompt.slice(0, 60)}"**:\n\n- The main point is summarized clearly first.\n- Supporting detail comes from your files [1].\n- Anything uncertain is flagged so you can verify it.\n\nOnce the real backend is connected, this reply will come from your documents.`;
    const tokens = text.match(/\S+\s*/g) ?? [];
    await delay(500);
    for (const t of tokens) {
      if (signal.aborted) break;
      await delay(28);
      yield t;
    }
    return {
      id: uid(), role: "assistant", createdAt: new Date().toISOString(), feedback: null,
      sources: [SAMPLE_SOURCES[0]],
      followUps: ["Go deeper on this", "Give me an example", "Summarize in one line"],
    };
  },
};
