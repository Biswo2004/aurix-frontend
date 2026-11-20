import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOAuth: (...a: unknown[]) => signInWithOAuth(...a) } },
}));

import { readOAuthError, signInWithGoogle } from "./auth";

describe("signInWithGoogle", () => {
  beforeEach(() => signInWithOAuth.mockReset());

  it("asks Supabase for Google and returns to this site's origin", async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    const r = await signInWithGoogle();
    expect(r.error).toBeNull();
    const arg = signInWithOAuth.mock.calls[0]![0];
    expect(arg.provider).toBe("google");
    expect(arg.options.redirectTo).toBe(`${window.location.origin}/`);
  });

  it("returns the Supabase error message", async () => {
    signInWithOAuth.mockResolvedValue({ error: { message: "Unsupported provider: provider is not enabled" } });
    const r = await signInWithGoogle();
    expect(r.error).toMatch(/not enabled/);
  });
});

describe("readOAuthError", () => {
  it("reads an error from the query string", () => {
    expect(readOAuthError({ search: "?error=access_denied&error_description=Access+denied", hash: "" })).toBe("Access denied");
  });
  it("reads an error from the hash", () => {
    expect(readOAuthError({ search: "", hash: "#error=server_error&error_description=bad+thing" })).toBe("bad thing");
  });
  it("returns null when there is none", () => {
    expect(readOAuthError({ search: "", hash: "#access_token=abc" })).toBeNull();
  });
});
