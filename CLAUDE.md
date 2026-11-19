# Playground: Agent Instructions

This repo is a personal prototype playground: one Next.js app holding many small, self-contained prototypes (apps, games, simulations, tools). The owner asks you for new prototypes or changes, often from a phone. Read this whole file before you work. The rules are non-negotiable.

## Stack and layout

- Next.js 16 (App Router, TypeScript strict), Tailwind CSS v4, shadcn/ui (all components in `components/ui/`), `next-themes`, pnpm, Vercel.
- **Next 16 differs from what you remember.** Middleware is now `proxy.ts`, `params`/`searchParams` are Promises, and route types (`PageProps<"/route">`) come from `next typegen`. Read the guide in `node_modules/next/dist/docs/` before using an API you're unsure of.
- `cacheComponents` is **off** on purpose (see Lessons). Don't turn it on.

```
app/
├── prototypes/<slug>/       one folder per prototype (private, behind the gate)
│   ├── page.tsx
│   ├── metadata.json
│   └── HOW_IT_WORKS.md
├── prototypes/layout.tsx    header (back, title, theme) around every prototype
├── p/[slug]/                public route: renders prototypes with "public": true, 404 otherwise
├── login/, api/auth/        password gate
├── api/<slug>/              per-prototype API routes, as needed
├── page.tsx                 gallery
└── layout.tsx               root layout + ThemeProvider
components/ui/               shadcn/ui (vendored; read the source before assuming a prop exists)
components/controls/         shared control panel library
components/gallery/          gallery UI
lib/prototypes.ts            prototype discovery (wraps the generated registry)
lib/theme-colors.ts          read theme tokens as colors for canvas/WebGL
lib/auth.ts, proxy.ts        password gate
public/thumbnails/           <slug>-light.webp, <slug>-dark.webp, <slug>-og.jpg
public/assets/<slug>/        static files a prototype needs (NOT behind the gate)
scripts/generate-registry.ts validates every prototype, writes lib/*.generated.ts
scripts/thumbnails.ts        captures thumbnails with Playwright
```

**Discovery is automatic.** `scripts/generate-registry.ts` scans `app/prototypes/*`, validates each `metadata.json` against `lib/prototype-schema.ts`, and fails the build if a folder is missing `page.tsx`, `metadata.json` or `HOW_IT_WORKS.md`. It runs before `dev`, `build`, `lint`, `typecheck` and after install. The generated files are gitignored. If a running dev server doesn't see a new prototype, run `pnpm registry` or restart it.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server, no password gate |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Registry + route types + `tsc --noEmit` |
| `pnpm build` | Production build |
| `pnpm test` | Runs every `*.test.ts` under `app/` and `lib/` (Node test runner via tsx) |
| `pnpm check` | lint + typecheck + test + build |
| `pnpm thumbnails --slug <a,b>` | Build, then capture those prototypes |
| `pnpm thumbnails --missing` | Only prototypes without thumbnails |
| `pnpm thumbnails` | All prototypes |
| `pnpm thumbnails --no-build --slug <a>` | Reuse the current `.next` build |

---

## Workflow

### Creating a new prototype

1. Create a branch named `proto/<slug>` (`<slug>` is kebab-case). If your session dictates a different branch name, use that one.
2. Create `app/prototypes/<slug>/` with `page.tsx`, `metadata.json`, `HOW_IT_WORKS.md`. Use today's date for `createdAt` and the current ISO timestamp for `updatedAt`. `hidden` and `public` start `false`.
3. Build it following every rule below.
4. Run `pnpm lint`, `pnpm typecheck`, `pnpm build`. Fix everything, including warnings you introduced.
5. Run `pnpm thumbnails --slug <slug>`, then **open both images** (`public/thumbnails/<slug>-light.webp`, `<slug>-dark.webp`) and look at them. Recapture if they're blank, stale, mid-animation garbage or wrong-themed.
6. Commit (code and thumbnails together), push, open a pull request.
7. End by posting the Vercel preview link so the owner can open it on their phone. The preview URL is on the PR (Vercel bot comment or deployment status). The prototype lives at `<preview-url>/prototypes/<slug>`.

### Editing a prototype

Same flow: branch → change → bump `updatedAt` in `metadata.json` → update `HOW_IT_WORKS.md` → `pnpm lint && pnpm typecheck && pnpm build` → if anything visual changed, `pnpm thumbnails --slug <slug>` and look at the images → commit, push, PR → post the preview link.

### Never

- Never add a "new prototype" button, form or create API to the app. Prototypes are created by agents only.
- Never set `"public": true` unless the owner explicitly asks for **that specific** prototype to be public.
- Never import from another prototype's folder.
- Never weaken the password gate, log `SITE_PASSWORD`/`AUTH_SECRET`, or set `THUMBNAIL_CAPTURE` anywhere but the thumbnail script.

---

## Rules for every prototype

### Metadata

Every prototype has `metadata.json` (validated at build; unknown keys fail):

