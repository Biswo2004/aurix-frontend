import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/chat/Logo";
import { useTheme } from "@/components/chat/useTheme";
import { signInWithPassword, signUpWithPassword, useSession } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — AURIX AI" },
      { name: "description", content: "Sign in to AURIX AI to ask questions about your files." },
    ],
  }),
  component: LoginPage,
});

const field =
  "h-11 w-full rounded-[10px] border border-control-border bg-input px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

function LoginPage() {
  useTheme(); // applies the saved light/dark class on this page too
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === "signup" && !name.trim()) return setError("Please enter your name.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setBusy(true);
    try {
      if (mode === "signin") {
        const r = await signInWithPassword(email.trim(), password);
        if (r.error) setError(r.error);
      } else {
        const r = await signUpWithPassword(name.trim(), email.trim(), password);
        if (r.error) setError(r.error);
        else if (r.needsConfirmation) {
          setInfo("Account created. Check your email and click the confirmation link, then sign in.");
          setMode("signin");
          setPassword("");
        }
      }
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const signup = mode === "signup";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2">
          <LogoMark className="size-9" />
          <span className="font-display text-lg font-bold">AURIX AI</span>
        </div>
        <h1 className="mt-6 font-display text-[28px] font-bold leading-tight">{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {signup ? "Start asking questions about your files." : "Sign in to continue to your chats."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          {signup && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Name</span>
              <input className={field} type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input className={field} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Password</span>
            <input className={field} type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </label>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {info && <p role="status" className="text-sm text-success">{info}</p>}

          <button type="submit" disabled={busy}
            className="btn-lift flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {signup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {signup ? "Already have an account?" : "New to AURIX AI?"}{" "}
          <button type="button" className="font-medium text-link underline underline-offset-2"
            onClick={() => { setMode(signup ? "signin" : "signup"); setError(null); setInfo(null); }}>
            {signup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
