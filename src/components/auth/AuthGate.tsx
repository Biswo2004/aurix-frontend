import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";
import { LogoMark } from "@/components/chat/Logo";

/** Renders children only for signed-in users; everyone else is sent to /login. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-foreground" role="status" aria-label="Loading">
        <LogoMark className="size-10 animate-pulse" />
      </div>
    );
  }
  return <>{children}</>;
}
