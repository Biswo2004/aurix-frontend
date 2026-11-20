import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/chat/Logo";
import { useTheme } from "@/components/chat/useTheme";
import { readOAuthError, signInWithGoogle, signInWithPassword, signUpWithPassword, useSession } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — AURIX AI" },
      { name: "description", content: "Sign in to AURIX AI to ask questions about your files." },
    ],
  }),
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

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

  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  // Show a Google/Supabase error that came back in the URL, then tidy the address bar.
  useEffect(() => {
    const err = readOAuthError(window.location);
    if (err) {
      setError(`Google sign-in failed: ${err}`);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function onGoogle() {
    setError(null);
    setInfo(null);
    setGoogleBusy(true);
    try {
      const r = await signInWithGoogle();
      if (r.error) {
        setError(r.error);
        setGoogleBusy(false);
      } // on success the browser navigates to Google, so keep the spinner
    } catch {
      setError("Could not start Google sign-in. Check your connection and try again.");
      setGoogleBusy(false);
    }
  }

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

        <button type="button" onClick={onGoogle} disabled={googleBusy || busy}
          className="btn-lift mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-control-border bg-card text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
          {googleBusy ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
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
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
