/**
 * Capture light + dark thumbnails for prototypes.
 *
 *   pnpm thumbnails                  all prototypes
 *   pnpm thumbnails --slug a,b       only these
 *   pnpm thumbnails --missing        only those without both thumbnails
 *   pnpm thumbnails --no-build       reuse the existing .next build
 *
 * Builds for production, starts `next start` with THUMBNAIL_CAPTURE=1 (bypasses
 * the password gate locally; ignored on Vercel), opens each prototype in
 * Playwright at 1200×750 and writes:
 *
 *   public/thumbnails/<slug>-light.webp
 *   public/thumbnails/<slug>-dark.webp
 *   public/thumbnails/<slug>-og.jpg     (1200×630 crop of dark, for og:image)
 *
 * App chrome (header, control panel) is hidden via html[data-capture].
 */
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import { chromium, type Browser } from "playwright";
import sharp from "sharp";

const ROOT = path.resolve(__dirname, "..");
const PROTOTYPES_DIR = path.join(ROOT, "app", "prototypes");
const OUT_DIR = path.join(ROOT, "public", "thumbnails");
const VIEWPORT = { width: 1200, height: 750 };
const SETTLE_MS = 1500;
const THEMES = ["light", "dark"] as const;

function parseArgs(argv: string[]) {
  const args = { slugs: null as string[] | null, missing: false, build: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--missing") args.missing = true;
    else if (arg === "--no-build") args.build = false;
    else if (arg === "--slug" || arg === "--slugs") {
      args.slugs = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith("--slug=")) {
      args.slugs = arg.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

function allSlugs(): string[] {
  return readdirSync(PROTOTYPES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

function hasThumbnails(slug: string) {
  return THEMES.every((t) => existsSync(path.join(OUT_DIR, `${slug}-${t}.webp`)));
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function capture(browser: Browser, baseUrl: string, slug: string) {
  for (const theme of THEMES) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: theme,
      reducedMotion: "no-preference",
    });
    // A string, not a function: tsx/esbuild would inject helpers (`__name`)
    // that don't exist in the browser.
    await context.addInitScript(`
      try { localStorage.setItem("playground:theme", ${JSON.stringify(theme)}); } catch {}
      const mark = () => document.documentElement && document.documentElement.setAttribute("data-capture", "");
      mark();
      document.addEventListener("DOMContentLoaded", mark);
    `);

    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    const response = await page.goto(`${baseUrl}/prototypes/${slug}`, { waitUntil: "networkidle" });
    if (!response || response.status() !== 200) {
      throw new Error(`${slug}: /prototypes/${slug} returned ${response?.status() ?? "no response"}`);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(SETTLE_MS);

    const png = await page.screenshot({ type: "png" });
    await sharp(png).webp({ quality: 80 }).toFile(path.join(OUT_DIR, `${slug}-${theme}.webp`));
    if (theme === "dark") {
      await sharp(png)
        .resize(1200, 630, { fit: "cover", position: "centre" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(OUT_DIR, `${slug}-og.jpg`));
    }
    // Remove a stale PNG variant so the registry picks the fresh WebP.
    rmSync(path.join(OUT_DIR, `${slug}-${theme}.png`), { force: true });

    if (errors.length) console.warn(`  ⚠ ${slug} (${theme}) logged errors:\n    ${errors.join("\n    ")}`);
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const known = allSlugs();

  let slugs = args.slugs ?? known;
  const unknown = slugs.filter((s) => !known.includes(s));
  if (unknown.length) {
    console.error(`Unknown prototype(s): ${unknown.join(", ")}`);
    process.exit(1);
  }
  if (args.missing) slugs = slugs.filter((s) => !hasThumbnails(s));
  if (!slugs.length) {
    console.log("Nothing to capture.");
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  if (args.build) {
    console.log("Building for production…");
    execSync("pnpm build", { cwd: ROOT, stdio: "inherit" });
  }

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let server: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    server = spawn(path.join(ROOT, "node_modules", ".bin", "next"), ["start", "-p", String(port), "-H", "127.0.0.1"], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: "production", THUMBNAIL_CAPTURE: "1" },
      stdio: ["ignore", "ignore", "inherit"],
      detached: true,
    });
    await waitForServer(baseUrl);

    browser = await chromium.launch();
    for (const slug of slugs) {
      process.stdout.write(`Capturing ${slug}… `);
      await capture(browser, baseUrl, slug);
      console.log("done");
    }
  } finally {
    await browser?.close();
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {}
    }
  }

  // Refresh registry so thumbnail URLs and cache-busting hashes are current.
  execSync("pnpm registry", { cwd: ROOT, stdio: "inherit" });
  console.log(`\n✓ Captured ${slugs.length} prototype(s). Open the files in public/thumbnails/ and check them.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
