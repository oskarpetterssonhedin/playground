/**
 * Runs every `*.test.ts` under app/ and lib/ with Node's built-in test runner
 * (through tsx, so TypeScript and path aliases work). `pnpm test`
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

function find(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : find(p);
    return e.name.endsWith(".test.ts") ? [p] : [];
  });
}

const files = ["app", "lib"].flatMap((d) => find(path.join(ROOT, d)));
if (!files.length) {
  console.log("No tests found.");
  process.exit(0);
}
const result = spawnSync("npx", ["tsx", "--test", "--test-reporter=dot", ...files], { cwd: ROOT, stdio: "inherit" });
process.exit(result.status ?? 1);
