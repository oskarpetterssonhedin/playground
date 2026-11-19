import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAuthConfigured, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const CONFIG_ERROR = "SITE_PASSWORD or AUTH_SECRET is not set on the server.";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  // Config is checked live (not from the URL) so a stale ?error=config link
  // doesn't keep showing the message after the env vars are added.
  const error = !isAuthConfigured()
    ? CONFIG_ERROR
    : params.error === "invalid"
      ? "Wrong password."
      : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form action="/api/auth" method="post" className="w-full max-w-xs space-y-4">
        <h1 className="text-lg font-semibold">Playground</h1>
        <input type="hidden" name="next" value={next} />
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            className="h-11"
            aria-invalid={error ? true : undefined}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="h-11 w-full">
          Sign in
        </Button>
      </form>
    </main>
  );
}