```json
{
  "title": "My Prototype",
  "description": "What it does, one sentence",
  "tags": ["tag1"],
  "createdAt": "YYYY-MM-DD",
  "updatedAt": "2026-01-31T14:05:00.000Z",
  "hidden": false,
  "public": false
}
```

Bump `updatedAt` on **every** edit. The gallery sorts by it.

### Documentation

Every prototype has `HOW_IT_WORKS.md`, kept current on every change, with these sections:

- **What It Does**: 1–2 sentences
- **Architecture**: ASCII data-flow diagram
- **Frontend / API**: state, shortcuts, responsive behavior, request/response shapes
- **AI Usage** (only if a model is called): model ID, why that model, how it's called, key parameters, system prompt summary, user prompt shape
- **Key Dependencies**, **Component Tree**, **Error Handling**, **File Structure**

Skip sections that don't apply. Never write "N/A". See `app/prototypes/flow-field/HOW_IT_WORKS.md` for the reference.

### Self-contained and decomposed

- Each prototype lives entirely in its own folder. No imports from other prototypes.
- Shared code goes in `components/` or `lib/` only once at least two prototypes need it.
- Keep `page.tsx` thin, around 60 lines. Split out:
  - `types.ts`: shared types
  - `data.ts`: mock data, constants, config, control schema
  - pure logic files (`physics.ts`, `search.ts`): no React, testable alone
  - one file per meaningful UI component, named descriptively (`particle-canvas.tsx`, not `Component2.tsx`)
- Don't split a tiny prototype into files for the sake of it. Split when a file mixes concerns.
- Pages that use hooks or browser APIs start with `"use client"`.

### Design system

- Use shared components (`components/ui/*`) and tokens only: `bg-background`, `text-foreground`, `bg-card`, `bg-muted`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `border-border`, `bg-chart-1`…`bg-chart-5`, `text-destructive`.
- Never hardcode colors: no `bg-black`, `text-white`, `bg-blue-500`, hex/rgb values, or inline color styles.
- Canvas and WebGL read colors from CSS variables at runtime with `useThemeColors([...tokens])` / `readThemeColor(token)` from `lib/theme-colors.ts`. They re-read automatically when the theme changes.
- Read the component source in `components/ui/` before assuming a prop or variant exists.
- Icons: `lucide-react`.

### Clean and minimal by default

- Start with a single centered column: `<div className="mx-auto w-full max-w-2xl px-4 py-6">`. No sidebars, split panels or tab-heavy layouts unless asked. Full-bleed canvas prototypes are the exception: fill the space with `relative flex-1` + an `absolute inset-0` child.
- Build only what was asked for. No extra dashboards, charts, stats or views.
- Every element must justify its existence. Plain badges (`variant="secondary"` / `"outline"`) over colorful ones. No decorative icons.
- Minimal interface copy. Cut captions that restate labels. No marketing headers.
- The prototype header (back button, title, theme toggle) comes from the layout. Don't add your own page title or theme toggle.

### Control panels

Any tunable parameter (speed, color, size, count, mode) goes in the shared control panel. No scattered inputs. Reset and Randomize come with it.

```tsx
// data.ts
import { defineControls } from "@/components/controls";
export const SLUG = "my-slug";
export const controlSchema = defineControls({
  speed: { type: "slider", label: "Speed", min: 0, max: 5, step: 0.1, default: 1 },
  count: { type: "number", label: "Count", min: 1, max: 500, default: 50 },
  mode:  { type: "select", label: "Mode", options: ["calm", "wild"], default: "calm" },
  color: { type: "color", label: "Color", default: "chart-1" },        // theme token
  grid:  { type: "toggle", label: "Grid", default: true, randomize: false },
});

// page.tsx
"use client";
import { ControlsLayout, useControls } from "@/components/controls";
export default function Page() {
  const controls = useControls(SLUG, controlSchema); // controls.values.speed: number
  return (
    <ControlsLayout controls={controls}>
      <Subject {...controls.values} />
    </ControlsLayout>
  );
}
```

- Types: `slider`, `number`, `toggle`, `select` (strings or `{ value, label }`), `color` (theme token names; optional `palette` subset).
- `randomize: false` keeps a control fixed when Randomize is pressed.
- Values persist in `localStorage` as `<slug>:controls` and are validated against the schema on load.
- Desktop (md+): panel on the right, never over the subject. Mobile: floating button opens a bottom sheet.
- For a color value in CSS, map the token to a static class (`bg-chart-1`); in canvas, use `useThemeColors`.

### Mobile first

- Everything works at 375px wide. No horizontal page scroll.
- Tap targets at least 44×44px (`size-11`, `h-11`, `min-h-11`).
- Icon-only buttons on mobile, labels from `sm:` up: `<Icon /><span className="hidden sm:inline">Label</span>`, with `aria-label` on the button.
- No hover-only interactions. Anything revealed on hover must also work on tap.
- Code blocks wrap (`whitespace-pre-wrap break-words`). No horizontal scrolling.
- Modals and carousels have visible prev/next buttons or swipe on mobile, not only keyboard shortcuts.
- Use `dvh`, not `vh`, for full-height layouts. Respect `env(safe-area-inset-bottom)` for bottom-fixed UI.

