/**
 * Answer matching, ported as-is from the reference. Pure: no React, no DOM.
 * Verified against data/matching-cases.json by matching.test.ts.
 */
import type { Country, Verdict } from "./types";

const DIA: Record<string, string> = {
  ç: "c", é: "e", è: "e", ê: "e", á: "a", à: "a", â: "a", ã: "a",
  í: "i", ó: "o", ô: "o", õ: "o", ú: "u", ü: "u", ñ: "n",
};

/** Lowercase, strip accents and punctuation, "u s a" → "usa", padded with spaces. */
export function norm(s: string): string {
  return (
    " " +
    s
      .toLowerCase()
      .replace(/[çéèêáàâãíóôõúüñ]/g, (m) => DIA[m])
      .replace(/u\.?\s?s\.?\s?a\.?/g, "usa")
      .replace(/[-–.,!?;:"'()]/g, " ")
      .replace(/\s+/g, " ")
      .trim() +
    " "
  );
}

/** Rough Swedish sound key, so words that sound alike compare as alike. */
export function phon(w: string): string {
  let s = w.toLowerCase().replace(/[^a-zåäöéü]/g, "").replace(/é/g, "e").replace(/ü/g, "y");
  s = s.replace(/ph/g, "f").replace(/th/g, "t").replace(/q/g, "k").replace(/w/g, "v").replace(/z/g, "s").replace(/x/g, "ks");
  s = s.replace(/sch|skj|stj|sj|sh|ch/g, "S").replace(/sk(?=[eiyäö])/g, "S");
  s = s.replace(/tj|kj/g, "C").replace(/k(?=[eiyäö])/g, "C");
  s = s.replace(/dj|gj|hj|lj/g, "j").replace(/g(?=[eiyäö])/g, "j");
  s = s.replace(/c(?=[eiyäö])/g, "s").replace(/c/g, "k");
  s = s.replace(/ä/g, "e").replace(/å/g, "o");
  return s.replace(/(.)\1+/g, "$1");
}

/** Levenshtein distance. */
export function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const c = [i];
    for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[n];
}

/** Whole-word hit, or word start for words of 6+ letters. Longer hit wins. `t` must be norm()'d. */
export function exactScore(t: string, words: string[]): number {
  let s = 0;
  for (const w of words) {
    if (t.includes(" " + w + " ") || (w.length >= 6 && t.includes(" " + w))) s = Math.max(s, w.length);
  }
  return s;
}

function hasFuzzy(t: string, words: string[]): boolean {
  const tok = t.trim().split(" ").filter(Boolean);
  const cand = [...tok];
  for (let i = 0; i < tok.length - 1; i++) cand.push(tok[i] + tok[i + 1], tok[i] + " " + tok[i + 1]);
  return words.some((w) => w.length >= 4 && cand.some((c) => c.length >= 3 && lev(c, w) <= (w.length >= 7 ? 2 : 1)));
}

/** Sound keys for every run of 1–3 consecutive words. */
function spans(t: string): string[] {
  const tok = t.trim().split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i < tok.length; i++) {
    let a = "";
    for (let j = i; j < Math.min(tok.length, i + 3); j++) {
      a += tok[j];
      out.add(phon(a));
    }
  }
  return [...out].filter(Boolean);
}

/** 0 = same, 1 = nothing alike. A clear start of the word (≥3 chars, ≥ half) counts as ≤ 0.25. */
export function phonDist(texts: string[], f: Country): number {
  const sp = [...new Set(texts.flatMap(spans))];
  let best = 9;
  for (const w of f.ph) {
    for (const c of sp) {
      let d = lev(c, w) / w.length;
      if (c.length >= 3 && w.startsWith(c) && c.length >= w.length * 0.5) d = Math.min(d, 0.25);
      if (d < best) best = d;
    }
  }
  return best;
}

export const HINT_WORDS = ["ledtråd", "ledtrådar", "led tråd", "ledtrå", "lett råd", "let tråd", "hjälp", "hjälp mig", "tips", "vet inte", "jag vet inte"];
export const SKIP_WORDS = ["hoppa över", "nästa flagga", "nästa"];

