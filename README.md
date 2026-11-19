# Playground

A personal collection of small, self-contained prototypes in one Next.js app. New prototypes are built by a coding agent following [`CLAUDE.md`](./CLAUDE.md).

- `/`: gallery (search, tag filter, hidden toggle, static light/dark thumbnails)
- `/prototypes/<slug>`: each prototype (password-protected)
- `/p/<slug>`: public view, only for prototypes with `"public": true`

## Owner setup

### 1. Connect Vercel

1. Go to [vercel.com/new](https://vercel.com/new), import this GitHub repository.
2. Framework preset: **Next.js** (auto-detected). Leave build and install commands at their defaults. Vercel detects pnpm from `pnpm-lock.yaml`.
3. Deploy. Every pull request then gets its own preview deployment, and the Vercel bot comments the preview URL on the PR.

### 2. Set environment variables

In Vercel → Project → Settings → Environment Variables, add these for **Production** and **Preview**:

| Variable | Value |
|---|---|
| `SITE_PASSWORD` | The password you'll type on `/login` |
| `AUTH_SECRET` | A long random string: `openssl rand -base64 32` |

Redeploy after adding them. Changing either one signs out every session.

Add model keys (e.g. `ANTHROPIC_API_KEY`) only when a prototype needs one. Its PR will say so. Never set `THUMBNAIL_CAPTURE` in Vercel; it's a local-only flag for the thumbnail script and is ignored on Vercel anyway.

### 3. Optional: Vercel Deployment Protection

Vercel's own Deployment Protection (Vercel Authentication) also applies to preview URLs by default, which means you need to be signed in to Vercel to open them on your phone. Either stay signed in to Vercel on your phone, or turn it off for previews (Settings → Deployment Protection) and rely on the site password.

## Local development

```bash
pnpm install
pnpm dev            # http://localhost:3000, no password gate in dev
pnpm check          # lint + typecheck + production build
pnpm thumbnails     # capture thumbnails (all | --slug a,b | --missing)
```

To try the password gate locally: copy `.env.example` to `.env.local`, fill in both values, then `pnpm build && pnpm start`.

## How it fits together

- Prototypes live in `app/prototypes/<slug>/` with `page.tsx`, `metadata.json` and `HOW_IT_WORKS.md`. They're discovered automatically: `scripts/generate-registry.ts` validates them and writes a gitignored registry before every dev, build and typecheck run.
- `proxy.ts` gates everything in production except `/login`, `/p/*`, public prototypes' API routes and og images.
- `components/controls/` is the shared control panel: a typed schema with persisted values, Reset and Randomize, a side panel on desktop and a bottom sheet on mobile.
- `scripts/thumbnails.ts` builds the app, opens each prototype in Playwright at 1200×750 in light and dark, and writes WebP thumbnails plus a JPEG og image.
