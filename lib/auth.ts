/**
 * Password gate. Edge/Node-agnostic (Web Crypto only) so it runs in proxy.ts
 * and route handlers alike.
 *
 * Session cookie value: `<expiresAtMs>.<base64url HMAC-SHA256>` signed with
 * AUTH_SECRET over the expiry plus a fingerprint of SITE_PASSWORD, so changing
 * either env var invalidates every existing session.
 */
export const SESSION_COOKIE = "pg_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

/**
 * The gate runs only in production builds. The thumbnail script sets
 * THUMBNAIL_CAPTURE=1 on a local production server to bypass it; the bypass is
 * ignored on Vercel even if someone sets the variable there by mistake.
 */
export function isGateEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const captureBypass = process.env.THUMBNAIL_CAPTURE === "1" && !process.env.VERCEL;
  return !captureBypass;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.SITE_PASSWORD && process.env.AUTH_SECRET);
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function payload(expiresAt: number): Uint8Array<ArrayBuffer> {
  return encoder.encode(`v1:${expiresAt}:${process.env.SITE_PASSWORD ?? ""}`);
}

/** Constant-time password check (compares HMACs via crypto.subtle.verify). */
export async function checkPassword(input: string): Promise<boolean> {
  const { SITE_PASSWORD, AUTH_SECRET } = process.env;
  if (!SITE_PASSWORD || !AUTH_SECRET) return false;
  const key = await hmacKey(AUTH_SECRET);
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(`pw:${SITE_PASSWORD}`));
  return crypto.subtle.verify("HMAC", key, expected, encoder.encode(`pw:${input}`));
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), payload(expiresAt));
  return `${expiresAt}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || !process.env.SITE_PASSWORD) return false;
  const [expiresRaw, sigRaw] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !sigRaw) return false;
  const sig = fromBase64Url(sigRaw);
  if (!sig) return false;
  return crypto.subtle.verify("HMAC", await hmacKey(secret), sig, payload(expiresAt));
}

/** Only allow same-site relative redirects after login. */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
