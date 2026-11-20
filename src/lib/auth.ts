import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Current Supabase access token (JWT), or null when signed out. Refreshes it if expired. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Tracks the Supabase session. `loading` is true until the stored session has been read. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function displayName(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return meta?.full_name?.trim() || meta?.name?.trim() || user.email?.split("@")[0] || "User";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

export type AuthResult = { error: string | null; needsConfirmation?: boolean };

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? error.message : null };
}

export async function signUpWithPassword(name: string, email: string, password: string): Promise<AuthResult> {
  const options: { data: { full_name: string }; emailRedirectTo?: string } = { data: { full_name: name } };
  if (typeof window !== "undefined") options.emailRedirectTo = window.location.origin;
  const { data, error } = await supabase.auth.signUp({ email, password, options });
  if (error) return { error: error.message };
  // With "Confirm email" enabled in Supabase there is no session until the link is clicked.
  return { error: null, needsConfirmation: !data.session };
}

/**
 * Starts Google sign-in. The browser leaves for Google, then Supabase sends it back to
 * `redirectTo` (this site's own origin, so it works on localhost, Netlify and Lovable alike).
 * That URL must be in Supabase > Authentication > URL Configuration > Redirect URLs.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (typeof window === "undefined") return { error: "Google sign-in needs a browser." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: { prompt: "select_account" }, // always let the user pick the Google account
    },
  });
  return { error: error ? error.message : null };
}

/** Reads an OAuth failure Supabase appended to the URL (query or hash) after the round trip. */
export function readOAuthError(loc: { search: string; hash: string }): string | null {
  const params = new URLSearchParams(loc.search);
  const hash = new URLSearchParams(loc.hash.replace(/^#/, ""));
  const desc = params.get("error_description") ?? hash.get("error_description");
  const code = params.get("error") ?? hash.get("error");
  if (!desc && !code) return null;
  return (desc ?? code ?? "").replace(/\+/g, " ");
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