export function isHint(t: string): boolean {
  return exactScore(t, HINT_WORDS) > 0 || hasFuzzy(t, ["ledtråd", "ledtrådar"]);
}

/** Start of a name up to and including its first vowel group (+1 consonant). */
export function syllable(name: string): string {
  const v = "aeiouyåäöéAEIOUYÅÄÖÉ";
  let i = 0;
  while (i < name.length && !v.includes(name[i])) i++;
  while (i < name.length && v.includes(name[i])) i++;
  if (i < name.length && !/[\s-]/.test(name[i])) i++;
  return name.slice(0, Math.max(i, 2));
}

export function bestMatch(all: Country[], texts: string[], cur: Country | null): Country | null {
  let best: Country | null = null;
  let bs = 0;
  for (const f of all) {
    const s = Math.max(0, ...texts.map((t) => exactScore(t, f.words)));
    if (s > bs || (s > 0 && s === bs && f === cur)) {
      best = f;
      bs = s;
    }
  }
  return best;
}

export function soundMatch(all: Country[], texts: string[], cur: Country | null): Country | null {
  let best: Country | null = null;
  let bd = 0.3;
  for (const f of all) {
    const d = phonDist(texts, f);
    if (d < bd || (d === bd && f === cur)) {
      best = f;
      bd = d;
    }
  }
  return best;
}

function wrongVerdict(other: Country, cur: Country): Verdict {
  const partOf = other.p === cur.c ? cur.c : cur.p === other.c ? other.c : null;
  return { result: "wrong", heard: other.c, partOf };
}

export type JudgeInput = {
  /** Every country (matching considers all of them, not just the level). */
  all: Country[];
  cur: Country;
  /** Final transcripts (raw). */
  fin: string[];
  /** Interim transcripts (raw). */
  mid: string[];
  /** False while inside the 2.5 s window after the last wrong answer. */
  canWrong: boolean;
};

/** Free answer (no choices shown). Order follows brief §4. */
export function judgeFree({ all, cur, fin, mid, canWrong }: JudgeInput): Verdict {
  const F = fin.map(norm);
  const M = mid.map(norm);
  const texts = [...F, ...M];
  const b = bestMatch(all, texts, cur);
  if (b === cur) return { result: "right" };
  if (!b && texts.some(isHint)) return { result: "hint" };
  if (!b && phonDist(texts, cur) <= 0.34) return { result: "right" };
  if (!F.length) return { result: "none" };
  if (F.some((t) => exactScore(t, SKIP_WORDS))) return { result: "skip" };
  if (!canWrong) return { result: "none" };
  if (b) return wrongVerdict(b, cur);
  const words = F[0].trim().split(" ").filter(Boolean).length;
  if (words > 4 || F[0].replace(/[^a-zåäö]/g, "").length < 2) return { result: "none" };
  if (soundMatch(all, F, cur) === cur) return { result: "right" };
  return { result: "notUnderstood" };
}

/** Answer while three choices are shown. */
export function judgeChoices({ cur, fin, mid, canWrong, choices }: JudgeInput & { choices: Country[] }): Verdict {
  const F = fin.map(norm);
  const M = mid.map(norm);
  const texts = [...F, ...M];
  for (const f of choices) {
    if (texts.some((t) => exactScore(t, f.words))) {
      if (f === cur) return { result: "right" };
      return F.length && canWrong ? wrongVerdict(f, cur) : { result: "none" };
    }
  }
  if (texts.some(isHint)) return { result: "hint" };
  let best: Country | null = null;
  let bd = 9;
  for (const f of choices) {
    const d = phonDist(texts, f);
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  if (best === cur && bd <= 0.55) return { result: "right" };
  if (!F.length) return { result: "none" };
  if (best && bd <= 0.3) return canWrong ? wrongVerdict(best, cur) : { result: "none" };
  if (F[0].trim().split(" ").filter(Boolean).length > 4) return { result: "none" };
  if (!canWrong) return { result: "none" };
  return { result: "notUnderstood" };
}
