import { NextResponse, type NextRequest } from "next/server";

import {
  checkPassword,
  createSessionToken,
  isAuthConfigured,
  safeNextPath,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";

/** POST form { password, next } → sets the session cookie and redirects. */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const password = String(form.get("password") ?? "");
    const next = safeNextPath(form.get("next"));

    if (!isAuthConfigured()) {
      return redirectToLogin(request, next, "config");
    }

    if (!(await checkPassword(password))) {
      // Small fixed delay to slow down guessing.
      await new Promise((r) => setTimeout(r, 400));
      return redirectToLogin(request, next, "invalid");
    }

    const response = NextResponse.redirect(new URL(next, request.url), 303);
    response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("[api/auth] login failed", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

/** DELETE → clears the session (sign out). */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

function redirectToLogin(request: NextRequest, next: string, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url, 303);
}
