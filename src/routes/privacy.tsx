import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/chat/Logo";
import { useTheme } from "@/components/chat/useTheme";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — AURIX AI" },
      { name: "description", content: "How AURIX AI collects, uses and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

const UPDATED = "November 20, 2026";

function PrivacyPage() {
  useTheme();
  return (
    <div className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <main className="mx-auto w-full max-w-[720px]">
        <Link to="/login" className="inline-flex items-center gap-2">
          <LogoMark className="size-8" />
          <span className="font-display text-lg font-bold">AURIX AI</span>
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="mb-2 text-lg font-semibold">What AURIX AI is</h2>
            <p>AURIX AI is a chat assistant that answers questions about the documents, spreadsheets and images you upload, and shows the sources it used.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Information we collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Account information.</strong> If you sign in with Google, we receive your name, email address and Google account ID. If you sign up with email, we store your name, email and a securely hashed password. We do not receive your Google password.</li>
              <li><strong>Your content.</strong> Your chat messages, the files you upload, text extracted from those files, and short memory notes the assistant saves to be more helpful in later chats.</li>
              <li><strong>Technical data.</strong> Basic server logs such as request time and errors, used to keep the service working.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">How we use it</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To sign you in and keep your chats and files private to your account.</li>
              <li>To generate answers, citations and suggested follow-up questions.</li>
              <li>To fix bugs and keep the service reliable.</li>
            </ul>
            <p className="mt-2">We do not sell your data and we do not use it for advertising.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Services that process your data</h2>
            <p>To run AURIX AI we use trusted providers. Only what is needed is shared:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Supabase</strong> for authentication and the database that stores your account, chats and files.</li>
              <li><strong>Google (Gemini API) and Groq</strong> to generate AI responses. Your messages and relevant excerpts of your files are sent to them to produce an answer.</li>
              <li><strong>Netlify and Render</strong> to host the website and the server.</li>
              <li><strong>Google Sign-In</strong> to let you log in with your Google account.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Your choices and deletion</h2>
            <p>You can delete your chats and files inside the app. To delete your account and all associated data, contact us at the address below and we will remove it. You can also revoke AURIX AI&apos;s access to your Google account at any time from your Google Account security settings.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Security and retention</h2>
            <p>Data is transmitted over HTTPS and access to each account&apos;s data is restricted to that account. We keep your data until you delete it or ask us to delete your account. No online service can promise absolute security.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Children</h2>
            <p>AURIX AI is not intended for children under 13, and we do not knowingly collect their data.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Changes</h2>
            <p>If we change this policy, we will update the date above.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Contact</h2>
            <p>Questions or deletion requests: <a className="text-link underline underline-offset-2" href="mailto:YOUR_EMAIL@example.com">YOUR_EMAIL@example.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
