/** Settings in localStorage under `flaggspel:*`. Every access is wrapped; read on mount only. */
import { SETTINGS_DEFAULTS } from "./data";
import type { LevelId, Settings } from "./types";

const KEY = (k: string) => `flaggspel:${k}`;

function read(k: string): string | null {
  try {
    return window.localStorage.getItem(KEY(k));
  } catch {
    return null;
  }
}

export function saveSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  try {
    window.localStorage.setItem(KEY(k), String(v));
  } catch {
    // Private mode or quota: settings simply don't persist.
  }
}

export function loadSettings(): Settings {
  const level = Number(read("level"));
  const rate = Number(read("rate"));
  return {
    level: ([0, 1, 2, 3].includes(level) && read("level") !== null ? level : SETTINGS_DEFAULTS.level) as LevelId,
    voice: read("voice") ?? SETTINGS_DEFAULTS.voice,
    rate: rate >= 0.7 && rate <= 1.1 ? rate : SETTINGS_DEFAULTS.rate,
    alwaysChoices: read("alwaysChoices") === "true",
  };
}
