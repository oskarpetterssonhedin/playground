/** Pure game logic: deck, answer choices, hint steps, lines. No React, no DOM. */
import type { Country } from "./types";

export function shuffle<T>(items: readonly T[], rand = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T,>(items: readonly T[], rand = Math.random): T => items[Math.floor(rand() * items.length)];

/** Shuffled deck for a level. The very first easy deck starts with Sweden. */
export function buildDeck(levelPool: Country[], startWithSweden: boolean): Country[] {
  const d = shuffle(levelPool);
  if (startWithSweden) {
    const i = d.findIndex((f) => f.c === "se");
    if (i > 0) d.unshift(d.splice(i, 1)[0]);
  }
  return d;
}

/**
 * The right answer plus two others from the level: all three start with
 * different letters, no parent/child pairs, order shuffled.
 */
export function pickChoices(cur: Country, levelPool: Country[]): Country[] {
  const opts = shuffle(
    levelPool.filter((f) => f !== cur && f.p !== cur.c && cur.p !== f.c && f.n[0] !== cur.n[0]),
  );
  const out: Country[] = [];
  for (const f of opts) {
    if (out.every((o) => o.n[0] !== f.n[0] && o.p !== f.c && f.p !== o.c)) out.push(f);
    if (out.length === 2) break;
  }
  return shuffle([cur, ...out]);
}

/** "A, B eller C" */
export function listText(choices: Country[]): string {
  return choices.slice(0, -1).map((f) => f.n).join(", ") + " eller " + choices[choices.length - 1].n;
}

export type HintStep = "continent" | "letter" | "choices" | "fact" | "syllable" | "answer";

/** Which hint to give at `level` (0-based). Skips "choices" when they're already shown. */
export function hintStep(cur: Country, level: number, choicesShown: boolean): HintStep {
  const steps: HintStep[] = ["continent", "letter"];
  if (!choicesShown) steps.push("choices");
  steps.push(cur.f ? "fact" : "syllable", "answer");
  return steps[Math.min(level, steps.length - 1)];
}

/** What the voice says for a wrong answer (brief §2). */
export function wrongLine(other: Country | null, cur: Country, tryLines: readonly string[]): string {
  if (other && other.p === cur.c) return `Nästan! ${other.n} är en del av ${cur.n}. Vad heter hela landet?`;
  if (other && cur.p === other.c) return `Nästan! Den här flaggan hör ihop med ${other.n}, men den har ett eget namn.`;
  if (other) return `Nej, det är inte ${other.n}. Försök igen!`;
  return pick(tryLines);
}

export function doneTitle(score: number): string {
  return (score >= 7 ? "Wow" : "Bra rest") + ", Ted och Adam!";
}

export function countText(n: number): string {
  return `${n} ${n === 1 ? "land" : "länder"}`;
}