### Light and dark mode

- Design dark-first; light mode must work via tokens. Check both.
- Never hardcode a `dark` class on a page. The theme is global (`next-themes`, dark by default, System option in the toggle).
- Use `useTheme()` / `resolvedTheme` only when behavior must change by theme. For canvas colors, prefer `useThemeColors`.

### Motion

- Rows or sections the user adds or removes animate their height. Nothing pops in and makes the page jump (animate `grid-template-rows: 0fr → 1fr`, or measure height).
- Smooth deceleration (`ease-out`, or `ease-[var(--ease-out-smooth)]`), 150–300ms. No bouncy overshoot or spring wobble.
- Respect `prefers-reduced-motion`. CSS transitions/animations are neutralized globally in `globals.css`; JS animation loops (requestAnimationFrame) must check `matchMedia("(prefers-reduced-motion: reduce)")` themselves and show a still state.
- Verify animations actually run by checking computed styles (e.g. `getComputedStyle(el).animationName !== "none"`) in Playwright. Utility classes like `animate-in` silently do nothing if their CSS isn't loaded (`tw-animate-css` is imported in `globals.css`).

### AI-backed prototypes

- Call models server-side from `app/api/<slug>/route.ts`. Never expose keys to the client; never prefix them `NEXT_PUBLIC_`.
- Keys live in env vars and are listed in `.env.example`. Tell the owner which env var to add in Vercel.
- If a model generates UI or layout, put explicit layout constraints in the system prompt (max columns, no wide tables, max widths). Defensive CSS is a backup, not the fix.
- Parse JSON from model output defensively: extract the first `{...}` block, `JSON.parse` in try/catch, validate the shape with zod.
- Wrap API routes in try/catch and return proper status codes (400 bad input, 502 upstream model error, 500 unexpected) with a JSON `{ error }` body.
- Use the current model IDs from the Anthropic docs; document the choice in `HOW_IT_WORKS.md` → AI Usage.
- API routes under `/api/<slug>/` are behind the password gate, unless the prototype is public, in which case they are open (the public page needs them). Rate-limit or otherwise protect expensive public endpoints.

### Static assets and tests

- Static files a prototype needs (images, SVGs, audio) go in `public/assets/<slug>/`. That path skips the password gate so public prototypes work; never put anything private there.
- Pure logic with tricky rules gets a `<name>.test.ts` next to it using `node:test` and `node:assert/strict`. `pnpm test` picks it up.

### Storage

- Wrap all `localStorage` access in try/catch (private mode and quota errors throw).
- Load on mount (`useEffect`), never during server render.
- Namespace keys as `<slug>:<key>`.

### Thumbnails

- New prototype or visual change: regenerate that prototype's thumbnails in the same commit (`pnpm thumbnails --slug <slug>`).
- Global style change (tokens, `globals.css`, layout chrome, shared components): regenerate all (`pnpm thumbnails`).
- Open and look at the captured images before committing. A stale or broken thumbnail is worse than none.
- Capture hides everything marked `data-chrome` (header, control panel), at 1200×750, with default control values. If the prototype needs a moment to look right (canvas, data loading), make sure it settles within ~1.5s, or pre-simulate frames as `flow-field` does.
- The gallery shows static images only. Never embed live iframes.

### Public prototypes

- Only when the owner explicitly asks for that prototype: set `"public": true`, bump `updatedAt`, make sure `<slug>-og.jpg` exists (the thumbnail script creates it), build, PR.
- It becomes available at `/p/<slug>` without the gate, with og:title/description from metadata and the og:image from its dark thumbnail. Private or unknown slugs on `/p/` return 404.

---

## Lessons

One line per lesson. Add one whenever something breaks and gets fixed.

- Next 16 `cacheComponents` is disabled: it rejects `dynamicParams = false`, requires non-empty `generateStaticParams`, and fails prerender on `Math.random()`/`Date.now()`.
- `ui.shadcn.com` may be blocked in cloud sessions; `components/ui` was installed from the shadcn GitHub source (`apps/v4/registry/new-york-v4/ui`). Add missing components the same way if the CLI can't reach the registry.
- Functions passed to Playwright's `addInitScript`/`evaluate` from a tsx script get esbuild's `__name` helper injected and crash in the browser; pass a string instead.
- Canvas trails faded by painting a translucent background leave gray ghosts (8-bit rounding); fade with `globalCompositeOperation = "destination-out"` over a transparent canvas instead.
- shadcn `DrawerContent` sets `data-[vaul-drawer-direction=bottom]:max-h-[80vh]`; override with the same variant prefix, a plain `max-h-*` loses.
- Vercel env vars must be enabled for **Preview** too, not just Production, or preview deployments see them as unset; redeploy after changing them.
- Calling `SpeechRecognition.available()` on page load crashed headless Chromium's renderer ("Page crashed"); call it only after a user tap, with a timeout, and stub it in Playwright.
- A CSS animation with `fill-mode: both` keeps overriding `opacity` after it ends; remove the animation class before hiding an element with `opacity-0`.
