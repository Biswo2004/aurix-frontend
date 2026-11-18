import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/ChatApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURIX AI — Ask your files anything" },
      { name: "description", content: "AURIX AI is a focused assistant that answers questions about your documents, spreadsheets and images, with sources." },
      { property: "og:title", content: "AURIX AI — Ask your files anything" },
      { property: "og:description", content: "Upload documents and get clear, sourced answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatApp,
});
