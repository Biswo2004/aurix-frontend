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
};
export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};
