/**
 * Prototype discovery. The source of truth is the folder structure under
 * app/prototypes/<slug>/ — scripts/generate-registry.ts scans it (validating
 * every metadata.json) and writes lib/registry.generated.ts, which this module
 * wraps. The registry regenerates automatically on dev, build, typecheck and
 * install; run `pnpm registry` manually if a running dev server looks stale.
 */
import { prototypes, publicSlugs } from "./registry.generated";
import type { Prototype } from "./prototype-schema";

export type { Prototype, PrototypeMetadata } from "./prototype-schema";

/** All prototypes, newest `updatedAt` first. Includes hidden ones. */
export function getPrototypes(): Prototype[] {
  return prototypes;
}

export function getPrototype(slug: string): Prototype | undefined {
  return prototypes.find((p) => p.slug === slug);
}

/** A prototype that is flagged `"public": true`, or undefined. */
export function getPublicPrototype(slug: string): Prototype | undefined {
  return publicSlugs.includes(slug) ? getPrototype(slug) : undefined;
}

export function getPublicSlugs(): string[] {
  return publicSlugs;
}
