export type Role = "user" | "assistant";
export type Source = { id: number; fileName: string; location: string; excerpt: string };
export type Feedback = "up" | "down" | null;
export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  sources?: Source[];
  followUps?: string[];
  feedback?: Feedback;
  files?: Attachment[] | undefined;
};
export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
  files?: Attachment[] | undefined;
  /** One-line preview from the server list (used until the full chat is loaded). */
  preview?: string | undefined;
  /** True while the chat only exists in the browser (not yet created on the server). */
  draft?: boolean | undefined;
  /** True once the full message list has been fetched from the server. */
  loaded?: boolean | undefined;
};
export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  previewUrl?: string | undefined;
  error?: string;
  /** File id on the backend once the upload has finished. */
  serverId?: string | undefined;
};
